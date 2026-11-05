const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const { getPlaylist } = require("./lib/youtube");

const ROOT = __dirname;
const PUBLIC_DIR = path.join(ROOT, "public");
const ENV_FILE = path.join(ROOT, ".env");

if (fs.existsSync(ENV_FILE)) {
  for (const line of fs.readFileSync(ENV_FILE, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (match && process.env[match[1]] === undefined) {
      process.env[match[1]] = match[2].replace(/^(['"])(.*)\1$/, "$2");
    }
  }
}

const PORT = Number(process.env.PORT) || 3000;

const MIME_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".png": "image/png",
};

function serveStatic(response, pathname) {
  let requestPath;
  try {
    requestPath = pathname === "/" ? "/index.html" : decodeURIComponent(pathname);
  } catch {
    response.writeHead(400);
    return response.end("Invalid path.");
  }

  const filePath = path.resolve(PUBLIC_DIR, `.${requestPath}`);
  if (!filePath.startsWith(`${PUBLIC_DIR}${path.sep}`)) {
    response.writeHead(403);
    return response.end("Forbidden");
  }

  fs.readFile(filePath, (error, contents) => {
    if (error) {
      response.writeHead(error.code === "ENOENT" ? 404 : 500);
      return response.end("File nahi mili.");
    }
    response.writeHead(200, {
      "content-type": MIME_TYPES[path.extname(filePath)] || "application/octet-stream",
      "cache-control": path.extname(filePath) === ".png" ? "public, max-age=3600" : "no-cache",
    });
    response.end(contents);
  });
}

async function handlePlaylistApi(request, response, url) {
  if (request.method !== "GET") {
    response.writeHead(405, { allow: "GET" });
    return response.end("Method not allowed.");
  }

  try {
    const playlist = await getPlaylist(url.searchParams.get("url") || "", process.env.YOUTUBE_API_KEY);
    response.writeHead(200, {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    });
    response.end(JSON.stringify(playlist));
  } catch (error) {
    if (!error.status) console.error("Playlist API failed:", error.message);
    response.writeHead(error.status || 500, {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    });
    response.end(JSON.stringify({
      code: error.code || "INTERNAL_ERROR",
      error: error.status ? error.message : "Playlist load nahi ho payi.",
    }));
  }
}

const server = http.createServer(async (request, response) => {
  let url;
  try {
    url = new URL(request.url, `http://${request.headers.host || "localhost"}`);
  } catch {
    response.writeHead(400);
    return response.end("Invalid request.");
  }

  if (url.pathname === "/api/playlist") {
    return handlePlaylistApi(request, response, url);
  }

  if (request.method !== "GET" && request.method !== "HEAD") {
    response.writeHead(405, { allow: "GET, HEAD" });
    return response.end("Method not allowed.");
  }
  serveStatic(response, url.pathname);
});

server.listen(PORT, () => {
  console.log(`Music Player is listening at http://localhost:${PORT}`);
});
