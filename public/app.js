const homeScreen = document.querySelector("#home-screen");
const playlistScreen = document.querySelector("#playlist-screen");
const openPlaylistButton = document.querySelector("#open-playlist");
const backButton = document.querySelector("#back-button");
const form = document.querySelector("#playlist-form");
const urlInput = document.querySelector("#audio-url");
const titleInput = document.querySelector("#track-title");
const loadButton = document.querySelector("#load-button");
const listMessage = document.querySelector("#list-message");
const playerMessage = document.querySelector("#player-message");
const playlistTitle = document.querySelector("#playlist-title");
const playlistNote = document.querySelector("#playlist-note");
const queue = document.querySelector("#queue-list");
const trackCount = document.querySelector("#track-count");
const audioPlayer = document.querySelector("#audio-player");
const titleNode = document.querySelector("#now-title");
const artistNode = document.querySelector("#now-artist");
const coverImage = document.querySelector("#now-cover-image");
const playButton = document.querySelector("#play-button");
const previousButton = document.querySelector("#previous-button");
const nextButton = document.querySelector("#next-button");
const shuffleButton = document.querySelector("#shuffle-button");
const repeatButton = document.querySelector("#repeat-button");
const { parseAudioUrl, titleFromUrl } = window.AudioUtils;

const coverUrl = "/assets/headphones.png";
let playlist = { title: "Your audio playlist", tracks: [] };
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

function setPlaying(value) {
  playButton.classList.toggle("is-playing", value);
  playButton.setAttribute("aria-label", value ? "Pause" : "Play");
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
  coverImage.src = coverUrl;
  audioPlayer.pause();
  audioPlayer.src = track.url;
  audioPlayer.loop = repeatEnabled;
  audioPlayer.load();
  updateQueueSelection();
  playButton.disabled = false;
  previousButton.disabled = playlist.tracks.length < 2;
  nextButton.disabled = playlist.tracks.length < 2;
  showMessage(playerMessage, "");

  audioPlayer.play().catch(() => {
    if (audioPlayer.src !== track.url) return;
    setPlaying(false);
    showMessage(playerMessage, "Audio play nahi ho paya. URL, format, aur source permission check karein.");
  });
}

function renderQueue() {
  queue.replaceChildren();
  trackCount.textContent = `${playlist.tracks.length} ${playlist.tracks.length === 1 ? "track" : "tracks"}`;

  if (!playlist.tracks.length) {
    const empty = document.createElement("p");
    empty.className = "queue-empty";
    empty.textContent = "Add an authorized direct audio URL to get started.";
    queue.append(empty);
    return;
  }

  playlist.tracks.forEach((track, index) => {
    const row = document.createElement("button");
    row.className = "queue-row";
    row.type = "button";
    row.dataset.index = String(index);
    row.setAttribute("aria-label", `Play ${track.title}`);

    const number = document.createElement("span");
    number.className = "queue-index";
    number.textContent = String(index + 1);

    const image = document.createElement("img");
    image.className = "queue-thumb";
    image.src = coverUrl;
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
    queue.append(row);
  });

  updateQueueSelection();
}

function moveTrack(direction) {
  const tracks = playlist.tracks;
  if (tracks.length < 2 || currentIndex < 0) return;

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

form.addEventListener("submit", (event) => {
  event.preventDefault();
  showMessage(listMessage, "");

  let url;
  try {
    url = parseAudioUrl(urlInput.value.trim());
  } catch (error) {
    showMessage(listMessage, error.message);
    return;
  }

  const track = {
    url,
    title: titleInput.value.trim() || titleFromUrl(url),
    artist: "Direct audio",
  };
  playlist.tracks.push(track);
  playlistTitle.textContent = playlist.title;
  playlistNote.textContent = "Tracks are kept in this browser session. Use only audio you own or are authorized to play.";
  renderQueue();
  displayTrack(track, playlist.tracks.length - 1);
  showMessage(listMessage, "Audio added to your track list.", "success");
  urlInput.value = "";
  titleInput.value = "";
  showHome();
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
  audioPlayer.loop = repeatEnabled;
  repeatButton.setAttribute("aria-pressed", String(repeatEnabled));
  repeatButton.setAttribute("aria-label", `Repeat ${repeatEnabled ? "on" : "off"}`);
});

playButton.addEventListener("click", () => {
  if (!audioPlayer.src) return;
  if (audioPlayer.paused) {
    const source = audioPlayer.src;
    audioPlayer.play().catch(() => {
      if (audioPlayer.src !== source) return;
      showMessage(playerMessage, "Audio play nahi ho paya. URL, format, aur source permission check karein.");
    });
  } else {
    audioPlayer.pause();
  }
});

audioPlayer.addEventListener("play", () => setPlaying(true));
audioPlayer.addEventListener("pause", () => setPlaying(false));
audioPlayer.addEventListener("ended", () => {
  setPlaying(false);
  if (!repeatEnabled && currentIndex < playlist.tracks.length - 1) moveTrack(1);
});
audioPlayer.addEventListener("error", () => {
  setPlaying(false);
  showMessage(playerMessage, "Audio load nahi hua. Direct audio URL, supported format, aur access permission check karein.");
});

renderQueue();
