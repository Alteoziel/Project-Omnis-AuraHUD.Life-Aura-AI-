export type SignalKind = "offer" | "answer" | "ice" | "pubkey" | "ready";

export type HomeChatSignal = {
  kind: SignalKind;
  from: "host" | "guest";
  payload: string;
  at: number;
};

export type HomeChatRoom = {
  id: string;
  code: string;
  host_user_id: string;
  guest_user_id: string | null;
  host_public_key: string | null;
  guest_public_key: string | null;
  host_signal: HomeChatSignal[];
  guest_signal: HomeChatSignal[];
  created_at: string;
  expires_at: string;
};

function errorMessage(error: { message?: string } | null, fallback: string): string {
  const message = error?.message ?? "";
  if (/home_chat_rooms|could not find the table|schema cache/i.test(message)) {
    return "Home Chat needs the latest Supabase migration (home_chat_rooms). Apply supabase/migrations in order.";
  }
  return message || fallback;
}

export async function createHomeChatRoom(input: {
  code: string;
  publicKey: string;
}): Promise<HomeChatRoom> {
  const { createClient } = await import("@/lib/supabase/client");
  const supabase = createClient();
  const { data, error } = await supabase.rpc("create_home_chat_room", {
    p_code: input.code,
    p_public_key: input.publicKey,
  });
  if (error || !data) {
    throw new Error(errorMessage(error, "Could not start Home Chat."));
  }
  return data as HomeChatRoom;
}

export async function joinHomeChatRoom(input: {
  code: string;
  publicKey: string;
}): Promise<HomeChatRoom> {
  const { createClient } = await import("@/lib/supabase/client");
  const supabase = createClient();
  const { data, error } = await supabase.rpc("join_home_chat_room", {
    p_code: input.code,
    p_public_key: input.publicKey,
  });
  if (error || !data) {
    throw new Error(errorMessage(error, "Could not join that Home Chat."));
  }
  return data as HomeChatRoom;
}

export async function fetchHomeChatRoom(roomId: string): Promise<HomeChatRoom | null> {
  const { createClient } = await import("@/lib/supabase/client");
  const supabase = createClient();
  const { data, error } = await supabase
    .from("home_chat_rooms")
    .select("*")
    .eq("id", roomId)
    .maybeSingle();
  if (error) {
    throw new Error(errorMessage(error, "Could not load Home Chat."));
  }
  return (data as HomeChatRoom | null) ?? null;
}

export async function appendHomeChatSignal(input: {
  roomId: string;
  role: "host" | "guest";
  signal: HomeChatSignal;
}): Promise<void> {
  const { createClient } = await import("@/lib/supabase/client");
  const supabase = createClient();
  const { error } = await supabase.rpc("home_chat_append_signal", {
    p_room_id: input.roomId,
    p_role: input.role,
    p_signal: input.signal,
  });
  if (error) {
    throw new Error(errorMessage(error, "Could not send a pairing signal."));
  }
}

export async function closeHomeChatRoom(roomId: string): Promise<void> {
  const { createClient } = await import("@/lib/supabase/client");
  const supabase = createClient();
  await supabase.rpc("close_home_chat_room", { p_room_id: roomId });
}

export function homeChatChannelName(roomId: string): string {
  return `home-chat:${roomId}`;
}
