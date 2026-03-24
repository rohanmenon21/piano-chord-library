const STORAGE_KEY = "piano-chord-library-v1";
const PENDING_DELETE_KEY = "piano-chord-library-pending-delete-v1";
const CHORD_VOICING_KEY = "piano-chord-library-chord-voicings-v1";
const UNDO_WINDOW_MS = 5000;
const IMPORT_PROXIES = [
  (url) => url,
  (url) => `https://r.jina.ai/http://${url.replace(/^https?:\/\//, "")}`,
];
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
const PITCH_CLASS_TO_DISPLAY = ["C", "C#", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"];
const WHITE_PIANO_KEYS = ["C", "D", "E", "F", "G", "A", "B"];
const BLACK_PIANO_KEYS = [
  { note: "C#", midi: 49, left: "5.6%" },
  { note: "D#", midi: 51, left: "12.1%" },
  { note: "F#", midi: 54, left: "24.7%" },
  { note: "G#", midi: 56, left: "31.1%" },
  { note: "A#", midi: 58, left: "37.6%" },
  { note: "C#", midi: 61, left: "50.1%" },
  { note: "D#", midi: 63, left: "56.6%" },
  { note: "F#", midi: 66, left: "69.1%" },
  { note: "G#", midi: 68, left: "75.6%" },
  { note: "A#", midi: 70, left: "82.1%" },
];
const WHITE_PIANO_KEYS_EXTENDED = [
  { note: "C", midi: 48 },
  { note: "D", midi: 50 },
  { note: "E", midi: 52 },
  { note: "F", midi: 53 },
  { note: "G", midi: 55 },
  { note: "A", midi: 57 },
  { note: "B", midi: 59 },
  { note: "C", midi: 60 },
  { note: "D", midi: 62 },
  { note: "E", midi: 64 },
  { note: "F", midi: 65 },
  { note: "G", midi: 67 },
  { note: "A", midi: 69 },
  { note: "B", midi: 71 },
  { note: "C", midi: 72 },
];
const NON_CHORD_LABELS = new Set([
  "intro",
  "verse",
  "chorus",
  "chorous",
  "bridge",
  "outro",
  "prechorus",
  "pre-chorus",
  "refrain",
  "tag",
  "solo",
  "instrumental",
  "ending",
]);

const state = {
  songs: loadSongs(),
  selectedSongId: null,
  searchTerm: "",
  saveStatusTimer: null,
  activeTab: "edit",
  hoveredChord: null,
  hoveredChordElement: null,
  hoveredChordVoicings: [],
  hoveredVoicingIndex: 0,
  hoveredSongId: null,
  isTooltipHovered: false,
  tooltipHideTimer: null,
  pendingDelete: loadPendingDelete(),
  chordVoicingSelections: loadChordVoicingSelections(),
  undoTimer: null,
};

const elements = {
  songList: document.querySelector("#song-list"),
  songCount: document.querySelector("#song-count"),
  songSearch: document.querySelector("#song-search"),
  newSongButton: document.querySelector("#new-song-button"),
  deleteSongButton: document.querySelector("#delete-song-button"),
  undoToast: document.querySelector("#undo-toast"),
  undoMessage: document.querySelector("#undo-message"),
  undoButton: document.querySelector("#undo-button"),
  importUrl: document.querySelector("#import-url"),
  importButton: document.querySelector("#import-button"),
  importStatus: document.querySelector("#import-status"),
  form: document.querySelector("#song-form"),
  title: document.querySelector("#song-title"),
  artist: document.querySelector("#song-artist"),
  originalKey: document.querySelector("#song-key"),
  content: document.querySelector("#song-content"),
  saveStatus: document.querySelector("#save-status"),
  editTab: document.querySelector("#edit-tab"),
  previewTab: document.querySelector("#preview-tab"),
  editPanel: document.querySelector("#edit-panel"),
  previewPanel: document.querySelector("#preview-panel"),
  previewTitle: document.querySelector("#preview-title"),
  previewArtist: document.querySelector("#preview-artist"),
  previewSongKey: document.querySelector("#preview-song-key"),
  originalKeyLabel: document.querySelector("#original-key-label"),
  savedKeyLabel: document.querySelector("#saved-key-label"),
  transposeStatus: document.querySelector("#transpose-status"),
  preview: document.querySelector("#song-preview"),
  chordTooltip: document.querySelector("#chord-tooltip"),
  tooltipChordName: document.querySelector("#tooltip-chord-name"),
  tooltipChordNotes: document.querySelector("#tooltip-chord-notes"),
  tooltipPrev: document.querySelector("#tooltip-prev"),
  tooltipNext: document.querySelector("#tooltip-next"),
  tooltipVoicingIndex: document.querySelector("#tooltip-voicing-index"),
  tooltipPiano: document.querySelector("#tooltip-piano"),
  transposeUp: document.querySelector("#transpose-up"),
  transposeDown: document.querySelector("#transpose-down"),
  resetTranspose: document.querySelector("#reset-transpose"),
};

initialize();

function initialize() {
  populateKeySelect();
  reconcilePendingDelete();

  if (state.songs.length > 0) {
    state.selectedSongId = state.songs[0].id;
    state.activeTab = "preview";
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
  elements.undoButton.addEventListener("click", undoDelete);
  elements.importButton.addEventListener("click", importFromUrl);
  elements.songSearch.addEventListener("input", (event) => {
    state.searchTerm = event.target.value.trim().toLowerCase();
    renderSongList();
  });
  elements.editTab.addEventListener("click", () => switchTab("edit"));
  elements.previewTab.addEventListener("click", () => switchTab("preview"));
  elements.transposeUp.addEventListener("click", () => transposeSelectedSong(1));
  elements.transposeDown.addEventListener("click", () => transposeSelectedSong(-1));
  elements.resetTranspose.addEventListener("click", () => resetTranspose());
  elements.preview.addEventListener("mouseover", handlePreviewMouseOver);
  elements.preview.addEventListener("mousemove", handlePreviewMouseMove);
  elements.preview.addEventListener("mouseleave", scheduleHideChordTooltip);
  elements.chordTooltip.addEventListener("mouseenter", handleTooltipMouseEnter);
  elements.chordTooltip.addEventListener("mouseleave", handleTooltipMouseLeave);
  elements.tooltipPrev.addEventListener("click", () => changeTooltipVoicing(-1));
  elements.tooltipNext.addEventListener("click", () => changeTooltipVoicing(1));
  window.addEventListener("resize", repositionVisibleChordTooltip);
  window.addEventListener("scroll", repositionVisibleChordTooltip, true);

  ["input", "change"].forEach((eventName) => {
    elements.form.addEventListener(eventName, handleDraftChange);
  });
}

async function importFromUrl() {
  const rawUrl = elements.importUrl.value.trim();
  if (!rawUrl) {
    setImportStatus("Add a URL first");
    return;
  }

  let normalizedUrl;
  try {
    normalizedUrl = new URL(rawUrl).toString();
  } catch (error) {
    setImportStatus("That URL does not look valid");
    return;
  }

  elements.importButton.disabled = true;
  setImportStatus("Fetching page...");

  try {
    const html = await fetchImportHtml(normalizedUrl);
    const extractedSong = extractSongFromHtml(html, normalizedUrl);

    if (!extractedSong.content.trim()) {
      throw new Error("No usable chord/lyric block found on that page");
    }

    const selectedSong = getSelectedSong();
    if (!selectedSong) {
      throw new Error("No editable song is currently selected");
    }

    selectedSong.title = extractedSong.title || selectedSong.title || "Untitled Song";
    selectedSong.artist = extractedSong.artist || selectedSong.artist || "";
    selectedSong.originalKey = extractedSong.originalKey || selectedSong.originalKey || "C";
    selectedSong.savedTranspose = 0;
    selectedSong.savedKey = selectedSong.originalKey;
    selectedSong.content = extractedSong.content;
    selectedSong.updatedAt = Date.now();

    fillForm(selectedSong);
    persistSongs("Imported song");
    syncDraftPreview();
    renderSongList();
    setImportStatus("Imported successfully");
  } catch (error) {
    console.error(error);
    setImportStatus(error.message || "Import failed");
  } finally {
    elements.importButton.disabled = false;
  }
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

function loadPendingDelete() {
  try {
    const raw = localStorage.getItem(PENDING_DELETE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw);
    if (!parsed?.song || !parsed?.expiresAt) {
      return null;
    }

    if (parsed.expiresAt <= Date.now()) {
      localStorage.removeItem(PENDING_DELETE_KEY);
      return null;
    }

    return {
      ...parsed,
      song: {
        ...parsed.song,
        content: normalizeLineEndings(parsed.song.content || ""),
      },
    };
  } catch (error) {
    console.error("Unable to load pending delete", error);
    return null;
  }
}

function loadChordVoicingSelections() {
  try {
    const raw = localStorage.getItem(CHORD_VOICING_KEY);
    if (!raw) {
      return {};
    }

    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (error) {
    console.error("Unable to load chord voicing selections", error);
    return {};
  }
}

function saveSongs() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.songs));
}

function savePendingDelete() {
  if (!state.pendingDelete) {
    localStorage.removeItem(PENDING_DELETE_KEY);
    return;
  }

  localStorage.setItem(PENDING_DELETE_KEY, JSON.stringify(state.pendingDelete));
}

function saveChordVoicingSelections() {
  localStorage.setItem(
    CHORD_VOICING_KEY,
    JSON.stringify(state.chordVoicingSelections),
  );
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
  state.activeTab = "edit";
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
  state.activeTab = "preview";
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

  finalizePendingDelete();

  const songIndex = state.songs.findIndex((song) => song.id === selectedSong.id);
  state.pendingDelete = {
    song: { ...selectedSong },
    originalIndex: songIndex,
    expiresAt: Date.now() + UNDO_WINDOW_MS,
  };
  savePendingDelete();
  schedulePendingDeleteExpiry();

  state.songs = state.songs.filter((song) => song.id !== selectedSong.id);

  if (state.songs.length === 0) {
    createBlankSong();
    renderUndoToast();
    return;
  }

  state.selectedSongId = state.songs[0].id;
  saveSongs();
  render();
}

function render() {
  renderTabs();
  renderSongList();
  renderSelectedSong();
  renderUndoToast();
}

function renderTabs() {
  const isEditTab = state.activeTab === "edit";

  elements.editTab.classList.toggle("active", isEditTab);
  elements.previewTab.classList.toggle("active", !isEditTab);
  elements.editTab.setAttribute("aria-selected", String(isEditTab));
  elements.previewTab.setAttribute("aria-selected", String(!isEditTab));
  elements.editPanel.classList.toggle("active", isEditTab);
  elements.previewPanel.classList.toggle("active", !isEditTab);
  elements.editPanel.hidden = !isEditTab;
  elements.previewPanel.hidden = isEditTab;
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
      state.activeTab = "preview";
      render();
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

function renderUndoToast() {
  if (!state.pendingDelete) {
    elements.undoToast.hidden = true;
    return;
  }

  const songTitle = state.pendingDelete.song.title || "Untitled Song";
  elements.undoMessage.textContent = `"${songTitle}" deleted`;
  elements.undoToast.hidden = false;
}

function fillForm(song) {
  elements.title.value = song.title === "Untitled Song" ? "" : song.title;
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
  if (!transposedContent) {
    elements.preview.textContent = "Paste lyrics and chords to preview them here.";
    hideChordTooltip();
    return;
  }

  elements.preview.innerHTML = renderPreviewMarkup(transposedContent);
}

function syncDraftPreview() {
  const selectedSong = getSelectedSong();
  if (!selectedSong) {
    return;
  }

  const draftSong = {
    ...selectedSong,
    title: elements.title.value.trim() || "Untitled Song",
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

function switchTab(tab) {
  state.activeTab = tab;
  renderTabs();
  if (tab !== "preview") {
    hideChordTooltip();
  }
}

function handlePreviewMouseOver(event) {
  const chordElement = event.target.closest(".chord-token");
  if (!chordElement) {
    if (!state.isTooltipHovered) {
      scheduleHideChordTooltip();
    }
    return;
  }

  cancelHideChordTooltip();
  const chordName = chordElement.dataset.chord;
  if (!chordName) {
    hideChordTooltip();
    return;
  }

  const chordVoicings = getChordVoicings(chordName);
  if (chordVoicings.length === 0) {
    hideChordTooltip();
    return;
  }

  state.hoveredChord = chordName;
  state.hoveredChordElement = chordElement;
  state.hoveredChordVoicings = chordVoicings;
  state.hoveredSongId = getSelectedSong()?.id || null;
  state.hoveredVoicingIndex = getSavedVoicingIndex(
    state.hoveredSongId,
    chordName,
    chordVoicings.length,
  );
  showChordTooltip(chordName, chordVoicings, chordElement);
}

function handlePreviewMouseMove(event) {
  const chordElement = event.target.closest(".chord-token");
  if (!chordElement && state.hoveredChord && !state.isTooltipHovered) {
    scheduleHideChordTooltip();
    return;
  }

  if (chordElement && chordElement !== state.hoveredChordElement) {
    cancelHideChordTooltip();
    state.hoveredChordElement = chordElement;
  }

  if (chordElement) {
    repositionVisibleChordTooltip();
  }
}

async function fetchImportHtml(url) {
  let lastError = null;

  for (const buildUrl of IMPORT_PROXIES) {
    const targetUrl = buildUrl(url);

    try {
      const response = await fetch(targetUrl);
      if (!response.ok) {
        throw new Error(`Request failed with ${response.status}`);
      }

      const text = await response.text();
      if (text.trim()) {
        return text;
      }
    } catch (error) {
      lastError = error;
    }
  }

  throw new Error(
    lastError?.message?.includes("Failed to fetch")
      ? "That site blocked browser access. Try another page or paste manually."
      : lastError?.message || "Import failed",
  );
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
      return looksLikeChord(bracketChord)
        ? `[${transposeChord(bracketChord, offset)}]`
        : `[${bracketChord}]`;
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

function renderPreviewMarkup(content) {
  return content
    .split("\n")
    .map((line) => renderPreviewLine(line))
    .join("\n");
}

function renderPreviewLine(line) {
  if (!line) {
    return "";
  }

  const hasBracketChords = /\[[^\]]+\]/.test(line);
  if (hasBracketChords) {
    return replaceMatchesWithEscaping(line, /\[([^\]]+)\]/g, (match, chord) => {
      return looksLikeChord(chord)
        ? `[${renderChordToken(chord)}]`
        : escapeHtmlPreservingSpaces(match);
    });
  }

  if (!isChordLine(line)) {
    return escapeHtmlPreservingSpaces(line);
  }

  return replaceMatchesWithEscaping(
    line,
    /([A-G](?:#|b)?[^\s|]*?(?:\/[A-G](?:#|b)?)?)(?=\s|$|\|)/g,
    (match) => {
      return looksLikeChord(match) ? renderChordToken(match) : escapeHtmlPreservingSpaces(match);
    },
  );
}

function replaceMatchesWithEscaping(line, pattern, renderMatch) {
  let result = "";
  let lastIndex = 0;

  line.replace(pattern, (...args) => {
    const match = args[0];
    const groups = args.slice(1, -2);
    const offset = args.at(-2);

    result += escapeHtmlPreservingSpaces(line.slice(lastIndex, offset));
    result += renderMatch(match, ...groups);
    lastIndex = offset + match.length;
    return match;
  });

  result += escapeHtmlPreservingSpaces(line.slice(lastIndex));
  return result;
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

  const wrappedIndex = (currentIndex + (offset % 12) + 12) % 12;
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

  const trimmed = token.trim();
  if (!/^[A-G]/.test(trimmed)) {
    return false;
  }

  const normalized = trimmed.toLowerCase();
  if (NON_CHORD_LABELS.has(normalized)) {
    return false;
  }

  if (/^[A-G](?:#|b)?$/.test(trimmed)) {
    return true;
  }

  if (/^[A-G](?:#|b)?(?:m|maj|min|sus|dim|aug|add|\d|\/|°|\+|-)+[A-Za-z0-9#b/°+\-]*$/i.test(trimmed)) {
    return true;
  }

  return /^[A-G](?:#|b)?(?:maj|min|sus|dim|aug|add)\d*$/i.test(trimmed);
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

function escapeHtmlPreservingSpaces(value) {
  return escapeHtml(value).replace(/ /g, "&nbsp;");
}

function renderChordToken(chord) {
  const safeChord = escapeHtml(chord);
  return `<span class="chord-token" data-chord="${safeChord}">${safeChord}</span>`;
}

function extractSongFromHtml(html, sourceUrl) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  const title = extractTitle(doc, sourceUrl);
  const artist = extractArtist(doc);
  const originalKey = extractKeyFromDocument(doc);
  const content = extractSongContent(doc);

  return {
    title,
    artist,
    originalKey,
    content,
  };
}

function extractTitle(doc, sourceUrl) {
  const titleCandidates = [
    doc.querySelector("meta[property='og:title']")?.content,
    doc.querySelector("h1")?.textContent,
    doc.title,
  ]
    .map((value) => cleanImportedText(value || ""))
    .filter(Boolean);

  if (titleCandidates.length > 0) {
    return titleCandidates[0]
      .replace(/\s*\|\s*.*$/, "")
      .replace(/\s*-\s*(lyrics|chords|tabs?).*$/i, "")
      .trim();
  }

  try {
    const hostname = new URL(sourceUrl).hostname.replace(/^www\./, "");
    return hostname;
  } catch (error) {
    return "Imported Song";
  }
}

function extractArtist(doc) {
  const candidate = [
    doc.querySelector("meta[name='author']")?.content,
    doc.querySelector("meta[property='music:musician']")?.content,
    doc.querySelector("[itemprop='byArtist']")?.textContent,
  ]
    .map((value) => cleanImportedText(value || ""))
    .find(Boolean);

  return candidate || "";
}

function extractKeyFromDocument(doc) {
  const bodyText = cleanImportedText(doc.body?.textContent || "");
  const match = bodyText.match(/\b(?:key|capo key|original key)\s*[:\-]?\s*([A-G](?:#|b)?m?)\b/i);
  return match ? normalizeImportedKey(match[1]) : "C";
}

function extractSongContent(doc) {
  const candidates = [
    ...doc.querySelectorAll("pre, article, main, section, .lyrics, .chords, .song, .songtext, .song-body, .entry-content"),
  ];

  const scoredBlocks = candidates
    .map((element) => {
      const text = normalizeImportedText(element.innerText || element.textContent || "");
      return {
        text,
        score: scoreImportedBlock(text),
      };
    })
    .filter((entry) => entry.text && entry.score > 0)
    .sort((a, b) => b.score - a.score);

  if (scoredBlocks.length > 0) {
    return scoredBlocks[0].text;
  }

  const wholePageText = normalizeImportedText(doc.body?.innerText || doc.body?.textContent || "");
  if (scoreImportedBlock(wholePageText) > 0) {
    return wholePageText;
  }

  return "";
}

function scoreImportedBlock(text) {
  if (!text) {
    return 0;
  }

  const lines = text.split("\n").map((line) => line.trim()).filter(Boolean);
  if (lines.length < 2) {
    return 0;
  }

  const chordLines = lines.filter((line) => isChordLine(line)).length;
  const bracketChords = (text.match(/\[([^\]]+)\]/g) || []).filter((match) => {
    return looksLikeChord(match.slice(1, -1));
  }).length;
  const lyricLines = lines.filter((line) => /[a-z]{3,}/i.test(line) && !isChordLine(line)).length;

  return chordLines * 4 + bracketChords * 2 + lyricLines;
}

function normalizeImportedText(value) {
  return normalizeLineEndings(
    cleanImportedText(value)
      .replace(/\u00a0/g, " ")
      .replace(/\n{3,}/g, "\n\n"),
  ).trim();
}

function cleanImportedText(value) {
  return value.replace(/[ \t]+\n/g, "\n").replace(/\n[ \t]+/g, "\n").trim();
}

function normalizeImportedKey(value) {
  const cleaned = value.trim();
  const base = cleaned.match(/^([A-G](?:#|b)?)/)?.[1] || "C";
  return KEY_OPTIONS.includes(base) ? base : FLAT_TO_SHARP[base] || "C";
}

function setImportStatus(message) {
  elements.importStatus.textContent = message;
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

function showChordTooltip(chordName, chordVoicings, chordElement) {
  elements.tooltipChordName.textContent = chordName;
  state.hoveredChordVoicings = chordVoicings;
  document.body.appendChild(elements.chordTooltip);
  elements.chordTooltip.dataset.placement = "top";
  elements.chordTooltip.hidden = false;
  state.hoveredChordElement = chordElement;
  renderTooltipVoicing();
  repositionVisibleChordTooltip();
}

function hideChordTooltip() {
  cancelHideChordTooltip();
  state.hoveredChord = null;
  state.hoveredChordElement = null;
  state.hoveredChordVoicings = [];
  state.hoveredVoicingIndex = 0;
  state.hoveredSongId = null;
  state.isTooltipHovered = false;
  elements.chordTooltip.hidden = true;
  elements.chordTooltip.removeAttribute("data-placement");
  elements.previewPanel.appendChild(elements.chordTooltip);
}

function scheduleHideChordTooltip() {
  cancelHideChordTooltip();
  state.tooltipHideTimer = window.setTimeout(() => {
    if (!state.isTooltipHovered) {
      hideChordTooltip();
    }
  }, 120);
}

function cancelHideChordTooltip() {
  if (state.tooltipHideTimer) {
    window.clearTimeout(state.tooltipHideTimer);
    state.tooltipHideTimer = null;
  }
}

function handleTooltipMouseEnter() {
  state.isTooltipHovered = true;
  cancelHideChordTooltip();
}

function handleTooltipMouseLeave() {
  state.isTooltipHovered = false;
  scheduleHideChordTooltip();
}

function changeTooltipVoicing(direction) {
  if (state.hoveredChordVoicings.length === 0) {
    return;
  }

  const nextIndex = state.hoveredVoicingIndex + direction;
  if (nextIndex < 0 || nextIndex >= state.hoveredChordVoicings.length) {
    return;
  }

  state.hoveredVoicingIndex = nextIndex;
  saveVoicingSelection(state.hoveredSongId, state.hoveredChord, nextIndex);
  renderTooltipVoicing();
  repositionVisibleChordTooltip();
}

function renderTooltipVoicing() {
  const voicing = state.hoveredChordVoicings[state.hoveredVoicingIndex];
  if (!voicing) {
    return;
  }

  elements.tooltipChordNotes.textContent = voicing.noteNames.join(" ");
  elements.tooltipVoicingIndex.textContent = `${state.hoveredVoicingIndex + 1} / ${state.hoveredChordVoicings.length}`;
  elements.tooltipPrev.disabled = state.hoveredVoicingIndex === 0;
  elements.tooltipNext.disabled =
    state.hoveredVoicingIndex === state.hoveredChordVoicings.length - 1;
  elements.tooltipPiano.innerHTML = renderPianoKeyboard(voicing.noteNumbers);
}

function repositionVisibleChordTooltip() {
  if (elements.chordTooltip.hidden || !state.hoveredChordElement) {
    return;
  }

  window.requestAnimationFrame(() => {
    if (elements.chordTooltip.hidden || !state.hoveredChordElement) {
      return;
    }

    const margin = 12;
    const gap = 10;
    const chordRect = state.hoveredChordElement.getBoundingClientRect();
    const tooltipRect = elements.chordTooltip.getBoundingClientRect();

    let left = chordRect.left + chordRect.width / 2 - tooltipRect.width / 2;
    left = Math.min(
      Math.max(margin, left),
      window.innerWidth - tooltipRect.width - margin,
    );

    const topPlacementTop = chordRect.top - tooltipRect.height - gap;
    const bottomPlacementTop = chordRect.bottom + gap;
    const fitsAbove = topPlacementTop >= margin;
    const fitsBelow = bottomPlacementTop + tooltipRect.height <= window.innerHeight - margin;

    let placement = "top";
    let top = topPlacementTop;

    if (!fitsAbove && fitsBelow) {
      placement = "bottom";
      top = bottomPlacementTop;
    } else if (!fitsAbove && !fitsBelow) {
      const spaceAbove = chordRect.top - margin;
      const spaceBelow = window.innerHeight - chordRect.bottom - margin;
      placement = spaceBelow > spaceAbove ? "bottom" : "top";
      top = placement === "bottom"
        ? Math.min(bottomPlacementTop, window.innerHeight - tooltipRect.height - margin)
        : Math.max(margin, topPlacementTop);
    }

    elements.chordTooltip.dataset.placement = placement;
    elements.chordTooltip.style.left = `${left}px`;
    elements.chordTooltip.style.top = `${Math.max(margin, top)}px`;
  });
}

function undoDelete() {
  if (!state.pendingDelete) {
    return;
  }

  const { song, originalIndex } = state.pendingDelete;
  const insertAt = Math.max(0, Math.min(originalIndex ?? 0, state.songs.length));
  state.songs.splice(insertAt, 0, song);
  state.selectedSongId = song.id;
  state.activeTab = "preview";
  saveSongs();
  clearPendingDelete();
  render();
}

function reconcilePendingDelete() {
  if (!state.pendingDelete) {
    return;
  }

  schedulePendingDeleteExpiry();
}

function schedulePendingDeleteExpiry() {
  if (state.undoTimer) {
    window.clearTimeout(state.undoTimer);
  }

  if (!state.pendingDelete) {
    return;
  }

  const remainingMs = state.pendingDelete.expiresAt - Date.now();
  if (remainingMs <= 0) {
    finalizePendingDelete();
    return;
  }

  state.undoTimer = window.setTimeout(() => {
    finalizePendingDelete();
    renderUndoToast();
  }, remainingMs);
}

function clearPendingDelete() {
  if (state.undoTimer) {
    window.clearTimeout(state.undoTimer);
    state.undoTimer = null;
  }

  state.pendingDelete = null;
  savePendingDelete();
}

function finalizePendingDelete() {
  if (!state.pendingDelete) {
    return;
  }

  clearPendingDelete();
}

function renderPianoKeyboard(noteNames) {
  const activeSet = new Set(noteNames);
  const whiteKeysMarkup = WHITE_PIANO_KEYS_EXTENDED.map(({ note, midi }) => {
    const isActive = activeSet.has(midi);
    return `<div class="piano-key white ${isActive ? "active" : ""}">${note}</div>`;
  }).join("");

  const blackKeysMarkup = BLACK_PIANO_KEYS.map(({ note, midi, left }) => {
    const isActive = activeSet.has(midi);
    return `<div class="piano-key black ${isActive ? "active" : ""}" style="left: ${left}">${note}</div>`;
  }).join("");

  return `
    <div class="piano-keyboard">
      <div class="piano-white-keys">${whiteKeysMarkup}</div>
      <div class="piano-black-keys">${blackKeysMarkup}</div>
    </div>
  `;
}

function getChordVoicings(chord) {
  const trimmed = chord.trim();
  const match = trimmed.match(/^([A-G](?:#|b)?)([^/]*)?(?:\/([A-G](?:#|b)?))?$/);
  if (!match) {
    return [];
  }

  const [, root, rawSuffix = "", bass] = match;
  const normalizedRoot = FLAT_TO_SHARP[root] || root;
  const rootIndex = SHARP_NOTES.indexOf(normalizedRoot);
  if (rootIndex === -1) {
    return [];
  }

  const suffix = rawSuffix.toLowerCase();
  let intervals = [0, 4, 7];

  if (suffix.includes("sus2")) {
    intervals = [0, 2, 7];
  } else if (suffix.includes("sus4") || suffix.includes("sus")) {
    intervals = [0, 5, 7];
  } else if (suffix.includes("dim7")) {
    intervals = [0, 3, 6, 9];
  } else if (suffix.includes("dim") || suffix.includes("m7b5")) {
    intervals = [0, 3, 6];
  } else if (suffix.includes("aug") || suffix.includes("+")) {
    intervals = [0, 4, 8];
  } else if (suffix.includes("maj7")) {
    intervals = [0, 4, 7, 11];
  } else if (suffix.includes("m7")) {
    intervals = [0, 3, 7, 10];
  } else if (suffix === "m" || suffix.startsWith("m") || suffix.includes("min")) {
    intervals = [0, 3, 7];
  } else if (suffix.includes("7")) {
    intervals = [0, 4, 7, 10];
  }

  if (suffix.includes("6")) {
    intervals = [...intervals, 9];
  }
  if (suffix.includes("add9")) {
    intervals = [...intervals, 2];
  }
  if (suffix.includes("9")) {
    intervals = [...intervals, 2];
  }

  const pitchClasses = [...new Set(intervals.map((interval) => (rootIndex + interval) % 12))];

  const rootMidi = 48 + rootIndex;
  const sortedIntervals = [...new Set(intervals)].sort((a, b) => a - b);
  const baseVoicing = sortedIntervals.map((interval) => rootMidi + interval);
  const noteNames = pitchClasses.map((index) => PITCH_CLASS_TO_DISPLAY[index]);
  const voicings = [];
  const inversionCount = Math.min(3, baseVoicing.length);

  for (let inversion = 0; inversion < inversionCount; inversion += 1) {
    const workingNotes = [...baseVoicing];
    for (let shift = 0; shift < inversion; shift += 1) {
      const moved = workingNotes.shift();
      if (typeof moved === "number") {
        workingNotes.push(moved + 12);
      }
    }

    const adjusted = workingNotes.map((note) => {
      while (note > 72) {
        note -= 12;
      }
      while (note < 48) {
        note += 12;
      }
      return note;
    }).sort((a, b) => a - b);

    if (bass) {
      const bassIndex = SHARP_NOTES.indexOf(FLAT_TO_SHARP[bass] || bass);
      if (bassIndex !== -1) {
        let bassMidi = 48 + bassIndex;
        while (bassMidi >= adjusted[0]) {
          bassMidi -= 12;
        }
        adjusted.unshift(Math.max(36, bassMidi));
      }
    }

    voicings.push({
      noteNames,
      noteNumbers: adjusted,
    });
  }

  return voicings;
}

function canonicalizeNoteName(note) {
  return SHARP_TO_FLAT[note] ? note : FLAT_TO_SHARP[note] || note;
}

function getSavedVoicingIndex(songId, chordName, optionCount) {
  if (!songId || !chordName || optionCount <= 0) {
    return 0;
  }

  const key = getVoicingSelectionKey(songId, chordName);
  const savedIndex = state.chordVoicingSelections[key];
  if (typeof savedIndex !== "number") {
    return 0;
  }

  return Math.max(0, Math.min(savedIndex, optionCount - 1));
}

function saveVoicingSelection(songId, chordName, index) {
  if (!songId || !chordName) {
    return;
  }

  state.chordVoicingSelections[getVoicingSelectionKey(songId, chordName)] = index;
  saveChordVoicingSelections();
}

function getVoicingSelectionKey(songId, chordName) {
  return `${songId}::${chordName}`;
}
