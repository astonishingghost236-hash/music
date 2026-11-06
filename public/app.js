const homeScreen = document.querySelector("#home-screen");
const playlistScreen = document.querySelector("#playlist-screen");
const openPlaylistButton = document.querySelector("#open-playlist");
const backButton = document.querySelector("#back-button");
const form = document.querySelector("#playlist-form");
const urlInput = document.querySelector("#audio-url");
const titleInput = document.querySelector("#track-title");
const listMessage = document.querySelector("#list-message");
const playerMessage = document.querySelector("#player-message");
const playlistTitle = document.querySelector("#playlist-title");
const playlistNote = document.querySelector("#playlist-note");
const queue = document.querySelector("#queue-list");
const trackCount = document.querySelector("#track-count");
const audioPlayer = document.querySelector("#audio-player");
const youtubePlayerContainer = document.querySelector("#youtube-player-container");
const stageCover = document.querySelector("#stage-cover");
const sourceLabel = document.querySelector("#source-label");
const qualityNote = document.querySelector("#quality-note");
const videoToggleButton = document.querySelector("#video-toggle");
const titleNode = document.querySelector("#now-title");
const artistNode = document.querySelector("#now-artist");
const coverImage = document.querySelector("#now-cover-image");
const playButton = document.querySelector("#play-button");
const stopButton = document.querySelector("#stop-button");
const previousButton = document.querySelector("#previous-button");
const nextButton = document.querySelector("#next-button");
const shuffleButton = document.querySelector("#shuffle-button");
const repeatButton = document.querySelector("#repeat-button");
const { parseAudioUrl, parseYouTubeUrl, titleFromUrl } = window.AudioUtils;

const coverUrl = "/assets/headphones.png";
let playlist = { title: "Your audio playlist", tracks: [] };
let currentTrack = null;
let currentIndex = -1;
let activeMode = null;
let shuffleEnabled = false;
let repeatEnabled = false;
let youtubeApiPromise;
let youtubePlayerPromise;
let youtubePlayer;
let youtubePlayerReady = false;
let pendingPlaylistVideoId = null;

function showMessage(node, text, type = "error") {
  node.textContent = text;
  node.classList.toggle("success", type === "success");
}

function showPlaylist() {
  if (activeMode === "youtube" && youtubePlayerReady && youtubePlayer.getPlayerState() === 1) {
    youtubePlayer.pauseVideo();
  }
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

function setYouTubeVideoVisible(visible) {
  youtubePlayerContainer.hidden = !visible;
  qualityNote.hidden = !visible;
  videoToggleButton.textContent = visible ? "Hide video" : "Show video";
}

function updateNavigationControls() {
  const canNavigate = activeMode === "youtube"
    ? youtubePlayerReady && (currentTrack?.type === "youtube-playlist" || playlist.tracks.length > 1)
    : playlist.tracks.length > 1;
  previousButton.disabled = !canNavigate;
  nextButton.disabled = !canNavigate;
}

function updateQueueSelection() {
  queue.querySelectorAll(".queue-row").forEach((row) => {
    const selected = Number(row.dataset.index) === currentIndex;
    row.classList.toggle("selected", selected);
    row.setAttribute("aria-current", selected ? "true" : "false");
  });
}

function loadYouTubeApi() {
  if (window.YT?.Player) return Promise.resolve();
  if (youtubeApiPromise) return youtubeApiPromise;

  youtubeApiPromise = new Promise((resolve, reject) => {
    window.onYouTubeIframeAPIReady = resolve;
    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    script.onerror = () => reject(new Error("YouTube player load nahi hua. Internet connection check karein."));
    document.head.append(script);
  });
  return youtubeApiPromise;
}

function showYouTubeError(code) {
  const messages = {
    2: "YouTube link mein video ID valid nahi hai.",
    5: "YouTube video is browser mein play nahi ho paya.",
    100: "YouTube video nahi mila, private hai, ya remove ho chuka hai.",
    101: "Video owner ne is video ko embedded player mein chalane ki permission nahi di.",
    150: "Video owner ne is video ko embedded player mein chalane ki permission nahi di.",
    153: "YouTube player ko page origin nahi mila. Website ko localhost ya HTTPS se kholein.",
  };
  showMessage(playerMessage, messages[code] || "YouTube video load nahi ho paya.");
  setPlaying(false);
}

function updateYouTubeTrackInfo() {
  const video = youtubePlayer.getVideoData();
  if (!video) return;
  if (video.title && !currentTrack.customTitle) titleNode.textContent = video.title;
  if (video.author) artistNode.textContent = video.author;
}

function handleYouTubeStateChange(event) {
  if (activeMode !== "youtube") return;

  if (event.data === 1) {
    setPlaying(true);
    showMessage(playerMessage, "");
    updateYouTubeTrackInfo();
  } else if (event.data === 2 || event.data === 0 || event.data === 5) {
    setPlaying(false);
    if (event.data === 5) showMessage(playerMessage, "Press play to start this YouTube video.", "success");
  }

  if (pendingPlaylistVideoId && (event.data === 1 || event.data === 5)) {
    const videoIds = youtubePlayer.getPlaylist();
    const index = (videoIds || []).indexOf(pendingPlaylistVideoId);
    pendingPlaylistVideoId = null;
    if (index >= 0 && youtubePlayer.getPlaylistIndex() !== index) {
      youtubePlayer.playVideoAt(index);
    }
  }

  if (event.data === 0 && currentTrack.type === "youtube-video" && currentIndex < playlist.tracks.length - 1) {
    moveTrack(1);
  }
}

function getYouTubePlayer() {
  if (youtubePlayerPromise) return youtubePlayerPromise;

  youtubePlayerPromise = loadYouTubeApi().then(() => new Promise((resolve, reject) => {
    try {
      youtubePlayer = new window.YT.Player("youtube-player", {
        width: "100%",
        height: "100%",
        playerVars: {
          controls: 1,
          playsinline: 1,
          origin: window.location.origin,
        },
        events: {
          onReady: () => {
            youtubePlayerReady = true;
            updateNavigationControls();
            if (activeMode === "youtube") {
              playButton.disabled = false;
              stopButton.disabled = false;
              videoToggleButton.disabled = false;
            }
            resolve(youtubePlayer);
          },
          onStateChange: handleYouTubeStateChange,
          onError: (event) => showYouTubeError(event.data),
        },
      });
    } catch (error) {
      reject(error);
    }
  }));
  return youtubePlayerPromise;
}

function displayAudioTrack(track, index) {
  if (youtubePlayerReady) youtubePlayer.stopVideo();
  currentTrack = track;
  currentIndex = index;
  activeMode = "audio";
  titleNode.textContent = track.title;
  artistNode.textContent = track.artist;
  coverImage.src = coverUrl;
  sourceLabel.textContent = "AUDIO";
  videoToggleButton.hidden = true;
  setYouTubeVideoVisible(false);
  stageCover.hidden = false;
  audioPlayer.pause();
  audioPlayer.src = track.url;
  audioPlayer.load();
  audioPlayer.loop = repeatEnabled;
  updateQueueSelection();
  updateNavigationControls();
  playButton.disabled = false;
  stopButton.disabled = false;
  showMessage(playerMessage, "");

  audioPlayer.play().catch(() => {
    if (audioPlayer.src !== track.url) return;
    setPlaying(false);
    showMessage(playerMessage, "Audio play nahi ho paya. URL, format, aur source permission check karein.");
  });
}

async function displayYouTubeTrack(track, index) {
  currentTrack = track;
  currentIndex = index;
  activeMode = "youtube";
  audioPlayer.pause();
  audioPlayer.removeAttribute("src");
  audioPlayer.load();
  setYouTubeVideoVisible(true);
  videoToggleButton.hidden = false;
  videoToggleButton.disabled = true;
  stageCover.hidden = true;
  sourceLabel.textContent = "YOUTUBE";
  qualityNote.hidden = false;
  titleNode.textContent = track.title;
  artistNode.textContent = track.artist;
  updateQueueSelection();
  updateNavigationControls();
  playButton.disabled = true;
  stopButton.disabled = true;
  setPlaying(false);
  showMessage(playerMessage, "");

  try {
    const player = await getYouTubePlayer();
    if (currentTrack !== track) return;
    playButton.disabled = false;
    stopButton.disabled = false;
    videoToggleButton.disabled = false;
    updateNavigationControls();
    if (track.type === "youtube-playlist") {
      pendingPlaylistVideoId = track.videoId;
      player.loadPlaylist({ listType: "playlist", list: track.playlistId });
      if (shuffleEnabled) player.setShuffle(true);
      if (repeatEnabled) player.setLoop(true);
    } else {
      pendingPlaylistVideoId = null;
      player.loadVideoById(track.videoId);
    }
  } catch (error) {
    showMessage(playerMessage, error.message || "YouTube player load nahi ho paya.");
  }
}

function startTrack(track, index) {
  if (track.type === "audio") {
    displayAudioTrack(track, index);
  } else {
    void displayYouTubeTrack(track, index);
  }
}

function renderQueue() {
  queue.replaceChildren();
  trackCount.textContent = `${playlist.tracks.length} ${playlist.tracks.length === 1 ? "item" : "items"}`;

  if (!playlist.tracks.length) {
    const empty = document.createElement("p");
    empty.className = "queue-empty";
    empty.textContent = "Add a YouTube video, playlist, or authorized direct audio URL to get started.";
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
      showHome();
      startTrack(track, index);
    });
    queue.append(row);
  });

  updateQueueSelection();
}

function moveTrack(direction) {
  if (!currentTrack || currentIndex < 0) return;
  if (activeMode === "youtube" && currentTrack.type === "youtube-playlist") {
    setYouTubeVideoVisible(true);
    if (direction > 0) youtubePlayer?.nextVideo();
    else youtubePlayer?.previousVideo();
    return;
  }

  const tracks = playlist.tracks;
  if (tracks.length < 2) return;

  let nextIndex;
  if (shuffleEnabled && direction > 0) {
    do {
      nextIndex = Math.floor(Math.random() * tracks.length);
    } while (nextIndex === currentIndex);
  } else {
    nextIndex = (currentIndex + direction + tracks.length) % tracks.length;
  }
  startTrack(tracks[nextIndex], nextIndex);
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  showMessage(listMessage, "");

  let track;
  try {
    const youtubeLink = parseYouTubeUrl(urlInput.value.trim());
    if (youtubeLink?.type === "playlist") {
      track = {
        type: "youtube-playlist",
        playlistId: youtubeLink.playlistId,
        videoId: youtubeLink.videoId,
        title: titleInput.value.trim() || "YouTube playlist",
        artist: "YouTube playlist",
        customTitle: Boolean(titleInput.value.trim()),
      };
    } else if (youtubeLink) {
      track = {
        type: "youtube-video",
        videoId: youtubeLink.videoId,
        title: titleInput.value.trim() || "YouTube video",
        artist: "YouTube",
        customTitle: Boolean(titleInput.value.trim()),
      };
    } else {
      const url = parseAudioUrl(urlInput.value.trim());
      track = {
        type: "audio",
        url,
        title: titleInput.value.trim() || titleFromUrl(url),
        artist: "Direct audio",
      };
    }
  } catch (error) {
    showMessage(listMessage, error.message);
    return;
  }

  playlist.tracks.push(track);
  playlistTitle.textContent = playlist.title;
  playlistNote.textContent = "Tracks are kept in this browser session. Keep YouTube videos visible while playing.";
  renderQueue();
  showHome();
  startTrack(track, playlist.tracks.length - 1);
  showMessage(listMessage, "Added to your track list.", "success");
  urlInput.value = "";
  titleInput.value = "";
});

openPlaylistButton.addEventListener("click", showPlaylist);
backButton.addEventListener("click", showHome);
previousButton.addEventListener("click", () => moveTrack(-1));
nextButton.addEventListener("click", () => moveTrack(1));

shuffleButton.addEventListener("click", () => {
  shuffleEnabled = !shuffleEnabled;
  shuffleButton.setAttribute("aria-pressed", String(shuffleEnabled));
  shuffleButton.setAttribute("aria-label", `Shuffle ${shuffleEnabled ? "on" : "off"}`);
  if (activeMode === "youtube" && currentTrack?.type === "youtube-playlist" && youtubePlayer) {
    youtubePlayer.setShuffle(shuffleEnabled);
  }
});

repeatButton.addEventListener("click", () => {
  repeatEnabled = !repeatEnabled;
  audioPlayer.loop = repeatEnabled;
  repeatButton.setAttribute("aria-pressed", String(repeatEnabled));
  repeatButton.setAttribute("aria-label", `Repeat ${repeatEnabled ? "on" : "off"}`);
  if (activeMode === "youtube" && currentTrack?.type === "youtube-playlist" && youtubePlayer) {
    youtubePlayer.setLoop(repeatEnabled);
  }
});

playButton.addEventListener("click", () => {
  if (activeMode === "youtube" && youtubePlayerReady) {
    const videoWasHidden = youtubePlayerContainer.hidden;
    setYouTubeVideoVisible(true);
    if (videoWasHidden) youtubePlayer.playVideo();
    else if (youtubePlayer.getPlayerState() === 1) youtubePlayer.pauseVideo();
    else youtubePlayer.playVideo();
  } else if (activeMode === "audio" && audioPlayer.src) {
    if (audioPlayer.paused) {
      const source = audioPlayer.src;
      audioPlayer.play().catch(() => {
        if (audioPlayer.src !== source) return;
        showMessage(playerMessage, "Audio play nahi ho paya. URL, format, aur source permission check karein.");
      });
    } else {
      audioPlayer.pause();
    }
  }
});

stopButton.addEventListener("click", () => {
  if (activeMode === "youtube" && youtubePlayerReady) youtubePlayer.stopVideo();
  if (activeMode === "audio") {
    audioPlayer.pause();
    audioPlayer.currentTime = 0;
  }
  setPlaying(false);
});

videoToggleButton.addEventListener("click", () => {
  if (activeMode !== "youtube" || !youtubePlayerReady) return;
  if (youtubePlayerContainer.hidden) {
    setYouTubeVideoVisible(true);
    return;
  }
  if (youtubePlayer.getPlayerState() === 1 || youtubePlayer.getPlayerState() === 3) {
    youtubePlayer.pauseVideo();
  }
  setPlaying(false);
  setYouTubeVideoVisible(false);
});

document.addEventListener("visibilitychange", () => {
  if (document.hidden && activeMode === "youtube" && youtubePlayerReady && youtubePlayer.getPlayerState() === 1) {
    youtubePlayer.pauseVideo();
  }
});

audioPlayer.addEventListener("play", () => {
  if (activeMode === "audio") setPlaying(true);
});
audioPlayer.addEventListener("pause", () => {
  if (activeMode === "audio") setPlaying(false);
});
audioPlayer.addEventListener("ended", () => {
  if (activeMode !== "audio") return;
  setPlaying(false);
  if (!repeatEnabled && currentIndex < playlist.tracks.length - 1) moveTrack(1);
});
audioPlayer.addEventListener("error", () => {
  if (activeMode !== "audio") return;
  setPlaying(false);
  showMessage(playerMessage, "Audio load nahi hua. Direct audio URL, supported format, aur access permission check karein.");
});

renderQueue();
