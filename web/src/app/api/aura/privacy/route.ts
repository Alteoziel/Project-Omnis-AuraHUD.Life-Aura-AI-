import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const PatchSchema = z.object({
  cloud_ai_enabled: z.boolean().optional(),
  motivation_style: z.enum(["encouraging", "direct", "humorous"]).optional(),
  onboarding_preset: z
    .enum(["household_money", "focus_tasks", "calm_defaults"])
    .nullable()
    .optional(),
});

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data } = await supabase
    .from("aura_privacy_settings")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!data) {
    const { data: created } = await supabase
      .from("aura_privacy_settings")
      .upsert({ user_id: user.id, cloud_ai_enabled: false })
      .select("*")
      .maybeSingle();
    return NextResponse.json({
      settings: created ?? {
        user_id: user.id,
        cloud_ai_enabled: false,
        motivation_style: "encouraging",
        onboarding_preset: null,
      },
    });
  }

  return NextResponse.json({ settings: data });
}

export async function PATCH(request: Request) {
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
  const parsed = PatchSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("aura_privacy_settings")
    .upsert({
      user_id: user.id,
      ...parsed.data,
      updated_at: new Date().toISOString(),
    })
    .select("*")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ settings: data });
}
