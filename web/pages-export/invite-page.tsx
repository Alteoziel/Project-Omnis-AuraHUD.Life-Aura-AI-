"use client";

import { InviteAcceptApp } from "@/components/pages/InviteAcceptApp";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

function InviteQuery() {
  const searchParams = useSearchParams();
  return <InviteAcceptApp token={searchParams.get("token") ?? ""} />;
}

export default function InvitePage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-dvh items-center bg-app-glow px-5 py-10">
          <div className="mx-auto h-64 w-full max-w-md animate-pulse rounded-2xl bg-sand-200/50" />
        </main>
      }
    >
      <InviteQuery />
    </Suspense>
  );
}
