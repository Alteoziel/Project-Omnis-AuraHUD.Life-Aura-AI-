import type { CorrectionRecord } from "@/lib/store/schema";

export function describeCorrection(row: CorrectionRecord): string {
  if (row.status === "corrected") {
    return `You fixed “${row.rejectedOutput}” after “${row.inputSnippet}”.`;
  }
  return `I will not treat “${row.inputSnippet}” as “${row.rejectedOutput}”.`;
}
