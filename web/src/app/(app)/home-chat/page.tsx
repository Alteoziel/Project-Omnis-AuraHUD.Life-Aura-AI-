"use client";

import { HomeChatApp } from "@/components/home-chat/HomeChatApp";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";

export default function HomeChatPage() {
  const [displayName, setDisplayName] = useState("You");

  useEffect(() => {
    const supabase = createClient();
    void supabase.auth.getUser().then(async ({ data }) => {
      const userId = data.user?.id;
      if (!userId) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("id", userId)
        .maybeSingle();
      setDisplayName(profile?.display_name?.trim() || "You");
    });
  }, []);

  return <HomeChatApp displayName={displayName} />;
}
