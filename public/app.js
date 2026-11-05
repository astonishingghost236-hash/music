const form = document.querySelector("#playlist-form");
const input = document.querySelector("#playlist-url");
const loadButton = document.querySelector("#load-button");
const message = document.querySelector("#form-message");
const queue = document.querySelector("#queue-list");
const playlistTitle = document.querySelector("#playlist-title");
const trackCount = document.querySelector("#track-count");
const queueTotal = document.querySelector("#queue-total");
const placeholder = document.querySelector("#stage-placeholder");
const playerWrap = document.querySelector("#youtube-player-wrap");
const titleNode = document.querySelector("#now-title");
const artistNode = document.querySelector("#now-artist");
const coverNode = document.querySelector("#now-cover");
const playButton = document.querySelector("#play-button");
const previousButton = document.querySelector("#previous-button");
const nextButton = document.querySelector("#next-button");

let playlist = null;
let currentIndex = -1;
let isPlaying = false;

function showMessage(text, type = "error") {
  message.textContent = text;
  message.classList.toggle("success", type === "success");
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
  });
  return `https://www.youtube-nocookie.com/embed/videoseries?${params}`;
}

function setPlaying(value) {
  isPlaying = value;
  playButton.textContent = value ? "Pause" : "Play";
}

function setEmbed(src) {
  placeholder.hidden = true;
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

function displayTrack(track, index) {
  currentIndex = index;
  titleNode.textContent = track.title;
  artistNode.textContent = track.artist;
  coverNode.replaceChildren();
  const image = document.createElement("img");
  image.src = track.thumbnail;
  image.alt = "";
  image.onerror = () => {
    coverNode.replaceChildren();
  };
  coverNode.append(image);
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
    const empty = document.createElement("div");
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
    const numberText = document.createElement("span");
    numberText.textContent = String(index + 1).padStart(2, "0");
    number.append(numberText);

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
    row.addEventListener("click", () => displayTrack(track, index));
    row.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        displayTrack(track, index);
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
  queueTotal.textContent = "YOUTUBE PLAYLIST";
  queue.replaceChildren();
  const note = document.createElement("div");
  note.className = "queue-unavailable";
  note.textContent = "Add a YouTube API key to show track details.";
  queue.append(note);
  titleNode.textContent = "Your playlist is ready";
  artistNode.textContent = "Playing through YouTube";
  coverNode.replaceChildren();
  setEmbed(makePlaylistEmbedUrl(playlistId));
  setPlaying(true);
  playButton.disabled = false;
  previousButton.disabled = true;
  nextButton.disabled = true;
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const url = input.value.trim();
  loadButton.disabled = true;
  loadButton.querySelector("span:first-child").textContent = "Loading...";
  showMessage("");

  try {
    const response = await fetch(`/api/playlist?url=${encodeURIComponent(url)}`);
    const result = await response.json();
    if (response.status === 503 && result.code === "YOUTUBE_API_KEY_MISSING") {
      const parsed = new URL(url);
      const playlistId = parsed.searchParams.get("list");
      if (!playlistId) throw new Error("Sahi YouTube playlist link paste karein.");
      startFallback(playlistId);
      showMessage("Playlist player mein khul gayi. Track list ke liye YouTube API key set karein.", "success");
    } else if (!response.ok) {
      throw new Error(result.error || "Playlist load nahi ho payi.");
    } else {
      playlist = result;
      playlistTitle.textContent = result.title;
      trackCount.textContent = `${result.tracks.length} ${result.tracks.length === 1 ? "track" : "tracks"}`;
      queueTotal.textContent = `${result.tracks.length} tracks`;
      renderQueue();
      if (result.tracks.length) {
        displayTrack(result.tracks[0], 0);
        showMessage(`“${result.title}” is ready to play.`, "success");
      } else {
        playerWrap.replaceChildren();
        playerWrap.hidden = true;
        placeholder.hidden = false;
        titleNode.textContent = "No playable tracks found";
        artistNode.textContent = "Try another public playlist";
        coverNode.replaceChildren();
        currentIndex = -1;
        setPlaying(false);
        playButton.disabled = true;
        previousButton.disabled = true;
        nextButton.disabled = true;
        showMessage("Is playlist mein koi public, playable video nahi mila.");
      }
    }
    document.querySelector("#your-playlist").scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (error) {
    showMessage(error.message || "Playlist load nahi ho payi.");
  } finally {
    loadButton.disabled = false;
    loadButton.querySelector("span:first-child").textContent = "Load playlist";
  }
});

function moveTrack(direction) {
  if (!playlist?.tracks.length) return;
  const nextIndex = (currentIndex + direction + playlist.tracks.length) % playlist.tracks.length;
  displayTrack(playlist.tracks[nextIndex], nextIndex);
}

previousButton.addEventListener("click", () => moveTrack(-1));
nextButton.addEventListener("click", () => moveTrack(1));

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
