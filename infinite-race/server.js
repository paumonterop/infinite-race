const { createServer } = require("http");
const { parse } = require("url");
const next = require("next");
const { Server } = require("socket.io");

const dev = process.env.NODE_ENV !== "production";
const hostname = "0.0.0.0";
const port = parseInt(process.env.PORT || "3000", 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  });

  const io = new Server(httpServer, {
    path: "/socket.io",
  });

  // Make the io instance available to API route handlers via a global.
  global.__io__ = io;

  io.on("connection", (socket) => {
    socket.emit("connected", { ok: true });
  });

  // Server-side tick: checks whether the current lap has expired and
  // advances the race automatically. The check itself is timestamp-based
  // (current_lap_ends_at vs Date.now()), so this interval is just a poll
  // frequency, not the source of truth for timing.
  setInterval(() => {
    fetch(`http://127.0.0.1:${port}/api/internal/tick`, { method: "POST" }).catch(() => {});
  }, 1000);

  httpServer.listen(port, () => {
    console.log(`> INFINITE RACE server ready on http://${hostname}:${port}`);
  });
});
