const assert = require("node:assert/strict");
const { test } = require("node:test");
const handler = require("../api/playlist");

function createResponse() {
  return {
    headers: {},
    statusCode: 200,
    setHeader(name, value) {
      this.headers[name] = value;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(value) {
      this.body = value;
      return this;
    },
  };
}

test("Vercel API rejects non-GET requests", async () => {
  const response = createResponse();
  await handler({ method: "POST", query: {} }, response);
  assert.equal(response.statusCode, 405);
  assert.equal(response.headers.Allow, "GET");
});

test("Vercel API reports a missing server-side YouTube API key", async () => {
  const originalKey = process.env.YOUTUBE_API_KEY;
  delete process.env.YOUTUBE_API_KEY;
  const response = createResponse();

  try {
    await handler({
      method: "GET",
      query: { url: "https://www.youtube.com/playlist?list=PLabcdefghij" },
    }, response);
  } finally {
    if (originalKey === undefined) delete process.env.YOUTUBE_API_KEY;
    else process.env.YOUTUBE_API_KEY = originalKey;
  }

  assert.equal(response.statusCode, 503);
  assert.equal(response.body.code, "YOUTUBE_API_KEY_MISSING");
});

test("Vercel API returns public playlist tracks and thumbnails", async () => {
  const originalKey = process.env.YOUTUBE_API_KEY;
  const originalFetch = global.fetch;
  process.env.YOUTUBE_API_KEY = "test-api-key";
  global.fetch = async (input) => {
    const url = new URL(input);
    const body = url.pathname.endsWith("/playlists")
      ? { items: [{ snippet: { title: "Public playlist" } }] }
      : {
        items: [{
          snippet: {
            resourceId: { videoId: "abcdefghijk" },
            title: "A song",
            videoOwnerChannelTitle: "An artist",
            thumbnails: { high: { url: "https://img.example/song.jpg" } },
          },
        }],
      };
    return { ok: true, status: 200, json: async () => body };
  };
  const response = createResponse();

  try {
    await handler({
      method: "GET",
      query: { url: "https://www.youtube.com/playlist?list=PLabcdefghij" },
    }, response);
  } finally {
    global.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.YOUTUBE_API_KEY;
    else process.env.YOUTUBE_API_KEY = originalKey;
  }

  assert.equal(response.statusCode, 200);
  assert.equal(response.body.title, "Public playlist");
  assert.equal(response.body.tracks[0].title, "A song");
  assert.equal(response.body.tracks[0].thumbnail, "https://img.example/song.jpg");
});
