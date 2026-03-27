import { createServer } from "node:http";
import { extname, join, resolve } from "node:path";
import { readFile } from "node:fs/promises";

import configHandler from "../api/config.js";

const projectRoot = resolve(process.cwd());
process.env.SUPABASE_URL ??= "https://example.supabase.co";
process.env.SUPABASE_ANON_KEY ??= "smoke-test";

const contentTypes = new Map([
  [".html", "text/html; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".js", "application/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".svg", "image/svg+xml"],
  [".png", "image/png"],
  [".ico", "image/x-icon"],
  [".txt", "text/plain; charset=utf-8"],
]);

function createResponseAdapter(res) {
  return {
    statusCode: 200,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      const body = JSON.stringify(payload);
      res.writeHead(this.statusCode, {
        "Content-Type": "application/json; charset=utf-8",
      });
      res.end(body);
    },
  };
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url || "/", "http://127.0.0.1:3000");

  if (url.pathname === "/api/config") {
    try {
      await configHandler(req, createResponseAdapter(res));
    } catch (error) {
      res.writeHead(500, {
        "Content-Type": "application/json; charset=utf-8",
      });
      res.end(JSON.stringify({ error: error?.message || "Unable to load config" }));
    }
    return;
  }

  const requestPath = url.pathname === "/" ? "/index.html" : url.pathname;
  const filePath = join(projectRoot, requestPath);

  try {
    const file = await readFile(filePath);
    const contentType = contentTypes.get(extname(filePath)) || "application/octet-stream";
    res.writeHead(200, {
      "Content-Type": contentType,
    });
    res.end(file);
  } catch {
    res.writeHead(404, {
      "Content-Type": "text/plain; charset=utf-8",
    });
    res.end("Not found");
  }
});

server.listen(3000, "127.0.0.1", () => {
  // Keep output minimal so Playwright can boot cleanly.
  console.log("Smoke server listening on http://127.0.0.1:3000");
});
