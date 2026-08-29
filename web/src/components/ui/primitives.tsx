import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from "react";

function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

type ButtonVariant = "primary" | "ghost" | "danger";

export function Button({
  variant = "primary",
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  return (
    <button
      {...props}
      className={cx(
        "inline-flex min-h-tap min-w-tap items-center justify-center rounded-pill px-5 text-sm font-semibold tracking-tight transition-transform duration-200 enabled:active:scale-[0.98] disabled:opacity-40",
        variant === "primary" && "bg-flash text-ink shadow-glow",
        variant === "ghost" && "border border-white/10 bg-white/5 text-white",
        variant === "danger" && "bg-white/10 text-white",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function IconButton({
  label,
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      {...props}
      aria-label={label}
      className={cx(
        "inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white transition-transform duration-200 enabled:active:scale-[0.96]",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function Card({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLElement>) {
  return (
    <section
      {...props}
      className={cx(
        "rounded-card border border-white/10 bg-surface/80 p-5 shadow-glow backdrop-blur-md",
        className,
      )}
    >
      {children}
    </section>
  );
}

export function Chip({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cx(
        "inline-flex items-center rounded-pill border border-white/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.14em] text-muted",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cx(
        "animate-pulse rounded-2xl bg-white/10",
        className ?? "h-16 w-full",
      )}
    />
  );
}

export function EmptyState({
  title,
  body,
}: {
  title: string;
  body: string;
}) {
  return (
    <div className="px-2 py-10 text-center">
      <p className="font-display text-xl text-white">{title}</p>
      <p className="mt-2 text-sm leading-6 text-muted">{body}</p>
    </div>
  );
}
