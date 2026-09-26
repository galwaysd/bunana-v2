const http = require("node:http");

const TARGET = (process.env.C2C_TARGET || "").replace(/\/$/, "");
if (!TARGET) {
  console.error("Missing C2C_TARGET");
  process.exit(1);
}
const target = new URL(TARGET);
const port = Number(process.env.PORT || 10000);

function publicBase(req) {
  const proto = req.headers["x-forwarded-proto"] || "https";
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  return `${proto}://${host}`;
}

function rewriteText(text, base) {
  return text.split(TARGET).join(base);
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.url === "/proxy-health") {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ status: "ok", target: TARGET }));
      return;
    }

    const chunks = [];
    let size = 0;
    for await (const chunk of req) {
      size += chunk.length;
      if (size > 16 * 1024 * 1024) {
        res.writeHead(413);
        res.end("request too large");
        return;
      }
      chunks.push(chunk);
    }
    const body = chunks.length ? Buffer.concat(chunks) : undefined;

    const headers = {};
    for (const [k, v] of Object.entries(req.headers)) {
      if (v == null) continue;
      const key = k.toLowerCase();
      if (["host", "content-length", "connection", "transfer-encoding"].includes(key)) continue;
      headers[k] = Array.isArray(v) ? v.join(", ") : v;
    }
    headers["x-tunnel-skip-antiphishing-page"] = "true";

    const upstreamUrl = new URL(req.url || "/", target);
    const upstream = await fetch(upstreamUrl, {
      method: req.method,
      headers,
      body: ["GET", "HEAD"].includes(req.method || "GET") ? undefined : body,
      redirect: "manual"
    });

    const base = publicBase(req);
    const outHeaders = {};
    upstream.headers.forEach((value, key) => {
      const lower = key.toLowerCase();
      if (["content-length", "transfer-encoding", "connection"].includes(lower)) return;
      outHeaders[key] = rewriteText(value, base);
    });

    const contentType = upstream.headers.get("content-type") || "";
    if (req.method === "HEAD" || upstream.status === 204 || upstream.status === 304) {
      res.writeHead(upstream.status, outHeaders);
      res.end();
      return;
    }

    if (contentType.includes("text/event-stream")) {
      res.writeHead(upstream.status, outHeaders);
      if (upstream.body) {
        const reader = upstream.body.getReader();
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          res.write(Buffer.from(value));
        }
      }
      res.end();
      return;
    }

    const raw = Buffer.from(await upstream.arrayBuffer());
    let payload = raw;
    if (
      contentType.includes("application/json") ||
      contentType.includes("text/") ||
      contentType.includes("application/problem+json")
    ) {
      payload = Buffer.from(rewriteText(raw.toString("utf8"), base));
    }
    outHeaders["content-length"] = String(payload.length);
    res.writeHead(upstream.status, outHeaders);
    res.end(payload);
  } catch (err) {
    res.writeHead(502, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: "proxy_error", message: err instanceof Error ? err.message : String(err) }));
  }
});

server.listen(port, "0.0.0.0", () => {
  console.log(`bunana-c2c-stable-proxy listening on :${port} -> ${TARGET}`);
});
