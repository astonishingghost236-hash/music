const homeScreen = document.querySelector("#home-screen");
const playlistScreen = document.querySelector("#playlist-screen");
const openPlaylistButton = document.querySelector("#open-playlist");
const backButton = document.querySelector("#back-button");
const form = document.querySelector("#playlist-form");
const input = document.querySelector("#playlist-url");
const loadButton = document.querySelector("#load-button");
const listMessage = document.querySelector("#list-message");
const playerMessage = document.querySelector("#player-message");
const queue = document.querySelector("#queue-list");
const playlistTitle = document.querySelector("#playlist-title");
const trackCount = document.querySelector("#track-count");
const stageCover = document.querySelector("#stage-cover");
const placeholder = document.querySelector("#stage-placeholder");
const playerWrap = document.querySelector("#youtube-player-wrap");
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
  input.focus();
}

function showHome() {
  playlistScreen.hidden = true;
  homeScreen.hidden = false;
}

function makeEmbedUrl(trackId, autoplay = true) {
  const params = new URLSearchParams({
    autoplay: autoplay ? "1" : "0",
    playsinline: "1",
    rel: "0",
    enablejsapi: "1",
    origin: window.location.origin,
  });
  return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(trackId)}?${params}`;
}

function makePlaylistEmbedUrl(id) {
  const params = new URLSearchParams({
    list: id,
    autoplay: "1",
    playsinline: "1",
    rel: "0",
    enablejsapi: "1",
    origin: window.location.origin,
  });
  return `https://www.youtube-nocookie.com/embed/videoseries?${params}`;
}

function setPlaying(value) {
  isPlaying = value;
  playButton.classList.toggle("is-playing", value);
  playButton.setAttribute("aria-label", value ? "Pause" : "Play");
}

function setEmbed(src) {
  placeholder.hidden = true;
  stageCover.hidden = true;
  playerWrap.hidden = false;
  playerWrap.replaceChildren();

  const iframe = document.createElement("iframe");
  iframe.src = src;
  iframe.title = "YouTube music player";
  iframe.allow = "autoplay; encrypted-media; picture-in-picture";
  iframe.allowFullscreen = true;
  iframe.referrerPolicy = "strict-origin-when-cross-origin";
  playerWrap.append(iframe);
}

function resetEmbed() {
  playerWrap.replaceChildren();
  playerWrap.hidden = true;
  stageCover.hidden = false;
  placeholder.hidden = true;
}

function displayTrack(track, index) {
  currentIndex = index;
  titleNode.textContent = track.title;
  artistNode.textContent = track.artist;
  coverImage.src = track.thumbnail;
  coverImage.alt = "";
  coverImage.onerror = () => {
    coverImage.src = "/assets/headphones.png";
    coverImage.alt = "";
  };
  setEmbed(makeEmbedUrl(track.id));
  setPlaying(true);
  updateQueueSelection();
  playButton.disabled = false;
  previousButton.disabled = playlist.tracks.length < 2;
  nextButton.disabled = playlist.tracks.length < 2;
}

function updateQueueSelection() {
  queue.querySelectorAll(".queue-row").forEach((row) => {
    const selected = Number(row.dataset.index) === currentIndex;
    row.classList.toggle("selected", selected);
    row.setAttribute("aria-current", selected ? "true" : "false");
  });
}

function renderQueue() {
  queue.replaceChildren();
  if (!playlist.tracks.length) {
    const empty = document.createElement("p");
    empty.className = "queue-unavailable";
    empty.textContent = "This playlist has no playable public videos.";
    queue.append(empty);
    return;
  }

  playlist.tracks.forEach((track, index) => {
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

function startFallback(playlistId) {
  playlist = null;
  currentIndex = -1;
  playlistTitle.textContent = "Your YouTube playlist";
  trackCount.textContent = "YouTube playlist";
  queue.replaceChildren();
  const note = document.createElement("p");
  note.className = "queue-unavailable";
  note.textContent = "Add a YouTube API key to show track details.";
  queue.append(note);
  titleNode.textContent = "Your playlist is ready";
  artistNode.textContent = "Playing through YouTube";
  coverImage.src = "/assets/headphones.png";
  coverImage.alt = "";
  setEmbed(makePlaylistEmbedUrl(playlistId));
  setPlaying(true);
  playButton.disabled = false;
  previousButton.disabled = true;
  nextButton.disabled = true;
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  loadButton.disabled = true;
  loadButton.querySelector("span").textContent = "Loading...";
  showMessage(listMessage, "");

  try {
    const response = await fetch(`/api/playlist?url=${encodeURIComponent(input.value.trim())}`);
    const result = await response.json();

    if (response.status === 503 && result.code === "YOUTUBE_API_KEY_MISSING") {
      const playlistId = new URL(input.value.trim()).searchParams.get("list");
      if (!playlistId) throw new Error("Please paste a valid YouTube playlist link.");
      startFallback(playlistId);
      showMessage(playerMessage, "Add a YouTube API key to show the full track list.", "success");
      showHome();
      return;
    }

    if (!response.ok) throw new Error(result.error || "Playlist load nahi ho payi.");

    playlist = result;
    playlistTitle.textContent = result.title;
    trackCount.textContent = `${result.tracks.length} ${result.tracks.length === 1 ? "song" : "songs"}`;
    renderQueue();
    if (!result.tracks.length) {
      resetEmbed();
      titleNode.textContent = "No playable songs";
      artistNode.textContent = "Try another public playlist";
      coverImage.src = "/assets/headphones.png";
      setPlaying(false);
      playButton.disabled = true;
      previousButton.disabled = true;
      nextButton.disabled = true;
      showMessage(listMessage, "This playlist does not contain any playable public videos.");
      return;
    }

    displayTrack(result.tracks[0], 0);
    showMessage(playerMessage, "", "success");
    showHome();
  } catch (error) {
    showMessage(listMessage, error.message || "Playlist load nahi ho payi.");
  } finally {
    loadButton.disabled = false;
    loadButton.querySelector("span").textContent = "Load playlist";
  }
});

function moveTrack(direction) {
  if (!playlist?.tracks.length) return;
  if (repeatEnabled && direction > 0) {
    displayTrack(playlist.tracks[currentIndex], currentIndex);
    return;
  }
  let nextIndex;
  if (shuffleEnabled && direction > 0 && playlist.tracks.length > 1) {
    do {
      nextIndex = Math.floor(Math.random() * playlist.tracks.length);
    } while (nextIndex === currentIndex);
  } else {
    nextIndex = (currentIndex + direction + playlist.tracks.length) % playlist.tracks.length;
  }
  displayTrack(playlist.tracks[nextIndex], nextIndex);
}

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
});

playButton.addEventListener("click", () => {
  const iframe = playerWrap.querySelector("iframe");
  if (!iframe) return;
  const command = isPlaying ? "pauseVideo" : "playVideo";
  iframe.contentWindow?.postMessage(JSON.stringify({ event: "command", func: command, args: [] }), "https://www.youtube-nocookie.com");
  setPlaying(!isPlaying);
});
