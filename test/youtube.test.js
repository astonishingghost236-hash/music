const assert = require("node:assert/strict");
const { afterEach, test } = require("node:test");
const { getPlaylist, parsePlaylistUrl } = require("../lib/youtube");

const originalFetch = global.fetch;

afterEach(() => {
  global.fetch = originalFetch;
});

test("parses standard playlist links with a seed video", () => {
  const parsed = parsePlaylistUrl(
    "https://www.youtube.com/watch?v=EpdsVO9pt9g&list=PLabcdefghij"
  );
  assert.deepEqual(parsed, {
    playlistId: "PLabcdefghij",
    isRadioMix: false,
    seedVideoId: "EpdsVO9pt9g",
  });
});

test("recognizes radio mix playlist links", () => {
  const parsed = parsePlaylistUrl(
    "https://www.youtube.com/watch?v=EpdsVO9pt9g&list=RDEpdsVO9pt9g&start_radio=1"
  );
  assert.deepEqual(parsed, {
    playlistId: "RDEpdsVO9pt9g",
    isRadioMix: true,
    seedVideoId: "EpdsVO9pt9g",
  });
});

test("rejects links from lookalike domains", () => {
  assert.throws(
    () => parsePlaylistUrl("https://youtube.com.example.org/playlist?list=PLabcdefghij"),
    { code: "INVALID_PLAYLIST_URL", status: 400 }
  );
});

test("reports a missing API key without making a network request", async () => {
  let called = false;
  global.fetch = async () => {
    called = true;
    throw new Error("Unexpected request");
  };

  await assert.rejects(
    getPlaylist("https://www.youtube.com/playlist?list=PLabcdefghij", ""),
    { code: "YOUTUBE_API_KEY_MISSING", status: 503 }
  );
  assert.equal(called, false);
});

test("loads every page of a standard playlist with thumbnails", async () => {
  const requests = [];
  global.fetch = async (input) => {
    const url = new URL(input);
    requests.push(url);
    let result;
    if (url.pathname.endsWith("/playlists")) {
      result = { items: [{ snippet: { title: "Test playlist" } }] };
    } else if (url.searchParams.get("pageToken") === "next") {
      result = {
        items: [{
          snippet: {
            resourceId: { videoId: "secondvideo1" },
            title: "Second song",
            videoOwnerChannelTitle: "Second artist",
            thumbnails: { high: { url: "https://img.example/second.jpg" } },
          },
        }],
      };
    } else {
      result = {
        nextPageToken: "next",
        items: [{
          snippet: {
            resourceId: { videoId: "firstvideo01" },
            title: "First song",
            videoOwnerChannelTitle: "First artist",
            thumbnails: { medium: { url: "https://img.example/first.jpg" } },
          },
        }],
      };
    }

    return { ok: true, status: 200, json: async () => result };
  };

  const playlist = await getPlaylist(
    "https://www.youtube.com/playlist?list=PLabcdefghij",
    "test-api-key"
  );

  assert.equal(playlist.title, "Test playlist");
  assert.equal(playlist.kind, "playlist");
  assert.equal(playlist.tracks.length, 2);
  assert.deepEqual(playlist.tracks.map((track) => track.title), ["First song", "Second song"]);
  assert.equal(playlist.tracks[0].thumbnail, "https://img.example/first.jpg");
  assert.equal(requests.length, 3);
  assert.ok(requests.every((url) => url.searchParams.get("key") === "test-api-key"));
});

test("loads the seed video for a dynamic radio mix", async () => {
  let requestUrl;
  global.fetch = async (input) => {
    requestUrl = new URL(input);
    return {
      ok: true,
      status: 200,
      json: async () => ({
        items: [{
          id: "EpdsVO9pt9g",
          snippet: {
            title: "Starting song",
            channelTitle: "Artist",
            thumbnails: { high: { url: "https://img.example/radio.jpg" } },
          },
        }],
      }),
    };
  };

  const playlist = await getPlaylist(
    "https://www.youtube.com/watch?v=EpdsVO9pt9g&list=RDEpdsVO9pt9g",
    "test-api-key"
  );

  assert.equal(requestUrl.pathname, "/youtube/v3/videos");
  assert.equal(requestUrl.searchParams.get("id"), "EpdsVO9pt9g");
  assert.equal(playlist.kind, "radio-mix");
  assert.equal(playlist.tracks[0].title, "Starting song");
});
