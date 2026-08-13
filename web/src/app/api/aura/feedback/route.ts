import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const FeedbackSchema = z.object({
  eventId: z.string().uuid(),
  feedback: z.enum(["confirmed", "rejected", "edited"]),
  editedTitle: z.string().min(1).max(240).optional(),
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
  const parsed = FeedbackSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const { data: event } = await supabase
    .from("aura_stream_events")
    .select("id, payload, related_task_id, title")
    .eq("id", parsed.data.eventId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!event) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await supabase
    .from("aura_stream_events")
    .update({ feedback: parsed.data.feedback })
    .eq("id", event.id)
    .eq("user_id", user.id);

  if (parsed.data.feedback === "rejected") {
    const payload = (event.payload ?? {}) as {
      intent?: {
        kind?: string;
        title?: string;
        notes?: string;
        priority?: number;
      };
    };
    const intent = payload.intent;
    const inputSnippet =
      typeof intent?.notes === "string" && intent.notes
        ? intent.notes
        : event.title;

    const negative_constraints = [
      {
        type: "DO_NOT_ASSERT",
        value: (intent?.title ?? event.title).slice(0, 120),
        action_type: intent?.kind ?? "task",
      },
      {
        type: "DO_NOT_ROUTE",
        value: String(inputSnippet).trim().slice(0, 80).toLowerCase(),
        action_type: intent?.kind ?? "task",
      },
    ];

    await supabase.from("aura_corrections").insert({
      user_id: user.id,
      input_snippet: String(inputSnippet).slice(0, 500),
      rejected_output: intent ?? { title: event.title },
      action_type: intent?.kind ?? "task",
      status: "rejected_unspecified",
      negative_constraints,
      open_question: "what_was_off",
    });

    if (event.related_task_id) {
      await supabase
        .from("aura_tasks")
        .update({ status: "cancelled" })
        .eq("id", event.related_task_id)
        .eq("user_id", user.id);
    }

    return NextResponse.json({
      ok: true,
      note: "Noted — I won’t assume that again.",
    });
  }

  if (parsed.data.feedback === "edited" && parsed.data.editedTitle) {
    const payload = (event.payload ?? {}) as { intent?: { title?: string; kind?: string; notes?: string } };
    await supabase.from("aura_corrections").insert({
      user_id: user.id,
      input_snippet: payload.intent?.notes ?? event.title,
      rejected_output: payload.intent ?? { title: event.title },
      action_type: payload.intent?.kind ?? "task",
      status: "corrected",
      before_after: {
        before: payload.intent?.title ?? event.title,
        after: parsed.data.editedTitle,
      },
      negative_constraints: [
        {
          type: "DO_NOT_ASSERT",
          value: (payload.intent?.title ?? event.title).slice(0, 120),
          action_type: payload.intent?.kind ?? "task",
        },
      ],
    });

    if (event.related_task_id) {
      await supabase
        .from("aura_tasks")
        .update({ title: parsed.data.editedTitle })
        .eq("id", event.related_task_id)
        .eq("user_id", user.id);
    }

    await supabase
      .from("aura_stream_events")
      .update({ title: parsed.data.editedTitle })
      .eq("id", event.id)
      .eq("user_id", user.id);

    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: true });
}
