const assert = require("node:assert/strict");
const { test } = require("node:test");
const { parseAudioUrl, parseYouTubeUrl, titleFromUrl } = require("../public/audio-utils");

test("accepts direct HTTP and HTTPS audio source URLs", () => {
  assert.equal(parseAudioUrl("https://cdn.example.com/audio/song.mp3"), "https://cdn.example.com/audio/song.mp3");
  assert.equal(parseAudioUrl("http://radio.example.com/live"), "http://radio.example.com/live");
});

test("parses YouTube video, short, embed, and playlist URLs", () => {
  assert.deepEqual(parseYouTubeUrl("https://www.youtube.com/watch?v=EpdsVO9pt9g"), {
    type: "video",
    videoId: "EpdsVO9pt9g",
  });
  assert.deepEqual(parseYouTubeUrl("https://youtu.be/EpdsVO9pt9g?t=30"), {
    type: "video",
    videoId: "EpdsVO9pt9g",
  });
  assert.deepEqual(parseYouTubeUrl("https://www.youtube.com/shorts/EpdsVO9pt9g"), {
    type: "video",
    videoId: "EpdsVO9pt9g",
  });
  assert.deepEqual(parseYouTubeUrl("https://www.youtube.com/playlist?list=PL1234567890"), {
    type: "playlist",
    playlistId: "PL1234567890",
    videoId: null,
  });
  assert.deepEqual(parseYouTubeUrl("https://www.youtube.com/watch?v=EpdsVO9pt9g&list=PL1234567890"), {
    type: "playlist",
    playlistId: "PL1234567890",
    videoId: "EpdsVO9pt9g",
  });
});

test("rejects malformed YouTube links and ignores non-YouTube URLs", () => {
  assert.equal(parseYouTubeUrl("https://cdn.example.com/song.mp3"), null);
  assert.throws(() => parseYouTubeUrl("https://www.youtube.com/channel/music"), /YouTube video ya playlist/);
  assert.throws(() => parseYouTubeUrl("https://www.youtube.com/playlist?list=bad%20id"), /Valid YouTube playlist/);
});

test("rejects YouTube and googlevideo URLs as direct audio sources", () => {
  for (const url of [
    "https://www.youtube.com/watch?v=EpdsVO9pt9g",
    "https://youtu.be/EpdsVO9pt9g",
    "https://r1.googlevideo.com/audio",
  ]) {
    assert.throws(() => parseAudioUrl(url), /YouTube link ke liye YouTube player/);
  }
});

test("does not mistake lookalike hosts for YouTube", () => {
  assert.equal(
    parseAudioUrl("https://youtube.com.example.org/song.mp3"),
    "https://youtube.com.example.org/song.mp3"
  );
});

test("rejects non-HTTP protocols and malformed URLs", () => {
  assert.throws(() => parseAudioUrl("javascript:alert(1)"), /http ya https/);
  assert.throws(() => parseAudioUrl("not a URL"), /Valid direct audio URL/);
});

test("derives a readable title from the audio file name", () => {
  assert.equal(titleFromUrl("https://cdn.example.com/music/my-song%20live.mp3?token=abc"), "my song live");
});
