import { CommandBar } from "@/components/aura/CommandBar";
import { SpendLessNudge } from "@/components/aura/SpendLessNudge";
import { TodayStream } from "@/components/aura/TodayStream";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function HudPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  // Ensure privacy defaults exist (Cloud AI off).
  await supabase.from("aura_privacy_settings").upsert({
    user_id: user.id,
    cloud_ai_enabled: false,
  });

  const [{ data: events }, { data: tasks }] = await Promise.all([
    supabase
      .from("aura_stream_events")
      .select("id, kind, title, body, feedback, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("aura_tasks")
      .select("id, title, due_on, priority, status")
      .eq("user_id", user.id)
      .eq("status", "open")
      .order("sort_score", { ascending: false })
      .limit(10),
  ]);

  return (
    <div className="space-y-6 pb-4">
      <CommandBar />
      <SpendLessNudge />
      <TodayStream events={events ?? []} tasks={tasks ?? []} />
    </div>
  );
}
