"use client";

import { useEffect } from "react";

export function RegisterServiceWorker() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    void navigator.serviceWorker
      .register("/sw.js", { scope: "/", updateViaCache: "none" })
      .then((registration) => {
        const requestSkipWaiting = () => {
          if (registration.waiting) {
            registration.waiting.postMessage("SKIP_WAITING");
          }
        };
        if (registration.waiting) requestSkipWaiting();
        registration.addEventListener("updatefound", () => {
          const worker = registration.installing;
          if (!worker) return;
          worker.addEventListener("statechange", () => {
            if (worker.state === "installed") requestSkipWaiting();
          });
        });
        void registration.update();
        const onFocus = () => {
          void registration.update();
        };
        window.addEventListener("focus", onFocus);
        document.addEventListener("visibilitychange", () => {
          if (document.visibilityState === "visible") void registration.update();
        });
      })
      .catch(() => {
        // Unsupported contexts (including some in-app browsers).
      });
  }, []);

  return null;
}
