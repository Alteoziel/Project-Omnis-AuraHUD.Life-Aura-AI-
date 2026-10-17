const DEFAULT_URL = "ws://localhost:8000";

function resolveUrl() {
  const fromQuery = new URLSearchParams(window.location.search).get("ws");
  return fromQuery || DEFAULT_URL;
}

export function createBridge({ onStatus } = {}) {
  let socket = null;
  let retries = 0;
  let timer = 0;
  const url = resolveUrl();

  const setStatus = (state, detail) => {
    onStatus?.({ state, detail, url });
  };

  const connect = () => {
    try {
      socket = new WebSocket(url);
    } catch {
      setStatus("down", "invalid url");
      return;
    }

    socket.addEventListener("open", () => {
      retries = 0;
      setStatus("live", "connected");
    });

    socket.addEventListener("close", () => {
      setStatus("down", "closed");
      schedule();
    });

    socket.addEventListener("error", () => {
      setStatus("down", "error");
    });
  };

  const schedule = () => {
    window.clearTimeout(timer);
    const wait = Math.min(8000, 600 * 2 ** retries);
    retries += 1;
    timer = window.setTimeout(connect, wait);
  };

  const send = (action, extra = {}) => {
    const payload = { action, ...extra, t: Date.now() };
    const body = JSON.stringify(payload);
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(body);
      return { ok: true, payload };
    }
    return { ok: false, payload };
  };

  connect();

  return {
    url,
    send,
    dispose() {
      window.clearTimeout(timer);
      socket?.close();
    },
  };
}
