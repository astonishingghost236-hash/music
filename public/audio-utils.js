(function attachAudioUtils(root, factory) {
  const utilities = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = utilities;
  } else {
    root.AudioUtils = utilities;
  }
}(globalThis, function createAudioUtils() {
  function parseYouTubeUrl(value) {
    let url;
    try {
      url = new URL(value);
    } catch {
      return null;
    }

    if (url.protocol !== "https:" && url.protocol !== "http:") return null;

    const host = url.hostname.toLowerCase();
    const isYouTube = host === "youtu.be"
      || host === "youtube.com"
      || host.endsWith(".youtube.com")
      || host === "youtube-nocookie.com"
      || host.endsWith(".youtube-nocookie.com");
    if (!isYouTube) return null;

    let videoId = url.searchParams.get("v");
    if (host === "youtu.be") {
      videoId = url.pathname.split("/").filter(Boolean)[0] || null;
    } else if (!videoId) {
      const pathParts = url.pathname.split("/").filter(Boolean);
      if (["embed", "shorts", "live", "v"].includes(pathParts[0])) {
        videoId = pathParts[1] || null;
      }
    }

    const playlistId = url.searchParams.get("list");
    if (playlistId) {
      if (!/^[\w-]+$/.test(playlistId)) {
        throw new Error("Valid YouTube playlist link paste karein.");
      }
      if (videoId && !/^[\w-]{11}$/.test(videoId)) {
        throw new Error("Valid YouTube video link paste karein.");
      }
      return { type: "playlist", playlistId, videoId };
    }

    if (videoId && /^[\w-]{11}$/.test(videoId)) {
      return { type: "video", videoId };
    }

    throw new Error("YouTube video ya playlist link paste karein.");
  }

  function parseAudioUrl(value) {
    let url;
    try {
      url = new URL(value);
    } catch {
      throw new Error("Valid direct audio URL paste karein.");
    }

    if (url.protocol !== "https:" && url.protocol !== "http:") {
      throw new Error("Audio URL http ya https se shuru hona chahiye.");
    }

    const host = url.hostname.toLowerCase();
    const isYouTube = host === "youtu.be"
      || host === "youtube.com"
      || host.endsWith(".youtube.com")
      || host === "youtube-nocookie.com"
      || host.endsWith(".youtube-nocookie.com")
      || host === "googlevideo.com"
      || host.endsWith(".googlevideo.com");
    if (isYouTube) {
      throw new Error("YouTube link ke liye YouTube player use karein.");
    }

    return url.href;
  }

  function titleFromUrl(value) {
    const url = new URL(value);
    const filename = url.pathname.split("/").filter(Boolean).pop();
    if (!filename) return url.hostname;

    let title = filename;
    try {
      title = decodeURIComponent(filename);
    } catch {
      title = filename;
    }
    return title.replace(/\.[a-z0-9]{2,5}$/i, "").replace(/[-_]+/g, " ") || url.hostname;
  }

  return { parseAudioUrl, parseYouTubeUrl, titleFromUrl };
}));
