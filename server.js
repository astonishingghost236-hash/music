const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = __dirname;
const PUBLIC_DIR = path.join(ROOT, "public");
const PORT = Number(process.env.PORT) || 3000;

function loadLocalEnv() {
  const envFile = path.join(ROOT, ".env");
  if (!fs.existsSync(envFile)) return;

  for (const line of fs.readFileSync(envFile, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (match && process.env[match[1]] === undefined) {
      process.env[match[1]] = match[2].replace(/^(['"])(.*)\1$/, "$2");
    }
  }
}

loadLocalEnv();

const MIME_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".png": "image/png",
};

function sendJson(response, status, value) {
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  });
  response.end(JSON.stringify(value));
}

function getPlaylistId(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    return null;
  }

  const host = url.hostname.toLowerCase();
  const isYouTube = host === "youtube.com" || host.endsWith(".youtube.com") || host === "youtu.be";
  if (!isYouTube) return null;

  const playlistId = url.searchParams.get("list");
  return playlistId && /^[A-Za-z0-9_-]{10,100}$/.test(playlistId) ? playlistId : null;
}

async function youtubeRequest(endpoint, params) {
  const url = new URL(`https://www.googleapis.com/youtube/v3/${endpoint}`);
  for (const [key, value] of Object.entries(params)) {
    if (value) url.searchParams.set(key, value);
  }
  url.searchParams.set("key", process.env.YOUTUBE_API_KEY);

  const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
  const body = await response.json();
  if (!response.ok) {
    const reason = body.error?.errors?.[0]?.reason;
    const message = reason === "playlistNotFound" || response.status === 404
      ? "Playlist nahi mili, ya woh public nahi hai."
      : `YouTube API ne request reject ki (HTTP ${response.status}). API key aur quota check karein.`;
    const error = new Error(message);
    error.status = 502;
    throw error;
  }
  return body;
}

async function getPlaylist(playlistId) {
  const playlist = await youtubeRequest("playlists", {
    part: "snippet",
    id: playlistId,
    maxResults: "1",
  });

  if (!playlist.items?.length) {
    const error = new Error("Playlist nahi mili, ya woh public nahi hai.");
    error.status = 404;
    throw error;
  }

  const tracks = [];
  let pageToken;
  do {
    const page = await youtubeRequest("playlistItems", {
      part: "snippet,contentDetails",
      playlistId,
      maxResults: "50",
      pageToken,
    });

    for (const item of page.items || []) {
      const videoId = item.snippet?.resourceId?.videoId;
      if (!videoId) continue;

      const thumbnails = item.snippet.thumbnails || {};
      const thumbnail = thumbnails.maxres || thumbnails.high || thumbnails.medium || thumbnails.default;
      tracks.push({
        id: videoId,
        title: item.snippet.title || "Untitled video",
        artist: item.snippet.videoOwnerChannelTitle || "YouTube",
        thumbnail: thumbnail?.url || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
      });
    }
    pageToken = page.nextPageToken;
  } while (pageToken);

  return {
    id: playlistId,
    title: playlist.items[0].snippet.title,
    tracks,
  };
}

async function handleApi(request, response, url) {
  if (url.pathname === "/api/health") {
    return sendJson(response, 200, { youtubeConfigured: Boolean(process.env.YOUTUBE_API_KEY) });
  }

  if (url.pathname !== "/api/playlist" || request.method !== "GET") {
    return sendJson(response, 404, { error: "API route nahi mila." });
  }

  const playlistId = getPlaylistId(url.searchParams.get("url") || "");
  if (!playlistId) {
    return sendJson(response, 400, { error: "Sahi YouTube playlist link paste karein." });
  }
  if (!process.env.YOUTUBE_API_KEY) {
    return sendJson(response, 503, {
      code: "YOUTUBE_API_KEY_MISSING",
      error: "Playlist ke gaane aur thumbnails dikhane ke liye YouTube Data API key set karein.",
    });
  }

  try {
    return sendJson(response, 200, await getPlaylist(playlistId));
  } catch (error) {
    console.error("Playlist lookup failed:", error.message);
    return sendJson(response, error.status || 502, {
      error: error.status ? error.message : "YouTube se playlist load nahi ho payi. Internet aur API key check karein.",
    });
  }
}

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

const server = http.createServer((request, response) => {
  let url;
  try {
    url = new URL(request.url, `http://${request.headers.host || "localhost"}`);
  } catch {
    response.writeHead(400);
    return response.end("Invalid request.");
  }

  if (url.pathname.startsWith("/api/")) {
    return handleApi(request, response, url);
  }
  if (request.method !== "GET" && request.method !== "HEAD") {
    response.writeHead(405, { allow: "GET, HEAD" });
    return response.end("Method not allowed.");
  }
  serveStatic(response, url.pathname);
});

server.listen(PORT, () => {
  console.log(`Nocturne is listening at http://localhost:${PORT}`);
});
