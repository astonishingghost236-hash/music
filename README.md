# Music Player

A simple audio-only player for direct audio URLs. It does not embed YouTube videos or extract audio from video links. Use only audio streams or files you own or are authorized to play.

## Run locally

1. Install Node.js 18 or newer.
2. Run `npm start` in this folder.
3. Open [http://localhost:3000](http://localhost:3000).
4. Open the track list, add a direct HTTP(S) audio URL, and optionally enter a title.

The browser plays the audio directly from its source. Playback depends on the URL being reachable and using a format supported by the browser. Track entries are kept only in the current page session; no audio is uploaded or stored by this app.

The YouTube Data API key is not needed by this player. Keep API keys private and never put them in frontend code or GitHub.
