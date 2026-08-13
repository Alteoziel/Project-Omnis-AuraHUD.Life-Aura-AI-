import { getSupabaseEnv } from "@/lib/supabase/env";

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

const ROOM_STORAGE_KEY = "aurahud-home-chat-room-id";

function errorMessage(error: { message?: string } | null, fallback: string): string {
  const message = error?.message ?? "";
  if (/home_chat_rooms|could not find the table|schema cache/i.test(message)) {
    return "Home Chat needs the latest Supabase migration (home_chat_rooms). Apply supabase/migrations in order.";
  }
  if (/too many active home chat rooms/i.test(message)) {
    return "A previous Home Chat didn’t close. Try Start again.";
  }
  return message || fallback;
}

export function rememberHomeChatRoom(roomId: string): void {
  try {
    sessionStorage.setItem(ROOM_STORAGE_KEY, roomId);
  } catch {
    // Private mode / quota — server-side replace still covers leftovers.
  }
}

export function forgetHomeChatRoom(roomId?: string): void {
  try {
    if (!roomId || sessionStorage.getItem(ROOM_STORAGE_KEY) === roomId) {
      sessionStorage.removeItem(ROOM_STORAGE_KEY);
    }
  } catch {
    // Ignore storage failures.
  }
}

export function peekRememberedHomeChatRoom(): string | null {
  try {
    return sessionStorage.getItem(ROOM_STORAGE_KEY);
  } catch {
    return null;
  }
}

function readAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const key = window.localStorage.key(i);
      if (!key || !key.startsWith("sb-") || !key.endsWith("-auth-token")) continue;
      const raw = window.localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw) as { access_token?: string };
      if (parsed.access_token) return parsed.access_token;
    }
  } catch {
    return null;
  }
  return null;
}

/** Fire-and-forget close that can finish after the tab is gone (refresh / swipe away). */
export function closeHomeChatRoomKeepalive(roomId: string): void {
  forgetHomeChatRoom(roomId);
  try {
    const { url, anonKey } = getSupabaseEnv();
    const token = readAccessToken();
    if (!token) return;
    void fetch(`${url}/rest/v1/rpc/close_home_chat_room`, {
      method: "POST",
      keepalive: true,
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({ p_room_id: roomId }),
    });
  } catch {
    // Unload path — best effort.
  }
}

export async function closeMyHomeChatRooms(): Promise<void> {
  const { createClient } = await import("@/lib/supabase/client");
  const supabase = createClient();
  const { error } = await supabase.rpc("close_my_home_chat_rooms");
  if (!error) {
    forgetHomeChatRoom();
    return;
  }
  const { data: rooms } = await supabase.from("home_chat_rooms").select("id");
  for (const row of rooms ?? []) {
    await supabase.rpc("close_home_chat_room", { p_room_id: (row as { id: string }).id });
  }
  forgetHomeChatRoom();
}

export async function closeLeftoverHomeChatRoom(): Promise<void> {
  const leftover = peekRememberedHomeChatRoom();
  if (!leftover) return;
  forgetHomeChatRoom(leftover);
  await closeHomeChatRoom(leftover).catch(() => undefined);
}

export async function createHomeChatRoom(input: {
  code: string;
  publicKey: string;
}): Promise<HomeChatRoom> {
  const { createClient } = await import("@/lib/supabase/client");
  const supabase = createClient();
  await closeMyHomeChatRooms().catch(() => undefined);
  const { data, error } = await supabase.rpc("create_home_chat_room", {
    p_code: input.code,
    p_public_key: input.publicKey,
  });
  if (error || !data) {
    throw new Error(errorMessage(error, "Could not start Home Chat."));
  }
  const room = data as HomeChatRoom;
  rememberHomeChatRoom(room.id);
  return room;
}

export async function joinHomeChatRoom(input: {
  code: string;
  publicKey: string;
}): Promise<HomeChatRoom> {
  const { createClient } = await import("@/lib/supabase/client");
  const supabase = createClient();
  const leftover = peekRememberedHomeChatRoom();
  if (leftover) {
    await closeHomeChatRoom(leftover).catch(() => undefined);
  }
  const { data, error } = await supabase.rpc("join_home_chat_room", {
    p_code: input.code,
    p_public_key: input.publicKey,
  });
  if (error || !data) {
    throw new Error(errorMessage(error, "Could not join that Home Chat."));
  }
  const room = data as HomeChatRoom;
  rememberHomeChatRoom(room.id);
  return room;
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
  forgetHomeChatRoom(roomId);
  const { createClient } = await import("@/lib/supabase/client");
  const supabase = createClient();
  await supabase.rpc("close_home_chat_room", { p_room_id: roomId });
}

export function homeChatChannelName(roomId: string): string {
  return `home-chat:${roomId}`;
}
