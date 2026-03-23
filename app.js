const STORAGE_KEY = "piano-chord-library-v1";
const KEY_OPTIONS = [
  "C",
  "C#",
  "D",
  "Eb",
  "E",
  "F",
  "F#",
  "G",
  "Ab",
  "A",
  "Bb",
  "B",
];
const SHARP_NOTES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const FLAT_TO_SHARP = {
  Db: "C#",
  Eb: "D#",
  Gb: "F#",
  Ab: "G#",
  Bb: "A#",
  Cb: "B",
  Fb: "E",
  "E#": "F",
  "B#": "C",
};
const SHARP_TO_FLAT = {
  "C#": "Db",
  "D#": "Eb",
  "F#": "Gb",
  "G#": "Ab",
  "A#": "Bb",
};

const state = {
  songs: loadSongs(),
  selectedSongId: null,
  searchTerm: "",
  saveStatusTimer: null,
};

const elements = {
  songList: document.querySelector("#song-list"),
  songCount: document.querySelector("#song-count"),
  songSearch: document.querySelector("#song-search"),
  newSongButton: document.querySelector("#new-song-button"),
  deleteSongButton: document.querySelector("#delete-song-button"),
  form: document.querySelector("#song-form"),
  title: document.querySelector("#song-title"),
  artist: document.querySelector("#song-artist"),
  originalKey: document.querySelector("#song-key"),
  content: document.querySelector("#song-content"),
  saveStatus: document.querySelector("#save-status"),
  previewTitle: document.querySelector("#preview-title"),
  previewArtist: document.querySelector("#preview-artist"),
  previewSongKey: document.querySelector("#preview-song-key"),
  originalKeyLabel: document.querySelector("#original-key-label"),
  savedKeyLabel: document.querySelector("#saved-key-label"),
  transposeStatus: document.querySelector("#transpose-status"),
  preview: document.querySelector("#song-preview"),
  transposeUp: document.querySelector("#transpose-up"),
  transposeDown: document.querySelector("#transpose-down"),
  resetTranspose: document.querySelector("#reset-transpose"),
};

initialize();

function initialize() {
  populateKeySelect();

  if (state.songs.length > 0) {
    state.selectedSongId = state.songs[0].id;
  } else {
    createBlankSong();
  }

  bindEvents();
  render();
}

function bindEvents() {
  elements.form.addEventListener("submit", handleSaveSong);
  elements.newSongButton.addEventListener("click", createBlankSong);
  elements.deleteSongButton.addEventListener("click", deleteSelectedSong);
  elements.songSearch.addEventListener("input", (event) => {
    state.searchTerm = event.target.value.trim().toLowerCase();
    renderSongList();
  });
  elements.transposeUp.addEventListener("click", () => transposeSelectedSong(1));
  elements.transposeDown.addEventListener("click", () => transposeSelectedSong(-1));
  elements.resetTranspose.addEventListener("click", () => resetTranspose());

  ["input", "change"].forEach((eventName) => {
    elements.form.addEventListener(eventName, handleDraftChange);
  });
}

function populateKeySelect() {
  elements.originalKey.innerHTML = KEY_OPTIONS.map(
    (key) => `<option value="${key}">${key}</option>`,
  ).join("");
}

function loadSongs() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.map((song) => {
      const originalKey = song.originalKey || "C";
      const savedTranspose = Number(song.savedTranspose) || 0;
      return {
        ...song,
        id: song.id || createSongId(),
        title: song.title || "",
        artist: song.artist || "",
        content: normalizeLineEndings(song.content || ""),
        originalKey,
        savedTranspose,
        savedKey: song.savedKey || transposeKey(originalKey, savedTranspose),
        updatedAt: song.updatedAt || Date.now(),
      };
    });
  } catch (error) {
    console.error("Unable to load saved songs", error);
    return [];
  }
}

function saveSongs() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.songs));
}

function createBlankSong() {
  const newSong = {
    id: createSongId(),
    title: "",
    artist: "",
    originalKey: "C",
    savedTranspose: 0,
    savedKey: "C",
    content: "",
    updatedAt: Date.now(),
  };

  state.songs.unshift(newSong);
  state.selectedSongId = newSong.id;
  saveSongs();
  render();
  fillForm(newSong);
  elements.title.focus();
}

function getSelectedSong() {
  return state.songs.find((song) => song.id === state.selectedSongId) ?? null;
}

function handleSaveSong(event) {
  event.preventDefault();

  const selectedSong = getSelectedSong();
  if (!selectedSong) {
    return;
  }

  applyFormToSong(selectedSong);
  persistSongs("Song saved");
  render();
}

function deleteSelectedSong() {
  const selectedSong = getSelectedSong();
  if (!selectedSong) {
    return;
  }

  const confirmed = window.confirm(
    `Delete "${selectedSong.title || "Untitled Song"}"?`,
  );
  if (!confirmed) {
    return;
  }

  state.songs = state.songs.filter((song) => song.id !== selectedSong.id);

  if (state.songs.length === 0) {
    createBlankSong();
    return;
  }

  state.selectedSongId = state.songs[0].id;
  saveSongs();
  render();
}

function render() {
  renderSongList();
  renderSelectedSong();
}

function renderSongList() {
  const filteredSongs = state.songs.filter((song) => {
    const haystack = `${song.title} ${song.artist}`.toLowerCase();
    return haystack.includes(state.searchTerm);
  });

  elements.songCount.textContent = String(filteredSongs.length);

  if (filteredSongs.length === 0) {
    elements.songList.innerHTML = '<div class="empty-state">No matching songs yet.</div>';
    return;
  }

  elements.songList.innerHTML = filteredSongs
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .map((song) => {
      const activeClass = song.id === state.selectedSongId ? "active" : "";
      const safeTitle = escapeHtml(song.title || "Untitled Song");
      const safeArtist = escapeHtml(song.artist || "Unknown artist");
      return `
        <button class="song-list-item ${activeClass}" type="button" data-song-id="${song.id}">
          <strong>${safeTitle}</strong>
          <span>${safeArtist}</span>
        </button>
      `;
    })
    .join("");

  elements.songList.querySelectorAll("[data-song-id]").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedSongId = button.dataset.songId;
      renderSelectedSong();
      renderSongList();
    });
  });
}

function renderSelectedSong() {
  const selectedSong = getSelectedSong();
  if (!selectedSong) {
    return;
  }

  fillForm(selectedSong);
  updatePreview(selectedSong);
}

function fillForm(song) {
  elements.title.value = song.title;
  elements.artist.value = song.artist;
  elements.originalKey.value = song.originalKey;
  elements.content.value = song.content;
}

function updatePreview(song) {
  const displayedKey = song.savedKey || transposeKey(song.originalKey, song.savedTranspose);

  elements.previewTitle.textContent = song.title || "Untitled Song";
  elements.previewArtist.textContent = song.artist || "Unknown artist";
  elements.previewSongKey.textContent = `Showing: ${displayedKey}`;
  elements.originalKeyLabel.textContent = song.originalKey;
  elements.savedKeyLabel.textContent = displayedKey;
  elements.transposeStatus.textContent = formatTranspose(song.savedTranspose);

  const transposedContent = transposeSheet(song.content, song.savedTranspose);
  elements.preview.textContent = transposedContent || "Paste lyrics and chords to preview them here.";
}

function syncDraftPreview() {
  const selectedSong = getSelectedSong();
  if (!selectedSong) {
    return;
  }

  const draftSong = {
    ...selectedSong,
    title: elements.title.value.trim(),
    artist: elements.artist.value.trim(),
    originalKey: elements.originalKey.value,
    content: normalizeLineEndings(elements.content.value),
    savedKey: transposeKey(elements.originalKey.value, selectedSong.savedTranspose),
  };

  updatePreview(draftSong);
}

function handleDraftChange() {
  const selectedSong = getSelectedSong();
  if (!selectedSong) {
    return;
  }

  applyFormToSong(selectedSong);
  persistSongs("Saved automatically");
  syncDraftPreview();
  renderSongList();
}

function transposeSelectedSong(step) {
  const selectedSong = getSelectedSong();
  if (!selectedSong) {
    return;
  }

  selectedSong.savedTranspose += step;
  selectedSong.savedKey = transposeKey(
    selectedSong.originalKey,
    selectedSong.savedTranspose,
  );
  selectedSong.updatedAt = Date.now();
  persistSongs("Transpose saved");
  render();
}

function resetTranspose() {
  const selectedSong = getSelectedSong();
  if (!selectedSong) {
    return;
  }

  selectedSong.savedTranspose = 0;
  selectedSong.savedKey = selectedSong.originalKey;
  selectedSong.updatedAt = Date.now();
  persistSongs("Transpose reset");
  render();
}

function formatTranspose(value) {
  if (value === 0) {
    return "0";
  }

  return value > 0 ? `+${value}` : String(value);
}

function transposeKey(originalKey, offset) {
  return transposeChordRoot(originalKey, offset, prefersFlats(originalKey));
}

function transposeSheet(content, offset) {
  if (!content.trim() || offset === 0) {
    return content;
  }

  return content
    .split("\n")
    .map((line) => transposeLine(line, offset))
    .join("\n");
}

function transposeLine(line, offset) {
  if (!line.trim()) {
    return line;
  }

  const hasBracketChords = /\[[^\]]+\]/.test(line);
  if (hasBracketChords) {
    return line.replace(/\[([^\]]+)\]/g, (_, bracketChord) => {
      return `[${transposeChord(bracketChord, offset)}]`;
    });
  }

  if (!isChordLine(line)) {
    return line;
  }

  return line.replace(/([A-G](?:#|b)?[^\s|]*?(?:\/[A-G](?:#|b)?)?)(?=\s|$|\|)/g, (match) => {
    if (!looksLikeChord(match)) {
      return match;
    }

    return transposeChord(match, offset);
  });
}

function transposeChord(chord, offset) {
  const trimmed = chord.trim();
  const match = trimmed.match(/^([A-G](?:#|b)?)(.*?)(?:\/([A-G](?:#|b)?))?$/);

  if (!match) {
    return chord;
  }

  const [, root, suffix, bass] = match;
  const useFlats = prefersFlats(root) || (bass ? prefersFlats(bass) : false);
  const nextRoot = transposeChordRoot(root, offset, useFlats);
  const nextBass = bass ? transposeChordRoot(bass, offset, useFlats) : "";

  return `${nextRoot}${suffix}${nextBass ? `/${nextBass}` : ""}`;
}

function transposeChordRoot(root, offset, useFlats) {
  const sharpRoot = FLAT_TO_SHARP[root] || root;
  const currentIndex = SHARP_NOTES.indexOf(sharpRoot);
  if (currentIndex === -1) {
    return root;
  }

  const wrappedIndex = (currentIndex + offset % 12 + 12) % 12;
  const sharpNote = SHARP_NOTES[wrappedIndex];

  if (useFlats && SHARP_TO_FLAT[sharpNote]) {
    return SHARP_TO_FLAT[sharpNote];
  }

  return sharpNote;
}

function prefersFlats(value) {
  return /b/.test(value);
}

function normalizeLineEndings(value) {
  return value.replace(/\r\n?/g, "\n");
}

function looksLikeChord(token) {
  if (!token) {
    return false;
  }

  if (!/^[A-G]/.test(token)) {
    return false;
  }

  if (token.length === 1 || /^[A-G](?:#|b)?(?:m|maj|min|sus|dim|aug|add|\d|\/|°|\+|-)*.*$/i.test(token)) {
    return true;
  }

  return false;
}

function isChordLine(line) {
  const tokens = line.trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) {
    return false;
  }

  const chordLikeTokens = tokens.filter((token) => looksLikeChord(token) || token === "|");
  return chordLikeTokens.length / tokens.length >= 0.6;
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function applyFormToSong(song) {
  song.title = elements.title.value.trim() || "Untitled Song";
  song.artist = elements.artist.value.trim();
  song.originalKey = elements.originalKey.value;
  song.content = normalizeLineEndings(elements.content.value);
  song.savedKey = transposeKey(song.originalKey, song.savedTranspose);
  song.updatedAt = Date.now();
}

function persistSongs(message) {
  saveSongs();
  setSaveStatus(message);
}

function setSaveStatus(message) {
  elements.saveStatus.textContent = message;

  if (state.saveStatusTimer) {
    window.clearTimeout(state.saveStatusTimer);
  }

  state.saveStatusTimer = window.setTimeout(() => {
    elements.saveStatus.textContent = "Saved";
  }, 1600);
}

function createSongId() {
  if (window.crypto?.randomUUID) {
    return window.crypto.randomUUID();
  }

  return `song-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
