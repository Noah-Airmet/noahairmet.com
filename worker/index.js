// Runs only for /api/* (see run_worker_first in wrangler.jsonc); everything
// else is served straight from the static assets.
import { handleLastOut } from "./last-out.js";

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);
    if (pathname === "/api/last-out") return handleLastOut(request, env);
    return new Response("Not found", { status: 404 });
  },
};
