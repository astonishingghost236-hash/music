function createError(status, code, message) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  return error;
}

function parsePlaylistUrl(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw createError(400, "INVALID_PLAYLIST_URL", "Valid YouTube playlist link paste karein.");
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw createError(400, "INVALID_PLAYLIST_URL", "YouTube link http ya https se shuru hona chahiye.");
  }

  const host = url.hostname.toLowerCase();
  const isYouTube = host === "youtu.be"
    || host === "youtube.com"
    || host.endsWith(".youtube.com")
    || host === "youtube-nocookie.com"
    || host.endsWith(".youtube-nocookie.com");
  if (!isYouTube) {
    throw createError(400, "INVALID_PLAYLIST_URL", "YouTube playlist link paste karein.");
  }

  const playlistId = url.searchParams.get("list");
  if (!playlistId || !/^[A-Za-z0-9_-]{10,100}$/.test(playlistId)) {
    throw createError(400, "INVALID_PLAYLIST_URL", "Link mein YouTube playlist nahi mili.");
  }

  const videoId = url.searchParams.get("v")
    || (host === "youtu.be" ? url.pathname.slice(1).split("/")[0] : "");
  const isRadioMix = playlistId.startsWith("RD");
  const seedVideoId = /^[A-Za-z0-9_-]{11}$/.test(videoId)
    ? videoId
    : isRadioMix && /^[A-Za-z0-9_-]{11}$/.test(playlistId.slice(2))
      ? playlistId.slice(2)
      : null;

  return { playlistId, isRadioMix, seedVideoId };
}

async function youtubeRequest(endpoint, params, apiKey) {
  const url = new URL(`https://www.googleapis.com/youtube/v3/${endpoint}`);
  for (const [key, value] of Object.entries(params)) {
    if (value) url.searchParams.set(key, value);
  }
  url.searchParams.set("key", apiKey);

  let response;
  try {
    response = await fetch(url, { signal: AbortSignal.timeout(15000) });
  } catch (error) {
    console.error("YouTube API request failed:", error.message);
    throw createError(502, "YOUTUBE_API_UNAVAILABLE", "YouTube se connect nahi ho paya. Thodi der baad try karein.");
  }

  let body;
  try {
    body = await response.json();
  } catch {
    throw createError(502, "YOUTUBE_API_INVALID_RESPONSE", "YouTube ne samajh na aane wala response bheja.");
  }

  if (!response.ok) {
    const reason = body.error?.errors?.[0]?.reason;
    if (reason === "quotaExceeded" || reason === "dailyLimitExceeded") {
      throw createError(503, "YOUTUBE_QUOTA_EXCEEDED", "YouTube API quota khatam ho gaya. Baad mein dobara try karein.");
    }
    if (response.status === 403) {
      throw createError(502, "YOUTUBE_API_FORBIDDEN", "YouTube API key, API access, ya quota check karein.");
    }
    throw createError(502, "YOUTUBE_API_ERROR", "YouTube playlist load nahi ho payi. Playlist public hai ya nahi check karein.");
  }

  return body;
}

function getThumbnail(thumbnails, videoId) {
  const thumbnail = thumbnails?.maxres
    || thumbnails?.standard
    || thumbnails?.high
    || thumbnails?.medium
    || thumbnails?.default;
  return thumbnail?.url || `https://i.ytimg.com/vi/${encodeURIComponent(videoId)}/hqdefault.jpg`;
}

async function getPlaylist(value, apiKey) {
  const parsed = parsePlaylistUrl(value);
  if (!apiKey) {
    throw createError(
      503,
      "YOUTUBE_API_KEY_MISSING",
      "Vercel settings mein YOUTUBE_API_KEY set karke redeploy karein."
    );
  }

  if (parsed.isRadioMix) {
    if (!parsed.seedVideoId) {
      throw createError(400, "RADIO_MIX_SEED_MISSING", "Is YouTube Radio Mix se starting video nahi mili.");
    }

    const result = await youtubeRequest("videos", {
      part: "snippet",
      id: parsed.seedVideoId,
    }, apiKey);
    const item = result.items?.[0];
    if (!item) {
      throw createError(404, "VIDEO_NOT_FOUND", "Radio Mix ka starting video nahi mila.");
    }

    return {
      id: parsed.playlistId,
      title: item.snippet?.title || "YouTube Radio Mix",
      kind: "radio-mix",
      tracks: [{
        id: item.id,
        title: item.snippet?.title || "Radio Mix starting song",
        artist: item.snippet?.channelTitle || "YouTube",
        thumbnail: getThumbnail(item.snippet?.thumbnails, item.id),
      }],
    };
  }

  const playlistResult = await youtubeRequest("playlists", {
    part: "snippet",
    id: parsed.playlistId,
    maxResults: "1",
  }, apiKey);
  const playlistItem = playlistResult.items?.[0];
  if (!playlistItem) {
    throw createError(404, "PLAYLIST_NOT_FOUND", "Playlist nahi mili, ya woh public nahi hai.");
  }

  const tracks = [];
  let pageToken;
  do {
    const page = await youtubeRequest("playlistItems", {
      part: "snippet,contentDetails",
      playlistId: parsed.playlistId,
      maxResults: "50",
      pageToken,
    }, apiKey);

    for (const item of page.items || []) {
      const videoId = item.snippet?.resourceId?.videoId;
      if (!videoId) continue;

      tracks.push({
        id: videoId,
        title: item.snippet?.title || "Untitled video",
        artist: item.snippet?.videoOwnerChannelTitle || "YouTube",
        thumbnail: getThumbnail(item.snippet?.thumbnails, videoId),
      });
    }
    pageToken = page.nextPageToken;
  } while (pageToken);

  return {
    id: parsed.playlistId,
    title: playlistItem.snippet?.title || "YouTube playlist",
    kind: "playlist",
    tracks,
  };
}

module.exports = { getPlaylist, parsePlaylistUrl };
