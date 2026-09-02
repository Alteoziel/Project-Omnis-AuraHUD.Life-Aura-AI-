import type { CalendarEventRecord } from "../store/schema";

export const DAY_START_MIN = 8 * 60;
export const DAY_END_MIN = 22 * 60;
export const HOMEWORK_BLOCK_MIN = 60;

export type TimeBlock = { startMin: number; endMin: number };

export type SuggestedSlot = {
  day: string;
  startMin: number;
  endMin: number;
};

export function addDaysIso(iso: string, n: number): string {
  const [year, month, day] = iso.split("-").map(Number);
  const dt = new Date(year, (month ?? 1) - 1, (day ?? 1) + n);
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const d = String(dt.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function formatClock(min: number): string {
  const clamped = Math.max(0, Math.min(min, 24 * 60 - 1));
  const hours = Math.floor(clamped / 60);
  const minutes = clamped % 60;
  const ampm = hours >= 12 ? "pm" : "am";
  const h12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${h12}:${String(minutes).padStart(2, "0")}${ampm}`;
}

export function mergeBusy(blocks: TimeBlock[]): TimeBlock[] {
  const sorted = blocks
    .filter((block) => block.endMin > block.startMin)
    .slice()
    .sort((a, b) => a.startMin - b.startMin);
  const out: TimeBlock[] = [];
  for (const block of sorted) {
    const last = out[out.length - 1];
    if (!last || block.startMin > last.endMin) {
      out.push({ ...block });
    } else {
      last.endMin = Math.max(last.endMin, block.endMin);
    }
  }
  return out;
}

export function gapsOnDay(
  busy: TimeBlock[],
  dayStartMin = DAY_START_MIN,
  dayEndMin = DAY_END_MIN,
): TimeBlock[] {
  const merged = mergeBusy(busy);
  const gaps: TimeBlock[] = [];
  let cursor = dayStartMin;
  for (const block of merged) {
    const start = Math.max(block.startMin, dayStartMin);
    const end = Math.min(block.endMin, dayEndMin);
    if (start > cursor) {
      gaps.push({ startMin: cursor, endMin: Math.min(start, dayEndMin) });
    }
    cursor = Math.max(cursor, end);
    if (cursor >= dayEndMin) break;
  }
  if (cursor < dayEndMin) {
    gaps.push({ startMin: cursor, endMin: dayEndMin });
  }
  return gaps.filter((gap) => gap.endMin - gap.startMin > 0);
}

export function suggestSlot(
  dueOn: string | null,
  today: string,
  calendar: CalendarEventRecord[],
  durationMin = HOMEWORK_BLOCK_MIN,
): SuggestedSlot | null {
  const lastDay = dueOn && dueOn > today ? dueOn : addDaysIso(today, 7);
  let day = today;
  for (let i = 0; i < 14; i += 1) {
    if (day > lastDay) break;
    const busy = calendar
      .filter((event) => event.day === day)
      .map((event) => ({ startMin: event.startMin, endMin: event.endMin }));
    const fit = gapsOnDay(busy).find((gap) => gap.endMin - gap.startMin >= durationMin);
    if (fit) {
      return {
        day,
        startMin: fit.startMin,
        endMin: fit.startMin + durationMin,
      };
    }
    day = addDaysIso(day, 1);
  }
  return null;
}
