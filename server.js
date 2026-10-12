const { createServer } = require("http");
const { parse } = require("url");
const next = require("next");
const { Server } = require("socket.io");
const crypto = require("crypto");

const dev = process.env.NODE_ENV !== "production";
const hostname = "0.0.0.0";
const port = parseInt(process.env.PORT || "3000", 10);

// Autenticació HTTP Basic. Només s'activa si AUTH_PASS està definit (a producció, via variable d'entorn).
const AUTH_USER = process.env.AUTH_USER || "admin";
const AUTH_PASS = process.env.AUTH_PASS || "";

function safeEqual(a, b) {
  const ha = crypto.createHash("sha256").update(a).digest();
  const hb = crypto.createHash("sha256").update(b).digest();
  return crypto.timingSafeEqual(ha, hb);
}

function isLoopback(req) {
  const a = req.socket.remoteAddress || "";
  return a === "127.0.0.1" || a === "::1" || a === "::ffff:127.0.0.1";
}

// Sortides de broadcast (vMix/OBS) i la LECTURA (GET) de les dades que necessiten: sense contrasenya.
// Tot el que modifica (POST/PUT/PATCH/DELETE) i les pantalles d'operació continuen protegits.
const PUBLIC_GET = [
  "/broadcast", // pàgines de sortida (no inclou /broadcast-control, que és d'operació)
  "/_next",
  "/flags",
  "/icons",
  "/favicon.ico",
  "/api/trail/events",
  "/api/time",
  "/api/broadcast/state",
  "/api/runners",
  "/api/leaderboard",
  "/api/race",
  "/api/stats",
];

function isPublicRead(req, pathname) {
  if (req.method !== "GET" && req.method !== "HEAD") return false;
  return PUBLIC_GET.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

/** Torna true si la petició pot continuar; si no, ja ha respost 401. */
function checkAuth(req, res, pathname) {
  if (!AUTH_PASS) return true;
  if (isPublicRead(req, pathname)) return true;
  // crides internes del propi servidor (tick de curses i sincronització)
  if (pathname.startsWith("/api/internal/") && isLoopback(req)) return true;
  const h = req.headers.authorization || "";
  if (h.startsWith("Basic ")) {
    const raw = Buffer.from(h.slice(6), "base64").toString("utf8");
    const i = raw.indexOf(":");
    if (i >= 0 && safeEqual(raw.slice(0, i), AUTH_USER) && safeEqual(raw.slice(i + 1), AUTH_PASS)) return true;
  }
  res.writeHead(401, { "WWW-Authenticate": 'Basic realm="Plataforma", charset="UTF-8"', "Content-Type": "text/plain; charset=utf-8" });
  res.end("Cal autenticació");
  return false;
}

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    if (!checkAuth(req, res, parsedUrl.pathname || "/")) return;
    handle(req, res, parsedUrl);
  });

  const io = new Server(httpServer, {
    path: "/socket.io",
    // Les motxilles GPS (client python-socketio, no es toquen) poden parlar un protocol més antic: s'accepta també.
    allowEIO3: true,
  });

  // Make the io instance available to API route handlers via a global.
  global.__io__ = io;

  io.on("connection", (socket) => {
    socket.emit("connected", { ok: true });

    // Motxilles GPS: mateix protocol que el servei antic (event "gps_data").
    socket.on("gps_data", (data) => {
      try {
        if (typeof data === "string") data = JSON.parse(data);
        if (!data || !data.id) return;
        global.__gps_raw__ = global.__gps_raw__ || {};
        global.__gps_raw__[String(data.id)] = {
          id: String(data.id),
          lat: data.lat,
          lon: data.lon,
          speed_kmh: data.speed_kmh == null ? null : data.speed_kmh,
          alt: data.alt == null ? null : data.alt,
          num_sats: data.num_sats == null ? null : data.num_sats,
          received_at: Date.now(),
        };
      } catch (e) {
        /* paquet invàlid: l'ignorem */
      }
    });
  });

  // Server-side tick: checks whether the current lap has expired and
  // advances the race automatically. The check itself is timestamp-based
  // (current_lap_ends_at vs Date.now()), so this interval is just a poll
  // frequency, not the source of truth for timing.
  setInterval(() => {
    fetch(`http://127.0.0.1:${port}/api/internal/tick`, { method: "POST" }).catch(() => {});
    fetch(`http://127.0.0.1:${port}/api/internal/trail-tick`, { method: "POST" }).catch(() => {});
  }, 1000);

  httpServer.listen(port, () => {
    console.log(`> INFINITE RACE server ready on http://${hostname}:${port}`);
  });
});
