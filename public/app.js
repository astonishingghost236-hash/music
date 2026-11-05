const homeScreen = document.querySelector("#home-screen");
const playlistScreen = document.querySelector("#playlist-screen");
const openPlaylistButton = document.querySelector("#open-playlist");
const backButton = document.querySelector("#back-button");
const form = document.querySelector("#playlist-form");
const urlInput = document.querySelector("#playlist-url");
const loadButton = document.querySelector("#load-button");
const listMessage = document.querySelector("#list-message");
const playerMessage = document.querySelector("#player-message");
const playlistTitle = document.querySelector("#playlist-title");
const playlistNote = document.querySelector("#playlist-note");
const queue = document.querySelector("#queue-list");
const trackCount = document.querySelector("#track-count");
const playerWrap = document.querySelector("#youtube-player-wrap");
const stageCover = document.querySelector("#stage-cover");
const titleNode = document.querySelector("#now-title");
const artistNode = document.querySelector("#now-artist");
const coverImage = document.querySelector("#now-cover-image");
const playButton = document.querySelector("#play-button");
const previousButton = document.querySelector("#previous-button");
const nextButton = document.querySelector("#next-button");
const shuffleButton = document.querySelector("#shuffle-button");
const repeatButton = document.querySelector("#repeat-button");

let playlist = null;
let currentIndex = -1;
let isPlaying = false;
let shuffleEnabled = false;
let repeatEnabled = false;

function showMessage(node, text, type = "error") {
  node.textContent = text;
  node.classList.toggle("success", type === "success");
}

function showPlaylist() {
  homeScreen.hidden = true;
  playlistScreen.hidden = false;
  urlInput.focus();
}

function showHome() {
  playlistScreen.hidden = true;
  homeScreen.hidden = false;
}

function setPlaying(value) {
  isPlaying = value;
  playButton.classList.toggle("is-playing", value);
  playButton.setAttribute("aria-label", value ? "Pause" : "Play");
}

function parsePlaylistLink(value) {
  const url = new URL(value);
  const host = url.hostname.toLowerCase();
  const isYouTube = host === "youtu.be"
    || host === "youtube.com"
    || host.endsWith(".youtube.com")
    || host === "youtube-nocookie.com"
    || host.endsWith(".youtube-nocookie.com");
  if (!isYouTube) throw new Error("YouTube playlist link paste karein.");

  const id = url.searchParams.get("list");
  if (!id || !/^[A-Za-z0-9_-]{10,100}$/.test(id)) {
    throw new Error("Link mein YouTube playlist nahi mili.");
  }

  const isRadioMix = id.startsWith("RD");
  const videoId = url.searchParams.get("v")
    || (host === "youtu.be" ? url.pathname.slice(1).split("/")[0] : "");
  const seedVideoId = /^[A-Za-z0-9_-]{11}$/.test(videoId)
    ? videoId
    : isRadioMix && /^[A-Za-z0-9_-]{11}$/.test(id.slice(2))
      ? id.slice(2)
      : null;

  return { id, isRadioMix, seedVideoId };
}

function makeEmbedUrl(track) {
  const params = new URLSearchParams({
    autoplay: "1",
    playsinline: "1",
    rel: "0",
    enablejsapi: "1",
    origin: window.location.origin,
  });
  if (repeatEnabled) {
    params.set("loop", "1");
    params.set("playlist", playlist?.kind === "radio-mix" || playlist?.embedPlaylist
      ? playlist.id
      : track.id);
  }
  if (playlist?.kind === "radio-mix" || playlist?.embedPlaylist) {
    params.set("list", playlist.id);
    return `https://www.youtube-nocookie.com/embed/videoseries?${params}`;
  }
  return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(track.id)}?${params}`;
}

function setEmbed(track) {
  stageCover.hidden = true;
  playerWrap.replaceChildren();
  playerWrap.hidden = false;

  const iframe = document.createElement("iframe");
  iframe.src = makeEmbedUrl(track);
  iframe.title = `YouTube player: ${track.title}`;
  iframe.allow = "autoplay; encrypted-media; picture-in-picture";
  iframe.allowFullscreen = true;
  iframe.referrerPolicy = "strict-origin-when-cross-origin";
  playerWrap.append(iframe);
}

function updateQueueSelection() {
  queue.querySelectorAll(".queue-row").forEach((row) => {
    const selected = Number(row.dataset.index) === currentIndex;
    row.classList.toggle("selected", selected);
    row.setAttribute("aria-current", selected ? "true" : "false");
  });
}

function displayTrack(track, index) {
  currentIndex = index;
  titleNode.textContent = track.title;
  artistNode.textContent = track.artist;
  coverImage.onerror = () => {
    coverImage.src = "/assets/headphones.png";
    coverImage.onerror = null;
  };
  coverImage.src = track.thumbnail;
  setEmbed(track);
  setPlaying(true);
  updateQueueSelection();
  playButton.disabled = false;
  previousButton.disabled = playlist.tracks.length < 2;
  nextButton.disabled = playlist.tracks.length < 2;
  showMessage(playerMessage, "");
}

function renderQueue() {
  queue.replaceChildren();
  const tracks = playlist.tracks;

  if (!tracks.length) {
    const empty = document.createElement("p");
    empty.className = "queue-empty";
    empty.textContent = "Playlist mein koi playable public video nahi mili.";
    queue.append(empty);
    trackCount.textContent = "0 songs";
    return;
  }

  trackCount.textContent = playlist.kind === "radio-mix"
    ? "Dynamic radio mix"
    : playlist.embedPlaylist
      ? "YouTube playlist"
    : `${tracks.length} ${tracks.length === 1 ? "song" : "songs"}`;

  tracks.forEach((track, index) => {
    const row = document.createElement("div");
    row.className = "queue-row";
    row.dataset.index = String(index);
    row.setAttribute("role", "button");
    row.setAttribute("tabindex", "0");
    row.setAttribute("aria-label", `Play ${track.title}`);

    const number = document.createElement("span");
    number.className = "queue-index";
    number.textContent = String(index + 1);

    const image = document.createElement("img");
    image.className = "queue-thumb";
    image.src = track.thumbnail;
    image.alt = "";
    image.loading = "lazy";
    image.onerror = () => {
      image.src = "/assets/headphones.png";
      image.onerror = null;
    };

    const copy = document.createElement("span");
    copy.className = "queue-track";
    const name = document.createElement("strong");
    name.textContent = track.title;
    const artist = document.createElement("span");
    artist.textContent = track.artist;
    copy.append(name, artist);

    row.append(number, image, copy);
    row.addEventListener("click", () => {
      displayTrack(track, index);
      showHome();
    });
    row.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        displayTrack(track, index);
        showHome();
      }
    });
    queue.append(row);
  });
}

function startWithoutApiKey(parsed) {
  const seedId = parsed.seedVideoId;
  const track = seedId
    ? {
      id: seedId,
      title: parsed.isRadioMix ? "Play YouTube Radio Mix" : "Open playlist on YouTube",
      artist: "Official YouTube player",
      thumbnail: `https://i.ytimg.com/vi/${encodeURIComponent(seedId)}/hqdefault.jpg`,
    }
    : null;

  playlist = {
    id: parsed.id,
    title: parsed.isRadioMix ? "YouTube Radio Mix" : "Your YouTube playlist",
    kind: parsed.isRadioMix ? "radio-mix" : "playlist",
    embedPlaylist: true,
    tracks: [track || {
      id: parsed.id,
      title: "Play full playlist on YouTube",
      artist: "Official YouTube playlist player",
      thumbnail: "/assets/headphones.png",
    }],
  };
  playlistTitle.textContent = playlist.title;
  playlistNote.textContent = parsed.isRadioMix
    ? "Radio Mix ki fixed track list YouTube API se available nahi hoti. Neeche starting song dikhaya hai; playback YouTube par chalta rahega."
    : "Song names aur thumbnails dikhane ke liye Vercel par YOUTUBE_API_KEY set karein. Official YouTube playlist player phir bhi kaam karega.";
  renderQueue();
  displayTrack(playlist.tracks[0], 0);
  showMessage(playerMessage, "Track list aur thumbnails ke liye server par YOUTUBE_API_KEY set karein.", "success");
  showHome();
}

function moveTrack(direction) {
  const tracks = playlist?.tracks;
  if (!tracks || tracks.length < 2) return;

  let nextIndex;
  if (shuffleEnabled && direction > 0) {
    do {
      nextIndex = Math.floor(Math.random() * tracks.length);
    } while (nextIndex === currentIndex);
  } else {
    nextIndex = (currentIndex + direction + tracks.length) % tracks.length;
  }
  displayTrack(tracks[nextIndex], nextIndex);
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  loadButton.disabled = true;
  loadButton.querySelector("span").textContent = "Loading...";
  showMessage(listMessage, "");
  playlistNote.textContent = "";

  const value = urlInput.value.trim();
  let parsed;
  try {
    parsed = parsePlaylistLink(value);
  } catch (error) {
    showMessage(listMessage, error.message);
    loadButton.disabled = false;
    loadButton.querySelector("span").textContent = "Load playlist";
    return;
  }

  try {
    const response = await fetch(`/api/playlist?url=${encodeURIComponent(value)}`);
    const result = await response.json();

    if (response.status === 503 && result.code === "YOUTUBE_API_KEY_MISSING") {
      startWithoutApiKey(parsed);
      return;
    }
    if (!response.ok) throw new Error(result.error || "Playlist load nahi ho payi.");

    playlist = result;
    playlistTitle.textContent = result.title;
    playlistNote.textContent = result.kind === "radio-mix"
      ? "YouTube Radio Mix dynamic hota hai. API se uska starting song aur thumbnail milta hai; baaki songs YouTube player ke andar chalte hain."
      : "";
    renderQueue();
    if (result.tracks.length) {
      displayTrack(result.tracks[0], 0);
      showHome();
    } else {
      playerWrap.replaceChildren();
      playerWrap.hidden = true;
      stageCover.hidden = false;
      titleNode.textContent = "No playable songs";
      artistNode.textContent = "Try another public playlist";
      playButton.disabled = true;
      previousButton.disabled = true;
      nextButton.disabled = true;
      showMessage(listMessage, "Is playlist mein public, playable video nahi mili.");
    }
  } catch (error) {
    showMessage(listMessage, error.message || "Playlist load nahi ho payi.");
  } finally {
    loadButton.disabled = false;
    loadButton.querySelector("span").textContent = "Load playlist";
  }
});

openPlaylistButton.addEventListener("click", showPlaylist);
backButton.addEventListener("click", showHome);
previousButton.addEventListener("click", () => moveTrack(-1));
nextButton.addEventListener("click", () => moveTrack(1));

shuffleButton.addEventListener("click", () => {
  shuffleEnabled = !shuffleEnabled;
  shuffleButton.setAttribute("aria-pressed", String(shuffleEnabled));
  shuffleButton.setAttribute("aria-label", `Shuffle ${shuffleEnabled ? "on" : "off"}`);
});

repeatButton.addEventListener("click", () => {
  repeatEnabled = !repeatEnabled;
  repeatButton.setAttribute("aria-pressed", String(repeatEnabled));
  repeatButton.setAttribute("aria-label", `Repeat ${repeatEnabled ? "on" : "off"}`);
  const track = playlist?.tracks[currentIndex];
  if (track) setEmbed(track);
});

playButton.addEventListener("click", () => {
  const iframe = playerWrap.querySelector("iframe");
  if (!iframe) return;
  const command = isPlaying ? "pauseVideo" : "playVideo";
  iframe.contentWindow?.postMessage(JSON.stringify({
    event: "command",
    func: command,
    args: [],
  }), "https://www.youtube-nocookie.com");
  setPlaying(!isPlaying);
});
