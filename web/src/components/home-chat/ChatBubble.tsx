"use client";

import { useEffect, useRef, useState } from "react";
import {
  TAPBACK_EMOJIS,
  normalizeReactionEmoji,
  type ChatReaction,
} from "@/lib/home-chat/reactions";
import type { ThreadItem } from "@/components/home-chat/useHomeChat";

export function ChatBubble({
  item,
  onOpenPhoto,
  onReact,
}: {
  item: ThreadItem;
  onOpenPhoto: (id: string) => void;
  onReact: (id: string, emoji: string) => void;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const holdRef = useRef<number | null>(null);
  const mine = item.from === "me";

  useEffect(() => {
    return () => {
      if (holdRef.current != null) window.clearTimeout(holdRef.current);
    };
  }, []);

  function clearHold() {
    if (holdRef.current != null) {
      window.clearTimeout(holdRef.current);
      holdRef.current = null;
    }
  }

  function openPicker() {
    setPickerOpen(true);
  }

  return (
    <li
      className={`flex max-w-[86%] flex-col ${mine ? "ml-auto items-end" : "items-start"}`}
    >
      {pickerOpen ? (
        <div className="mb-1 flex max-w-full items-center gap-1 overflow-x-auto rounded-full bg-sand-50 px-1.5 py-1 shadow-soft">
          {TAPBACK_EMOJIS.map((emoji) => {
            const selected = item.reactions.some(
              (row) => row.from === "me" && row.emoji === emoji,
            );
            return (
              <button
                key={emoji}
                type="button"
                onClick={() => {
                  onReact(item.id, emoji);
                  setPickerOpen(false);
                }}
                className={`flex h-11 w-11 shrink-0 touch-manipulation items-center justify-center rounded-full text-xl ${
                  selected ? "bg-moss-500/20" : ""
                }`}
                aria-label={`React with ${emoji}`}
              >
                {emoji}
              </button>
            );
          })}
          <input
            aria-label="Choose any emoji from the keyboard"
            inputMode="text"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="none"
            enterKeyHint="done"
            placeholder="+"
            className="h-11 w-11 shrink-0 rounded-full border border-ink-900/10 bg-white text-center text-lg font-bold leading-none text-ink-500 outline-none ring-moss-400 focus:ring-2"
            onChange={(event) => {
              const emoji = normalizeReactionEmoji(event.target.value);
              event.target.value = "";
              if (!emoji) return;
              onReact(item.id, emoji);
              setPickerOpen(false);
            }}
          />
          <button
            type="button"
            onClick={() => setPickerOpen(false)}
            className="h-11 shrink-0 px-2 text-xs font-bold text-ink-600"
          >
            Close
          </button>
        </div>
      ) : null}

      <div
        className={`select-none rounded-2xl px-3 py-2 text-base leading-snug ${
          mine ? "bg-moss-500 text-sand-50" : "bg-sand-100 text-ink-900"
        }`}
        style={{ WebkitTouchCallout: "none" }}
        onContextMenu={(event) => {
          event.preventDefault();
          openPicker();
        }}
        onPointerDown={() => {
          clearHold();
          holdRef.current = window.setTimeout(openPicker, 420);
        }}
        onPointerUp={clearHold}
        onPointerCancel={clearHold}
      >
        {item.kind === "text" ? (
          item.body
        ) : item.state === "ready" ? (
          <button
            type="button"
            onClick={() => onOpenPhoto(item.id)}
            className="min-h-11 font-bold underline underline-offset-2"
          >
            One-time photo · tap to view
          </button>
        ) : item.state === "sent" ? (
          "One-time photo sent"
        ) : item.state === "sending" ? (
          "Sending photo…"
        ) : item.state === "queued" ? (
          "Waiting for a clear link…"
        ) : item.state === "receiving" ? (
          "Receiving photo…"
        ) : (
          "Photo viewed and removed"
        )}
      </div>

      <div className="mt-1 flex items-center gap-1">
        {item.reactions.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {item.reactions.map((reaction) => (
              <ReactionChip
                key={`${reaction.from}-${reaction.emoji}`}
                reaction={reaction}
                onToggle={() => onReact(item.id, reaction.emoji)}
              />
            ))}
          </div>
        ) : null}
        <button
          type="button"
          onClick={openPicker}
          className="h-8 touch-manipulation rounded-full px-2 text-[11px] font-bold uppercase tracking-wide text-ink-500"
          aria-label="Add reaction"
        >
          React
        </button>
      </div>
    </li>
  );
}

function ReactionChip({
  reaction,
  onToggle,
}: {
  reaction: ChatReaction;
  onToggle: () => void;
}) {
  const own = reaction.from === "me";
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`flex h-8 touch-manipulation items-center rounded-full px-2 text-sm ${
        own ? "bg-moss-500/20" : "bg-sand-100"
      }`}
      aria-label={own ? "Your reaction" : "Their reaction"}
    >
      <span>{reaction.emoji}</span>
    </button>
  );
}
