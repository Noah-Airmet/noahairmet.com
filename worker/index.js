// Runs only for /og/* and /api/* (see run_worker_first in wrangler.jsonc).
import { handleLastOut } from "./last-out.js";

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);
    if (pathname === "/api/last-out") return handleLastOut(request, env);
    if (pathname.startsWith("/api/")) return new Response("Not found", { status: 404 });
    return serveRanges(request, env);
  },
};

// Workers static assets ignore Range requests, and Safari/iMessage won't
// play an MP4 without them, so this answers ranges for the share-card video.
async function serveRanges(request, env) {
  const res = await env.ASSETS.fetch(request);
  const range = request.headers.get("Range");
  const m = range && /^bytes=(\d*)-(\d*)$/.exec(range.trim());
  if (res.status !== 200 || !m || (m[1] === "" && m[2] === "")) {
    const out = new Response(res.body, res);
    out.headers.set("Accept-Ranges", "bytes");
    return out;
  }
  const buf = await res.arrayBuffer();
  const size = buf.byteLength;
  let start, end;
  if (m[1] === "") { start = Math.max(0, size - Number(m[2])); end = size - 1; }
  else { start = Number(m[1]); end = m[2] === "" ? size - 1 : Math.min(Number(m[2]), size - 1); }
  if (start >= size || start > end) {
    return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${size}` } });
  }
  const headers = new Headers(res.headers);
  headers.set("Accept-Ranges", "bytes");
  headers.set("Content-Range", `bytes ${start}-${end}/${size}`);
  headers.set("Content-Length", String(end - start + 1));
  return new Response(request.method === "HEAD" ? null : buf.slice(start, end + 1), { status: 206, headers });
}
