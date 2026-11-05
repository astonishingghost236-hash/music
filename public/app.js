const homeScreen = document.querySelector("#home-screen");
const playlistScreen = document.querySelector("#playlist-screen");
const openPlaylistButton = document.querySelector("#open-playlist");
const backButton = document.querySelector("#back-button");
const form = document.querySelector("#playlist-form");
const titleInput = document.querySelector("#track-title");
const urlInput = document.querySelector("#audio-url");
const loadButton = document.querySelector("#load-button");
const listMessage = document.querySelector("#list-message");
const playerMessage = document.querySelector("#player-message");
const queue = document.querySelector("#queue-list");
const trackCount = document.querySelector("#track-count");
const titleNode = document.querySelector("#now-title");
const artistNode = document.querySelector("#now-artist");
const coverImage = document.querySelector("#now-cover-image");
const playButton = document.querySelector("#play-button");
const previousButton = document.querySelector("#previous-button");
const nextButton = document.querySelector("#next-button");
const shuffleButton = document.querySelector("#shuffle-button");
const repeatButton = document.querySelector("#repeat-button");
const audio = document.querySelector("#audio-player");

const tracks = [];
let currentIndex = -1;
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

function setPlaying(isPlaying) {
  playButton.classList.toggle("is-playing", isPlaying);
  playButton.setAttribute("aria-label", isPlaying ? "Pause" : "Play");
}

function getTrackTitle(url, suppliedTitle) {
  if (suppliedTitle.trim()) return suppliedTitle.trim();
  const fileName = new URL(url).pathname.split("/").filter(Boolean).pop();
  if (!fileName) return `Track ${tracks.length + 1}`;
  try {
    return decodeURIComponent(fileName).replace(/\.[^.]+$/, "") || `Track ${tracks.length + 1}`;
  } catch {
    return fileName.replace(/\.[^.]+$/, "") || `Track ${tracks.length + 1}`;
  }
}

async function playTrack(index) {
  const track = tracks[index];
  if (!track) return;

  currentIndex = index;
  titleNode.textContent = track.title;
  artistNode.textContent = "Direct audio";
  coverImage.onerror = () => {
    coverImage.src = "/assets/headphones.png";
    coverImage.onerror = null;
  };
  coverImage.src = "/assets/headphones.png";
  audio.src = track.url;
  audio.load();
  updateQueueSelection();
  playButton.disabled = false;
  previousButton.disabled = tracks.length < 2;
  nextButton.disabled = tracks.length < 2;

  try {
    await audio.play();
    setPlaying(true);
    showMessage(playerMessage, "");
  } catch (error) {
    setPlaying(false);
    showMessage(playerMessage, `Could not play this audio link: ${error.message || "check the link and file format."}`);
  }
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
  if (!tracks.length) {
    const empty = document.createElement("p");
    empty.className = "queue-empty";
    empty.textContent = "Your audio tracks will appear here.";
    queue.append(empty);
    trackCount.textContent = "No songs added";
    return;
  }

  trackCount.textContent = `${tracks.length} ${tracks.length === 1 ? "song" : "songs"}`;
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

    const cover = document.createElement("span");
    cover.className = "queue-thumb";
    cover.setAttribute("aria-hidden", "true");

    const copy = document.createElement("span");
    copy.className = "queue-track";
    const name = document.createElement("strong");
    name.textContent = track.title;
    const source = document.createElement("span");
    source.textContent = "Direct audio";
    copy.append(name, source);

    row.append(number, cover, copy);
    row.addEventListener("click", () => {
      playTrack(index);
      showHome();
    });
    row.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        playTrack(index);
        showHome();
      }
    });
    queue.append(row);
  });
}

function moveTrack(direction) {
  if (tracks.length < 2) return;
  let nextIndex;
  if (shuffleEnabled && direction > 0) {
    do {
      nextIndex = Math.floor(Math.random() * tracks.length);
    } while (nextIndex === currentIndex);
  } else {
    nextIndex = (currentIndex + direction + tracks.length) % tracks.length;
  }
  playTrack(nextIndex);
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  showMessage(listMessage, "");

  let url;
  try {
    url = new URL(urlInput.value.trim());
  } catch {
    showMessage(listMessage, "Enter a valid direct audio URL.");
    return;
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") {
    showMessage(listMessage, "Audio link must start with http:// or https://.");
    return;
  }

  const host = url.hostname.toLowerCase();
  if (host === "youtu.be" || host === "youtube.com" || host.endsWith(".youtube.com") || host === "youtube-nocookie.com" || host.endsWith(".youtube-nocookie.com")) {
    showMessage(listMessage, "YouTube pages are not direct audio files. Add a licensed audio file URL instead.");
    return;
  }

  if (/\.(mp4|m4v|mov|webm|mkv|avi)$/i.test(url.pathname)) {
    showMessage(listMessage, "Add a direct audio file URL, not a video file.");
    return;
  }

  const track = {
    title: getTrackTitle(url.href, titleInput.value),
    url: url.href,
  };
  tracks.push(track);
  renderQueue();
  titleInput.value = "";
  urlInput.value = "";
  showMessage(listMessage, "Song added. Select it from the list to play.", "success");
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
});

playButton.addEventListener("click", async () => {
  if (audio.paused) {
    try {
      await audio.play();
      showMessage(playerMessage, "");
    } catch (error) {
      showMessage(playerMessage, `Could not play this audio link: ${error.message || "check the link and file format."}`);
    }
  } else {
    audio.pause();
  }
});

audio.addEventListener("play", () => setPlaying(true));
audio.addEventListener("pause", () => setPlaying(false));
audio.addEventListener("error", () => {
  setPlaying(false);
  if (currentIndex >= 0) {
    showMessage(playerMessage, "Audio could not be loaded. Check the link, file permissions, and audio format.");
  }
});
audio.addEventListener("ended", () => {
  if (repeatEnabled && currentIndex >= 0) {
    audio.currentTime = 0;
    audio.play().catch((error) => {
      showMessage(playerMessage, `Could not repeat this audio: ${error.message}`);
    });
  } else if (currentIndex < tracks.length - 1 || shuffleEnabled) {
    moveTrack(1);
  } else {
    setPlaying(false);
  }
});
