"use client";

import { CommandBar } from "@/components/aura/CommandBar";
import { SpendLessNudge } from "@/components/aura/SpendLessNudge";
import { TodayStream } from "@/components/aura/TodayStream";
import { AURA_STREAM_CHANGED } from "@/lib/aura/capture-flow";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";

type StreamEvent = {
  id: string;
  kind: string;
  title: string;
  body: string;
  feedback: string | null;
  created_at: string;
};

type StreamTask = {
  id: string;
  title: string;
  due_on: string | null;
  priority: number;
  status: string;
};

export default function HudPage() {
  const [events, setEvents] = useState<StreamEvent[]>([]);
  const [tasks, setTasks] = useState<StreamTask[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();
    async function load() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user || cancelled) return;
        await supabase.from("aura_privacy_settings").upsert({
          user_id: user.id,
          cloud_ai_enabled: false,
        });
        const [{ data: nextEvents }, { data: nextTasks }] = await Promise.all([
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
        if (cancelled) return;
        setEvents(
          ((nextEvents as Array<StreamEvent & { body: string | null }> | null) ?? []).map(
            (event) => ({
              ...event,
              body: event.body ?? "",
            }),
          ),
        );
        setTasks(
          (
            (nextTasks as Array<StreamTask & { priority: number | null }> | null) ??
            []
          ).map((task) => ({
            ...task,
            priority: task.priority ?? 3,
          })),
        );
      } catch {
        // Show the empty HUD rather than an infinite skeleton.
      } finally {
        if (!cancelled) setReady(true);
      }
    }
    void (async () => {
      await load();
    })();
    const onChange = () => {
      void load();
    };
    window.addEventListener(AURA_STREAM_CHANGED, onChange);
    return () => {
      cancelled = true;
      window.removeEventListener(AURA_STREAM_CHANGED, onChange);
    };
  }, []);

  if (!ready) {
    return (
      <div className="animate-pulse space-y-4 pt-2">
        <div className="h-12 rounded-2xl bg-sand-200/80" />
        <div className="h-40 rounded-3xl bg-sand-200/50" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-4">
      <CommandBar />
      <SpendLessNudge />
      <TodayStream events={events} tasks={tasks} />
    </div>
  );
}
