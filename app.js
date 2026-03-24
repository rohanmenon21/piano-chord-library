const STORAGE_KEY = "piano-chord-library-v1";
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
  { note: "C#", left: "10.4%" },
  { note: "D#", left: "25.1%" },
  { note: "F#", left: "53.8%" },
  { note: "G#", left: "68.4%" },
  { note: "A#", left: "82.8%" },
];

const state = {
  songs: loadSongs(),
  selectedSongId: null,
  searchTerm: "",
  saveStatusTimer: null,
  activeTab: "edit",
  hoveredChord: null,
};

const elements = {
  songList: document.querySelector("#song-list"),
  songCount: document.querySelector("#song-count"),
  songSearch: document.querySelector("#song-search"),
  newSongButton: document.querySelector("#new-song-button"),
  deleteSongButton: document.querySelector("#delete-song-button"),
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
  tooltipPiano: document.querySelector("#tooltip-piano"),
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
  elements.preview.addEventListener("mouseleave", hideChordTooltip);

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
  renderTabs();
  renderSongList();
  renderSelectedSong();
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
    hideChordTooltip();
    return;
  }

  const chordName = chordElement.dataset.chord;
  if (!chordName) {
    hideChordTooltip();
    return;
  }

  const chordShape = getChordShape(chordName);
  if (!chordShape) {
    hideChordTooltip();
    return;
  }

  state.hoveredChord = chordName;
  showChordTooltip(chordName, chordShape, chordElement);
}

function handlePreviewMouseMove(event) {
  const chordElement = event.target.closest(".chord-token");
  if (!chordElement && state.hoveredChord) {
    hideChordTooltip();
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
      return `[${renderChordToken(chord)}]`;
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
  const bracketChords = (text.match(/\[[A-G][^\]]*\]/g) || []).length;
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

function showChordTooltip(chordName, chordShape, chordElement) {
  elements.tooltipChordName.textContent = chordName;
  elements.tooltipChordNotes.textContent = chordShape.noteNames.join(" ");
  elements.tooltipPiano.innerHTML = renderPianoKeyboard(chordShape.noteNames);
  chordElement.appendChild(elements.chordTooltip);
  elements.chordTooltip.hidden = false;
}

function hideChordTooltip() {
  state.hoveredChord = null;
  elements.chordTooltip.hidden = true;
  elements.previewPanel.appendChild(elements.chordTooltip);
}

function renderPianoKeyboard(noteNames) {
  const activeSet = new Set(noteNames.map((note) => canonicalizeNoteName(note)));
  const whiteKeysMarkup = WHITE_PIANO_KEYS.map((note) => {
    const isActive = activeSet.has(note);
    return `<div class="piano-key white ${isActive ? "active" : ""}">${note}</div>`;
  }).join("");

  const blackKeysMarkup = BLACK_PIANO_KEYS.map(({ note, left }) => {
    const isActive = activeSet.has(note);
    return `<div class="piano-key black ${isActive ? "active" : ""}" style="left: ${left}">${note}</div>`;
  }).join("");

  return `
    <div class="piano-keyboard">
      <div class="piano-white-keys">${whiteKeysMarkup}</div>
      <div class="piano-black-keys">${blackKeysMarkup}</div>
    </div>
  `;
}

function getChordShape(chord) {
  const trimmed = chord.trim();
  const match = trimmed.match(/^([A-G](?:#|b)?)([^/]*)?(?:\/([A-G](?:#|b)?))?$/);
  if (!match) {
    return null;
  }

  const [, root, rawSuffix = "", bass] = match;
  const normalizedRoot = FLAT_TO_SHARP[root] || root;
  const rootIndex = SHARP_NOTES.indexOf(normalizedRoot);
  if (rootIndex === -1) {
    return null;
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

  if (bass) {
    const bassIndex = SHARP_NOTES.indexOf(FLAT_TO_SHARP[bass] || bass);
    if (bassIndex !== -1 && !pitchClasses.includes(bassIndex)) {
      pitchClasses.unshift(bassIndex);
    }
  }

  return {
    noteNames: pitchClasses.map((index) => PITCH_CLASS_TO_DISPLAY[index]),
  };
}

function canonicalizeNoteName(note) {
  return SHARP_TO_FLAT[note] ? note : FLAT_TO_SHARP[note] || note;
}
