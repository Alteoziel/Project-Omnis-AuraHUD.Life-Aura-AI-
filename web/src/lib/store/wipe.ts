import { emptyState, type AuraState } from "./schema";
import { deleteDatabase } from "./db";

export async function wipeToEmpty(nowMs: number): Promise<AuraState> {
  await deleteDatabase();
  return emptyState(nowMs);
}
