(function () {
  const STORAGE_KEY = "brainos.notes.v1";

  function readNotes() {
    try {
      const value = localStorage.getItem(STORAGE_KEY);
      const parsed = value ? JSON.parse(value) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.warn("BrainOS 无法读取本地知识库，已使用空列表。", error);
      return [];
    }
  }

  function writeNotes(notes) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
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
    const note = {
      id: createId(),
      ...fields,
      createdAt: now,
      updatedAt: now
    };

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

    const updatedNote = {
      ...existing,
      ...fields,
      updatedAt: new Date().toISOString()
    };

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
    const notes = readNotes();
    const nextNotes = notes.map((note) => {
      if (note.category !== oldName) {
        return note;
      }

      return {
        ...note,
        category: newName,
        tags: replaceTag(note.tags, oldName, newName),
        updatedAt: new Date().toISOString()
      };
    });

    writeNotes(nextNotes);
  }

  function moveCategoryNotes(fromCategory, toCategory) {
    const notes = readNotes();
    const nextNotes = notes.map((note) => {
      if (note.category !== fromCategory) {
        return note;
      }

      return {
        ...note,
        category: toCategory,
        tags: replaceTag(note.tags, fromCategory, toCategory),
        updatedAt: new Date().toISOString()
      };
    });

    writeNotes(nextNotes);
  }

  function buildNoteFields(input, options) {
    const content = String(input.content || "").trim();
    const type = input.type || detectType(content, input);
    const sourceUrl = type === "link" ? content : String(input.sourceUrl || "").trim();
    const imageName = type === "image" ? String(input.imageName || "").trim() : "";
    const imagePreview = type === "image" ? String(input.imagePreview || "").trim() : "";
    const generatedTitle = generateTitle(type, content, sourceUrl, imageName);
    const title = options.useInputTitle
      ? String(input.title || generatedTitle).trim() || generatedTitle
      : generatedTitle;
    const baseTags = window.BrainOSClassifier.parseTags(input.tags);
    const category = window.BrainOSClassifier.classify(title, content || imageName || sourceUrl, baseTags);

    return {
      type,
      title,
      content: type === "image" && !content ? imageName : content,
      summary: generateSummary(type, title, content, sourceUrl),
      category,
      tags: window.BrainOSClassifier.buildTags(baseTags, category),
      sourceUrl,
      imageName,
      imagePreview
    };
  }

  function detectType(content, input) {
    if (input.imagePreview || input.imageName) {
      return "image";
    }

    return isUrl(content) ? "link" : "text";
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

  function generateTitle(type, content, sourceUrl, imageName) {
    if (type === "image") {
      return "图片记录";
    }

    if (type === "link") {
      return getDomain(sourceUrl || content) || "链接记录";
    }

    const title = String(content || "").replace(/\s+/g, " ").trim().slice(0, 20);
    return title || imageName || "未命名知识";
  }

  function generateSummary(type, title, content, sourceUrl) {
    if (type === "image") {
      return "待 AI 识别图片内容";
    }

    const source = String(content || sourceUrl || title || "").trim();
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
