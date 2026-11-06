# Music Player

A music player for YouTube videos and playlists using YouTube's official embedded player, plus direct audio URLs you own or are authorized to play. YouTube video and audio are not separated or downloaded.

## Run locally

1. Install Node.js 18 or newer.
2. Run `npm start` in this folder.
3. Open [http://localhost:3000](http://localhost:3000).
4. Open the track list and paste a YouTube video/playlist link or a direct HTTP(S) audio URL. A title is optional.

YouTube playback uses the official embedded player; video can be hidden only after pausing, and is shown again before playback resumes. Use the YouTube player settings menu to select video quality. Play/pause, stop, previous, and next are available in the app. YouTube playlists use the playlist controls and ordering provided by YouTube. Direct audio playback depends on the URL being reachable and using a format supported by the browser. Track entries are kept only in the current page session; no audio is uploaded or stored by this app.

Some YouTube videos cannot be embedded because of owner restrictions, age restrictions, or browser/network playback support. The player reports the error and offers a link to open that video on YouTube.

No YouTube Data API key is needed. Keep API keys private and never put them in frontend code or GitHub.
