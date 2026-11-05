const assert = require("node:assert/strict");
const { test } = require("node:test");
const { parseAudioUrl, titleFromUrl } = require("../public/audio-utils");

test("accepts direct HTTP and HTTPS audio source URLs", () => {
  assert.equal(parseAudioUrl("https://cdn.example.com/audio/song.mp3"), "https://cdn.example.com/audio/song.mp3");
  assert.equal(parseAudioUrl("http://radio.example.com/live"), "http://radio.example.com/live");
});

test("rejects YouTube and googlevideo URLs", () => {
  for (const url of [
    "https://www.youtube.com/watch?v=EpdsVO9pt9g",
    "https://youtu.be/EpdsVO9pt9g",
    "https://r1.googlevideo.com/audio",
  ]) {
    assert.throws(() => parseAudioUrl(url), /YouTube video links supported nahi hain/);
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
