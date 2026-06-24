(function () {
  const STORAGE_KEY = "brainos.notes.v1";

  function readRawNotes() {
    try {
      const value = localStorage.getItem(STORAGE_KEY);
      const parsed = value ? JSON.parse(value) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.warn("BrainOS 无法读取本地知识库，已使用空列表。", error);
      return [];
    }
  }

  function readNotes() {
    return readRawNotes().map(normalizeNote);
  }

  function writeNotes(notes) {
    const payload = JSON.stringify(notes.map(normalizeNote));

    try {
      localStorage.setItem(STORAGE_KEY, payload);
    } catch (error) {
      console.error("BrainOS 保存本地知识库失败。", error);
      throw new Error("LOCAL_STORAGE_QUOTA_EXCEEDED");
    }
  }

  function createId() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
      return window.crypto.randomUUID();
    }

    return `note-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function getAll() {
    return readNotes().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  function getById(id) {
    return readNotes().find((note) => note.id === id) || null;
  }

  function createNote(input) {
    const now = new Date().toISOString();
    const fields = buildNoteFields(input, { useInputTitle: false });
    const note = normalizeNote({
      id: createId(),
      ...fields,
      createdAt: now,
      updatedAt: now
    });

    const notes = readNotes();
    notes.unshift(note);
    writeNotes(notes);
    return note;
  }

  function updateNote(id, input) {
    const notes = readNotes();
    const index = notes.findIndex((note) => note.id === id);

    if (index === -1) {
      return null;
    }

    const existing = notes[index];
    const fields = buildNoteFields({ ...existing, ...input }, { useInputTitle: true });
    const updatedNote = normalizeNote({
      ...existing,
      ...fields,
      updatedAt: new Date().toISOString()
    });

    notes[index] = updatedNote;
    writeNotes(notes);
    return updatedNote;
  }

  function deleteNote(id) {
    const notes = readNotes();
    const nextNotes = notes.filter((note) => note.id !== id);
    writeNotes(nextNotes);
  }

  function renameCategory(oldName, newName) {
    const notes = readRawNotes();
    const nextNotes = notes.map((note) => {
      if (note.category !== oldName) {
        return normalizeNote(note);
      }

      return normalizeNote({
        ...note,
        category: newName,
        tags: replaceTag(note.tags, oldName, newName),
        updatedAt: new Date().toISOString()
      });
    });

    writeNotes(nextNotes);
  }

  function moveCategoryNotes(fromCategory, toCategory) {
    const notes = readRawNotes();
    const nextNotes = notes.map((note) => {
      if (note.category !== fromCategory) {
        return normalizeNote(note);
      }

      return normalizeNote({
        ...note,
        category: toCategory,
        tags: replaceTag(note.tags, fromCategory, toCategory),
        updatedAt: new Date().toISOString()
      });
    });

    writeNotes(nextNotes);
  }

  function buildNoteFields(input, options) {
    const content = String(input.content || "").trim();
    const type = normalizeType(input.type || detectType(content, input));
    const url = type === "link" ? normalizeUrl(input.url || input.sourceUrl || content) : "";
    const imageData = type === "image" ? String(input.imageData || input.imagePreview || "").trim() : "";
    const originalImageName = type === "image" ? String(input.originalImageName || input.imageName || "").trim() : "";
    const imageSize = type === "image" ? normalizeImageSize(input.imageSize) : null;
    const category = resolveInputCategory(input.category);
    const generatedTitle = generateTitle(type, content, url, originalImageName);
    const title = options.useInputTitle
      ? String(input.title || generatedTitle).trim() || generatedTitle
      : generatedTitle;
    const summary = generateSummary(type, title, content, url, originalImageName);
    const baseTags = window.BrainOSClassifier.parseTags(input.tags);
    const aiTags = window.BrainOSAI ? window.BrainOSAI.generateTags({ type, title, content, url, category }) : [];

    return {
      type,
      title,
      content: type === "image" && !content ? "" : content,
      url,
      imageData,
      imageSize,
      originalImageName,
      summary,
      category,
      tags: window.BrainOSClassifier.buildTags([...baseTags, ...aiTags], category)
    };
  }

  function normalizeNote(note) {
    const type = normalizeType(note.type || detectType(note.content, note));
    const category = normalizeLegacyCategory(note.category);
    const url = type === "link" ? normalizeUrl(note.url || note.sourceUrl || note.content) : "";
    const imageData = type === "image" ? String(note.imageData || note.imagePreview || "").trim() : "";
    const originalImageName = type === "image" ? String(note.originalImageName || note.imageName || "").trim() : "";
    const content = type === "link" ? String(note.content || "").trim() : String(note.content || "").trim();
    const title = String(note.title || generateTitle(type, content, url, originalImageName)).trim();
    const summary = String(note.summary || generateSummary(type, title, content, url, originalImageName)).trim();

    return {
      ...note,
      type,
      title,
      content,
      url,
      imageData,
      imageSize: type === "image" ? normalizeImageSize(note.imageSize) : null,
      originalImageName,
      summary,
      category,
      tags: window.BrainOSClassifier.buildTags(note.tags, category),
      createdAt: note.createdAt || new Date().toISOString(),
      updatedAt: note.updatedAt || note.createdAt || new Date().toISOString()
    };
  }

  function detectType(content, input) {
    if (input && (input.imageData || input.imagePreview || input.originalImageName || input.imageName)) {
      return "image";
    }

    return isUrl(content) ? "link" : "text";
  }

  function normalizeType(type) {
    return ["image", "link", "text"].includes(type) ? type : "text";
  }

  function resolveInputCategory(category) {
    if (window.BrainOSCategories && typeof window.BrainOSCategories.getWritableCategory === "function") {
      return window.BrainOSCategories.getWritableCategory(category);
    }

    return normalizeLegacyCategory(category);
  }

  function normalizeLegacyCategory(category) {
    const cleanCategory = String(category || "").trim();

    if (!cleanCategory || cleanCategory === "收件箱" || cleanCategory === "全部") {
      return window.BrainOSCategories ? window.BrainOSCategories.getFallbackCategory() : "灵感";
    }

    if (window.BrainOSCategories && typeof window.BrainOSCategories.resolveCategory === "function") {
      return window.BrainOSCategories.resolveCategory(cleanCategory);
    }

    return cleanCategory;
  }

  function isUrl(value) {
    const text = String(value || "").trim();
    if (!text || /\s/.test(text)) {
      return false;
    }

    try {
      const candidate = /^https?:\/\//i.test(text) ? text : `https://${text}`;
      const url = new URL(candidate);
      return Boolean(url.hostname && url.hostname.includes("."));
    } catch (error) {
      return false;
    }
  }

  function normalizeUrl(value) {
    const text = String(value || "").trim();
    if (!text) {
      return "";
    }

    return /^https?:\/\//i.test(text) ? text : `https://${text}`;
  }

  function generateTitle(type, content, url, originalImageName) {
    const contentTitle = String(content || "").replace(/\s+/g, " ").trim().slice(0, 20);

    if (type === "image") {
      return contentTitle || originalImageName || "图片";
    }

    if (type === "link") {
      return getDomain(url || content) || "链接记录";
    }

    return contentTitle || originalImageName || "未命名知识";
  }

  function generateSummary(type, title, content, url, originalImageName) {
    if (type === "image") {
      return String(content || "").trim() || "图片";
    }

    if (window.BrainOSAI && typeof window.BrainOSAI.generateSummary === "function") {
      return window.BrainOSAI.generateSummary({ type, title, content, url, originalImageName });
    }

    const source = String(content || url || title || "").trim();
    const summary = source.slice(0, 120);
    return source.length > 120 ? `${summary}…` : summary;
  }

  function getDomain(value) {
    try {
      const text = String(value || "").trim();
      const candidate = /^https?:\/\//i.test(text) ? text : `https://${text}`;
      return new URL(candidate).hostname.replace(/^www\./i, "");
    } catch (error) {
      return "";
    }
  }

  function normalizeImageSize(imageSize) {
    if (!imageSize || typeof imageSize !== "object") {
      return null;
    }

    return {
      originalBytes: Number(imageSize.originalBytes) || 0,
      compressedBytes: Number(imageSize.compressedBytes) || 0,
      width: Number(imageSize.width) || 0,
      height: Number(imageSize.height) || 0,
      quality: Number(imageSize.quality) || 0
    };
  }

  function replaceTag(tags, oldName, newName) {
    const existingTags = Array.isArray(tags) ? tags : [];
    const replacedTags = existingTags.map((tag) => tag === oldName ? newName : tag);
    const hasNewName = replacedTags.some((tag) => tag === newName);
    return window.BrainOSClassifier.parseTags(hasNewName ? replacedTags : [...replacedTags, newName]);
  }

  window.BrainOSStorage = {
    getAll,
    getById,
    createNote,
    updateNote,
    deleteNote,
    renameCategory,
    moveCategoryNotes
  };
})();
