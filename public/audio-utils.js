(function attachAudioUtils(root, factory) {
  const utilities = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = utilities;
  } else {
    root.AudioUtils = utilities;
  }
}(globalThis, function createAudioUtils() {
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
      throw new Error("YouTube video links supported nahi hain. Authorized direct audio URL use karein.");
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

  return { parseAudioUrl, titleFromUrl };
}));
