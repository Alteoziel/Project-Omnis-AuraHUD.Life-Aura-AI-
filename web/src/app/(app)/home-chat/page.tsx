import { AppShell } from "@/components/AppShell";
import { HomeChatApp } from "@/components/home-chat/HomeChatApp";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function HomeChatPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let displayName = "You";
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", user.id)
      .maybeSingle();
    displayName = profile?.display_name?.trim() || "You";
  }

  return (
    <AppShell
      title="Home Chat"
      subtitle="Nearby encrypted texts and one-time photos"
    >
      <HomeChatApp displayName={displayName} />
    </AppShell>
  );
}
