import { constraintsFromRejection, countWords } from "@/lib/aura/intent-router";
import { routeWithCorrections } from "@/lib/aura/corrections";

export const AURA_STREAM_CHANGED = "aura:stream-changed";

export function notifyAuraStreamChanged(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(AURA_STREAM_CHANGED));
  }
}

export async function captureAuraIntent(input: {
  // Browser and server Supabase clients both expose .from().
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: { from: (table: string) => any };
  userId: string;
  text: string;
}): Promise<{
  receipt: {
    message: string;
    word_count: number;
    provider: string;
    purpose: string;
  };
}> {
  const text = input.text.trim();
  if (!text) throw new Error("Type something to capture.");

  const { data: privacy } = await input.supabase
    .from("aura_privacy_settings")
    .select("cloud_ai_enabled")
    .eq("user_id", input.userId)
    .maybeSingle();

  if (!privacy) {
    await input.supabase.from("aura_privacy_settings").upsert({
      user_id: input.userId,
      cloud_ai_enabled: false,
    });
  }

  const { data: correctionRows } = await input.supabase
    .from("aura_corrections")
    .select("negative_constraints")
    .eq("user_id", input.userId)
    .order("created_at", { ascending: false })
    .limit(50);

  const intent = routeWithCorrections(text, correctionRows ?? []);
  const words = countWords(text);

  await input.supabase.from("aura_ai_receipts").insert({
    user_id: input.userId,
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
    const { data: task } = await input.supabase
      .from("aura_tasks")
      .insert({
        user_id: input.userId,
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

  await input.supabase.from("aura_stream_events").insert({
    user_id: input.userId,
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
  });

  void constraintsFromRejection(text, intent);

  return {
    receipt: {
      purpose: "intent_route",
      word_count: words,
      provider: "local_rules",
      message: `Processed ${words} words with local rules (nothing sent to a cloud AI).`,
    },
  };
}

export async function applyAuraFeedback(input: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: { from: (table: string) => any };
  userId: string;
  eventId: string;
  feedback: "confirmed" | "rejected" | "edited";
  editedTitle?: string;
}): Promise<{ note?: string }> {
  const { data: event } = await input.supabase
    .from("aura_stream_events")
    .select("id, payload, related_task_id, title")
    .eq("id", input.eventId)
    .eq("user_id", input.userId)
    .maybeSingle();

  if (!event) throw new Error("Not found");

  await input.supabase
    .from("aura_stream_events")
    .update({ feedback: input.feedback })
    .eq("id", event.id)
    .eq("user_id", input.userId);

  if (input.feedback === "rejected") {
    const payload = (event.payload ?? {}) as {
      intent?: { kind?: string; title?: string; notes?: string };
    };
    const intent = payload.intent;
    const inputSnippet =
      typeof intent?.notes === "string" && intent.notes
        ? intent.notes
        : event.title;
    await input.supabase.from("aura_corrections").insert({
      user_id: input.userId,
      input_snippet: String(inputSnippet).slice(0, 500),
      rejected_output: intent ?? { title: event.title },
      action_type: intent?.kind ?? "task",
      status: "rejected_unspecified",
      negative_constraints: [
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
      ],
      open_question: "what_was_off",
    });
    if (event.related_task_id) {
      await input.supabase
        .from("aura_tasks")
        .update({ status: "cancelled" })
        .eq("id", event.related_task_id)
        .eq("user_id", input.userId);
    }
    return { note: "Noted — I won’t assume that again." };
  }

  if (input.feedback === "edited" && input.editedTitle) {
    const payload = (event.payload ?? {}) as {
      intent?: { title?: string; kind?: string; notes?: string };
    };
    await input.supabase.from("aura_corrections").insert({
      user_id: input.userId,
      input_snippet: payload.intent?.notes ?? event.title,
      rejected_output: payload.intent ?? { title: event.title },
      action_type: payload.intent?.kind ?? "task",
      status: "corrected",
      before_after: {
        before: payload.intent?.title ?? event.title,
        after: input.editedTitle,
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
      await input.supabase
        .from("aura_tasks")
        .update({ title: input.editedTitle })
        .eq("id", event.related_task_id)
        .eq("user_id", input.userId);
    }
    await input.supabase
      .from("aura_stream_events")
      .update({ title: input.editedTitle })
      .eq("id", event.id)
      .eq("user_id", input.userId);
  }

  return {};
}
