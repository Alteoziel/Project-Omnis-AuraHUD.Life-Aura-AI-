"use client";

export type PhotoSendQueueItem = {
  id: string;
  state: "queued" | "sending";
  previewUrl: string | null;
};

export function PhotoSendQueueStrip({
  items,
}: {
  items: PhotoSendQueueItem[];
}) {
  if (items.length === 0) return null;
  const waiting = items.filter((item) => item.state === "queued").length;
  const sending = items.some((item) => item.state === "sending");
  const label = sending
    ? waiting > 0
      ? `Sending 1 · ${waiting} queued`
      : "Sending photo"
    : waiting === 1
      ? "1 photo queued"
      : `${waiting} photos queued`;

  return (
    <div className="border-b border-ink-900/10 bg-moss-500/15 px-4 py-2">
      <p className="text-xs font-bold text-ink-800">Queue · {label}</p>
      <ul className="mt-2 flex gap-2 overflow-x-auto pb-1">
        {items.map((item, index) => (
          <li
            key={item.id}
            className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-ink-900/20"
          >
            {item.previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={item.previewUrl}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="flex h-full w-full items-center justify-center text-xs font-bold text-ink-700">
                {index + 1}
              </span>
            )}
            <span className="absolute inset-x-0 bottom-0 bg-ink-950/75 px-1 py-0.5 text-center text-[10px] font-bold uppercase tracking-wide text-sand-50">
              {item.state === "sending" ? "Sending" : "Queued"}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
