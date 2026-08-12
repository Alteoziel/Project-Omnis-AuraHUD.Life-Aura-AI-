import { NextResponse } from "next/server";
import { z } from "zod";
import { constraintsFromRejection, countWords } from "@/lib/aura/intent-router";
import { routeWithCorrections } from "@/lib/aura/corrections";
import { createClient } from "@/lib/supabase/server";

const BodySchema = z.object({
  text: z.string().min(1).max(500),
});

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = BodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const { data: privacy } = await supabase
    .from("aura_privacy_settings")
    .select("cloud_ai_enabled")
    .eq("user_id", user.id)
    .maybeSingle();

  // Ensure privacy row exists with Cloud AI OFF by default.
  if (!privacy) {
    await supabase.from("aura_privacy_settings").upsert({
      user_id: user.id,
      cloud_ai_enabled: false,
    });
  }

  const cloudAi = privacy?.cloud_ai_enabled === true;
  // Cloud AI path intentionally not wired yet — even if toggled on, we stay
  // on local rules until a ZDR provider + redaction pack ships.
  void cloudAi;

  const { data: correctionRows } = await supabase
    .from("aura_corrections")
    .select("negative_constraints")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  const intent = routeWithCorrections(parsed.data.text, correctionRows ?? []);
  const words = countWords(parsed.data.text);

  await supabase.from("aura_ai_receipts").insert({
    user_id: user.id,
    purpose: "intent_route",
    word_count: words,
    provider: "local_rules",
  });

  let taskId: string | null = null;
  if (intent.kind === "task" || intent.kind === "reminder") {
    const sortScore =
      (6 - intent.priority) * 100 +
      (intent.due_on ? 50 : 0) +
      intent.confidence * 10;
    const { data: task } = await supabase
      .from("aura_tasks")
      .insert({
        user_id: user.id,
        title: intent.title,
        notes: intent.notes,
        due_on: intent.due_on ?? null,
        priority: intent.priority,
        source: "text",
        sort_score: sortScore,
      })
      .select("id")
      .maybeSingle();
    taskId = task?.id ?? null;
  }

  const { data: event } = await supabase
    .from("aura_stream_events")
    .insert({
      user_id: user.id,
      kind: "captured",
      title:
        intent.kind === "budget_note"
          ? `Budget note: ${intent.title}`
          : intent.kind === "unclear"
            ? "Needs a quick clarify"
            : intent.title,
      body:
        intent.kind === "budget_note" && intent.amount_cents != null
          ? `About $${(intent.amount_cents / 100).toFixed(2)} — open Budget to log it.`
          : intent.kind === "unclear"
            ? "I won’t guess. Tap edit or try again."
            : `Captured as ${intent.kind}`,
      payload: { intent, cloud_ai_used: false },
      related_task_id: taskId,
    })
    .select("id")
    .maybeSingle();

  return NextResponse.json({
    intent,
    taskId,
    eventId: event?.id ?? null,
    receipt: {
      purpose: "intent_route",
      word_count: words,
      provider: "local_rules",
      message: `Processed ${words} words with local rules (nothing sent to a cloud AI).`,
    },
    // Exported for clients that need to build a rejection payload.
    rejectionTemplate: constraintsFromRejection(parsed.data.text, intent),
  });
}
