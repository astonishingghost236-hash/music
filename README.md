# Music Player

A simple, responsive YouTube playlist player. The player screen uses the supplied music background and control icons. Open the playlist screen to paste a YouTube link; playlist tracks and thumbnails load there, and selecting a track opens YouTube's official visible video player.

## Run locally

1. Install Node.js 18 or newer.
2. Run `npm start` in this folder.
3. Open [http://localhost:3000](http://localhost:3000).
4. Open the playlist button, paste a YouTube playlist link, then select a song from the list.

## YouTube API setup

The backend uses YouTube Data API v3 to retrieve public playlist names, songs, and thumbnails. For local development, set `YOUTUBE_API_KEY` in `.env` (see `.env.example`). For Vercel, add `YOUTUBE_API_KEY` under the project's Settings → Environment Variables, enable it for Production and Preview as needed, and redeploy. The key stays on the server and is not sent to the browser.

The provided `list=RD...` link is a YouTube Radio Mix. Radio Mixes are dynamic rather than ordinary playlists; the API can identify the starting video, but does not provide the full generated song list. The official YouTube player can continue the mix. Standard public playlists provide the complete track list.

No database is needed for this read-only public playlist lookup. The YouTube API response is shown in the browser and is not persisted.
