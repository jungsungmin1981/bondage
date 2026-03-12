import http from "http";
import crypto from "crypto";
import dotenv from "dotenv";
import { WebSocketServer, type RawData, type WebSocket } from "ws";
import { and, eq } from "drizzle-orm";

// @workspace/db는 import 시점에 DB client를 만들며 env가 필요하므로, 최우선으로 .env를 로드한다.
dotenv.config();

const { db, schema } = await import("@workspace/db");

type ClientCtx = {
  userId: string;
  threads: Set<string>;
};

function b64urlToBuf(input: string) {
  const pad = input.length % 4 === 0 ? "" : "=".repeat(4 - (input.length % 4));
  const b64 = input.replace(/-/g, "+").replace(/_/g, "/") + pad;
  return Buffer.from(b64, "base64");
}

function verifyWsToken(token: string): { ok: true; userId: string } | { ok: false } {
  const secret = process.env.WS_TOKEN_SECRET || process.env.BETTER_AUTH_SECRET || "dev-secret";
  const parts = token.split(".");
  if (parts.length !== 4) return { ok: false };
  const [userId, expStr, nonce, sigB64] = parts;
  if (!userId || !expStr || !nonce || !sigB64) return { ok: false };
  const expMs = Number(expStr);
  if (!Number.isFinite(expMs) || Date.now() > expMs) return { ok: false };
  const payload = `${userId}.${expStr}.${nonce}`;
  const expected = crypto.createHmac("sha256", secret).update(payload).digest();
  const got = b64urlToBuf(sigB64);
  if (got.length !== expected.length) return { ok: false };
  if (!crypto.timingSafeEqual(got, expected)) return { ok: false };
  return { ok: true, userId };
}

async function assertParticipant(threadId: string, userId: string) {
  const rows = await db
    .select({ id: schema.dmParticipants.id })
    .from(schema.dmParticipants)
    .where(and(eq(schema.dmParticipants.threadId, threadId), eq(schema.dmParticipants.userId, userId)))
    .limit(1);
  if (!rows[0]) throw new Error("권한이 없습니다.");
}

const PORT = Number(process.env.WS_PORT ?? "3001");
const PUBLISH_SECRET = process.env.WS_PUBLISH_SECRET || process.env.BETTER_AUTH_SECRET || "dev-secret";

const server = http.createServer(async (req, res) => {
  if (req.method === "POST" && req.url === "/publish") {
    const secret = req.headers["x-ws-secret"];
    if (secret !== PUBLISH_SECRET) {
      res.writeHead(401);
      res.end("unauthorized");
      return;
    }
    let raw = "";
    req.on("data", (c) => (raw += c));
    req.on("end", () => {
      try {
        const body = JSON.parse(raw || "{}") as { threadId?: string };
        if (!body.threadId) {
          res.writeHead(400);
          res.end("missing threadId");
          return;
        }
        broadcast(body.threadId, { type: "message:new", threadId: body.threadId });
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify({ ok: true }));
      } catch {
        res.writeHead(400);
        res.end("bad json");
      }
    });
    return;
  }

  res.writeHead(200);
  res.end("ok");
});

const wss = new WebSocketServer({ noServer: true });
const ctxBySocket = new WeakMap<WebSocket, ClientCtx>();
const socketsByThread = new Map<string, Set<WebSocket>>();

function broadcast(threadId: string, payload: unknown) {
  const set = socketsByThread.get(threadId);
  if (!set || set.size === 0) return;
  const msg = JSON.stringify(payload);
  for (const ws of set) {
    if (ws.readyState === ws.OPEN) ws.send(msg);
  }
}

function unsubscribeAll(ws: WebSocket) {
  const ctx = ctxBySocket.get(ws);
  if (!ctx) return;
  for (const threadId of ctx.threads) {
    const set = socketsByThread.get(threadId);
    if (!set) continue;
    set.delete(ws);
    if (set.size === 0) socketsByThread.delete(threadId);
  }
  ctx.threads.clear();
}

server.on("upgrade", (req, socket, head) => {
  const url = new URL(req.url ?? "", "http://localhost");
  const token = url.searchParams.get("token") ?? "";
  const verified = verifyWsToken(token);
  if (!verified.ok) {
    socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
    socket.destroy();
    return;
  }
  wss.handleUpgrade(req, socket, head, (ws: WebSocket) => {
    ctxBySocket.set(ws, { userId: verified.userId, threads: new Set() });
    wss.emit("connection", ws, req);
  });
});

wss.on("connection", (ws: WebSocket) => {
  ws.on("message", async (data: RawData) => {
    const ctx = ctxBySocket.get(ws);
    if (!ctx) return;
    let msg: unknown;
    try {
      msg = JSON.parse(String(data));
    } catch {
      return;
    }
    if (
      typeof msg === "object" &&
      msg != null &&
      "type" in msg &&
      (msg as any).type === "subscribe" &&
      typeof (msg as any).threadId === "string"
    ) {
      try {
        const threadId = (msg as any).threadId as string;
        await assertParticipant(threadId, ctx.userId);
        ctx.threads.add(threadId);
        const set = socketsByThread.get(threadId) ?? new Set<WebSocket>();
        socketsByThread.set(threadId, set);
        set.add(ws);
        ws.send(JSON.stringify({ type: "subscribed", threadId }));
      } catch {
        ws.send(JSON.stringify({ type: "error", error: "권한이 없습니다." }));
      }
      return;
    }
    if (
      typeof msg === "object" &&
      msg != null &&
      "type" in msg &&
      (msg as any).type === "unsubscribe" &&
      typeof (msg as any).threadId === "string"
    ) {
      const t = (msg as any).threadId as string;
      ctx.threads.delete(t);
      const set = socketsByThread.get(t);
      set?.delete(ws);
      if (set && set.size === 0) socketsByThread.delete(t);
      return;
    }
  });

  ws.on("close", () => unsubscribeAll(ws));
  ws.on("error", () => unsubscribeAll(ws));
});

server.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`[ws] listening on :${PORT}`);
});

