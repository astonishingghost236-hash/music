# Music Player

A simple, responsive YouTube playlist player built with a dependency-free Node.js backend and browser frontend. The player screen uses the supplied music background and control icons; a separate playlist screen opens from the playlist button and returns to the player with Back.

## Run locally

1. Install Node.js 18 or newer.
2. Run `npm start` in this folder.
3. Open [http://localhost:3000](http://localhost:3000).
4. Paste a public YouTube playlist URL.

The official YouTube embedded player works without an API key. To also show every track and its thumbnail in the custom queue, enable **YouTube Data API v3** in a Google Cloud project, copy `.env.example` to `.env`, and set `YOUTUBE_API_KEY` to your key. Restart the server after changing `.env`.

The backend uses the YouTube Data API to read public playlist metadata. Playback stays in YouTube's embedded player; audio is not downloaded, extracted, or re-hosted. Some videos may be unavailable because of their privacy, region, or embedding settings.
