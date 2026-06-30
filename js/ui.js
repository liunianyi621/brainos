(function () {
  const PLACEHOLDERS = {
    "摄影": "粘贴摄影灵感、图片、链接……",
    "电影": "粘贴电影分析、镜头设计、剧本片段……",
    "投资": "粘贴投资观点、股票分析、研究资料……",
    "俄语": "粘贴单词、句子、语法笔记……",
    "旅行": "粘贴攻略、签证信息、地点收藏……",
    "灵感": "记录任何值得保存的想法……",
    "全部": "把任何有价值的信息丢进来……"
  };

  const state = {
    activeCategory: "",
    searchQuery: "",
    selectedNoteId: null,
    currentInput: null,
    saveStatusTimer: null
  };

  const refs = {};

  function init() {
    window.BrainOSCategories.initialize();
    state.activeCategory = window.BrainOSCategories.getFirstWritableCategory();
    setCurrentInput(null);

    refs.noteForm = document.querySelector("#noteForm");
    refs.titleInput = document.querySelector("#titleInput");
    refs.dropZone = document.querySelector("#dropZone");
    refs.dropInput = document.querySelector("#dropInput");
    refs.dropStatus = document.querySelector("#dropStatus");
    refs.imageInput = document.querySelector("#imageInput");
    refs.imagePreview = document.querySelector("#imagePreview");
    refs.imagePreviewMedia = document.querySelector("#imagePreviewMedia");
    refs.imageName = document.querySelector("#imageName");
    refs.imageMeta = document.querySelector("#imageMeta");
    refs.clearImageButton = document.querySelector("#clearImageButton");
    refs.submitButton = refs.noteForm.querySelector("button[type='submit']");
    refs.saveStatus = document.querySelector("#saveStatus");
    refs.searchInput = document.querySelector("#searchInput");
    refs.categoryList = document.querySelector("#categoryList");
    refs.memoryCategoryList = document.querySelector("#memoryCategoryList");
    refs.manageCategoriesButton = document.querySelector("#manageCategoriesButton");
    refs.activeCategoryLabel = document.querySelector("#activeCategoryLabel");
    refs.memoryTitle = document.querySelector("#memoryTitle");
    refs.noteCount = document.querySelector("#noteCount");
    refs.notesList = document.querySelector("#notesList");
    refs.detailModal = document.querySelector("#detailModal");
    refs.modalTitle = document.querySelector("#modalTitle");
    refs.detailView = document.querySelector("#detailView");
    refs.editForm = document.querySelector("#editForm");
    refs.editTitleInput = document.querySelector("#editTitleInput");
    refs.editContentInput = document.querySelector("#editContentInput");
    refs.editTagsInput = document.querySelector("#editTagsInput");
    refs.closeModalButton = document.querySelector("#closeModalButton");
    refs.deleteNoteButton = document.querySelector("#deleteNoteButton");
    refs.editNoteButton = document.querySelector("#editNoteButton");
    refs.cancelEditButton = document.querySelector("#cancelEditButton");
    refs.saveEditButton = document.querySelector("#saveEditButton");
    refs.categoryModal = document.querySelector("#categoryModal");
    refs.closeCategoryModalButton = document.querySelector("#closeCategoryModalButton");
    refs.categoryManagerList = document.querySelector("#categoryManagerList");
    refs.addCategoryForm = document.querySelector("#addCategoryForm");
    refs.newCategoryInput = document.querySelector("#newCategoryInput");
    refs.categoryMessage = document.querySelector("#categoryMessage");

    bindEvents();
    renderCategories();
    renderNotes();
    updateDropPlaceholder();
  }

  function bindEvents() {
    refs.noteForm.addEventListener("submit", handleCreateNote);
    refs.imageInput.addEventListener("change", handleImageSelect);
    refs.clearImageButton.addEventListener("click", () => clearImage(true));
    refs.dropInput.addEventListener("paste", handlePaste);
    refs.dropZone.addEventListener("dragenter", handleDragEnter);
    refs.dropZone.addEventListener("dragover", handleDragEnter);
    refs.dropZone.addEventListener("dragleave", handleDragLeave);
    refs.dropZone.addEventListener("drop", handleDrop);
    refs.searchInput.addEventListener("input", (event) => {
      state.searchQuery = event.target.value.trim();
      renderNotes();
    });

    refs.categoryList.addEventListener("click", (event) => {
      const button = event.target.closest("[data-category]");
      if (!button) {
        return;
      }

      selectCategory(button.dataset.category);
    });

    refs.memoryCategoryList.addEventListener("click", (event) => {
      const button = event.target.closest("[data-category]");
      if (!button) {
        return;
      }

      selectCategory(button.dataset.category);
    });

    refs.manageCategoriesButton.addEventListener("click", openCategoryManager);
    refs.closeCategoryModalButton.addEventListener("click", closeCategoryManager);
    refs.categoryModal.addEventListener("click", (event) => {
      if (event.target === refs.categoryModal) {
        closeCategoryManager();
      }
    });
    refs.categoryManagerList.addEventListener("click", handleCategoryManagerAction);
    refs.addCategoryForm.addEventListener("submit", handleAddCategory);

    refs.notesList.addEventListener("click", (event) => {
      const card = event.target.closest("[data-note-id]");
      if (card) {
        openDetail(card.dataset.noteId);
      }
    });

    refs.closeModalButton.addEventListener("click", closeDetail);
    refs.detailModal.addEventListener("click", (event) => {
      if (event.target === refs.detailModal) {
        closeDetail();
      }
    });

    document.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") {
        return;
      }

      if (refs.categoryModal.classList.contains("is-open")) {
        closeCategoryManager();
        return;
      }

      if (refs.detailModal.classList.contains("is-open")) {
        closeDetail();
      }
    });

    refs.editNoteButton.addEventListener("click", startEditing);
    refs.cancelEditButton.addEventListener("click", stopEditing);
    refs.saveEditButton.addEventListener("click", saveEdit);
    refs.deleteNoteButton.addEventListener("click", deleteSelectedNote);
  }

  function renderCategories() {
    const categories = window.BrainOSCategories.getAll();
    const activeStillExists = categories.some((category) => category.name === state.activeCategory);

    if (!activeStillExists) {
      state.activeCategory = window.BrainOSCategories.getFirstWritableCategory();
    }

    refs.categoryList.innerHTML = categories.map((category) => {
      return renderCategoryButton(category, "category-button");
    }).join("");

    refs.memoryCategoryList.innerHTML = categories.map((category) => {
      return renderCategoryButton(category, "memory-category-button");
    }).join("");
  }

  function renderCategoryButton(category, className) {
    const activeClass = category.name === state.activeCategory ? " is-active" : "";

    return `
      <button class="${className}${activeClass}" type="button" data-category="${escapeHtml(category.name)}">
        ${escapeHtml(category.name)}
      </button>
    `;
  }

  function selectCategory(category) {
    state.activeCategory = category;
    renderCategories();
    renderNotes();
    updateDropPlaceholder();
  }

  function updateDropPlaceholder() {
    const category = state.activeCategory;
    refs.dropInput.placeholder = PLACEHOLDERS[category] || `粘贴${category}相关内容、图片、链接……`;
  }

  function openCategoryManager() {
    clearCategoryMessage();
    renderCategoryManager();
    refs.categoryModal.classList.add("is-open");
    refs.categoryModal.setAttribute("aria-hidden", "false");
    refs.newCategoryInput.focus();
  }

  function closeCategoryManager() {
    refs.categoryModal.classList.remove("is-open");
    refs.categoryModal.setAttribute("aria-hidden", "true");
    refs.addCategoryForm.reset();
    clearCategoryMessage();
  }

  function renderCategoryManager() {
    const categories = window.BrainOSCategories.getEditable();

    if (categories.length === 0) {
      refs.categoryManagerList.innerHTML = `
        <div class="category-empty">还没有自定义分类。</div>
      `;
      return;
    }

    refs.categoryManagerList.innerHTML = categories.map((category, index) => {
      return `
        <div class="category-row" data-category-id="${escapeHtml(category.id)}">
          <span class="category-row-name">${escapeHtml(category.name)}</span>
          <div class="category-row-actions">
            <button class="mini-button" type="button" data-action="up" ${index === 0 ? "disabled" : ""}>上移</button>
            <button class="mini-button" type="button" data-action="down" ${index === categories.length - 1 ? "disabled" : ""}>下移</button>
            <button class="mini-button" type="button" data-action="rename">重命名</button>
            <button class="mini-button danger-mini" type="button" data-action="delete">删除</button>
          </div>
        </div>
      `;
    }).join("");
  }

  function handleAddCategory(event) {
    event.preventDefault();
    const result = window.BrainOSCategories.addCategory(refs.newCategoryInput.value);

    if (!result.ok) {
      setCategoryMessage(result.error);
      return;
    }

    refs.addCategoryForm.reset();
    setCategoryMessage("已添加分类。");
    renderCategories();
    renderCategoryManager();
    renderNotes();
    updateDropPlaceholder();
    refs.newCategoryInput.focus();
  }

  function handleCategoryManagerAction(event) {
    const button = event.target.closest("[data-action]");
    if (!button) {
      return;
    }

    const row = button.closest("[data-category-id]");
    const categoryId = row && row.dataset.categoryId;
    const category = window.BrainOSCategories.getEditable().find((item) => item.id === categoryId);
    const action = button.dataset.action;

    if (!category) {
      return;
    }

    if (action === "rename") {
      renameCategory(category);
      return;
    }

    if (action === "delete") {
      deleteCategory(category);
      return;
    }

    const result = window.BrainOSCategories.moveCategory(category.id, action);
    if (!result.ok) {
      setCategoryMessage(result.error);
      return;
    }

    clearCategoryMessage();
    renderCategories();
    renderCategoryManager();
  }

  function renameCategory(category) {
    const nextName = window.prompt("新的分类名称", category.name);
    if (nextName === null) {
      return;
    }

    const result = window.BrainOSCategories.renameCategory(category.id, nextName);
    if (!result.ok) {
      setCategoryMessage(result.error);
      return;
    }

    if (state.activeCategory === result.oldName) {
      state.activeCategory = result.newName;
    }

    clearCategoryMessage();
    renderCategories();
    renderCategoryManager();
    renderNotes();
    updateDropPlaceholder();
  }

  function deleteCategory(category) {
    const confirmed = window.confirm("删除分类后，该分类下的记忆会移动到可用分类。确定删除吗？");
    if (!confirmed) {
      return;
    }

    const result = window.BrainOSCategories.deleteCategory(category.id);
    if (!result.ok) {
      setCategoryMessage(result.error);
      return;
    }

    if (state.activeCategory === result.deletedName) {
      state.activeCategory = result.fallbackCategory;
    }

    clearCategoryMessage();
    renderCategories();
    renderCategoryManager();
    renderNotes();
    updateDropPlaceholder();
  }

  function setCategoryMessage(message) {
    refs.categoryMessage.textContent = message || "";
  }

  function clearCategoryMessage() {
    setCategoryMessage("");
  }

  async function handleCreateNote(event) {
    event.preventDefault();
    const title = refs.titleInput.value.trim();
    const content = refs.dropInput.value.trim();
    const category = window.BrainOSCategories.getWritableCategory(state.activeCategory);
    const currentInput = state.currentInput;
    const hasImageInput = currentInput && currentInput.type === "image" && currentInput.imageData;
    const hasTextInput = Boolean(content);

    if (!hasTextInput && !hasImageInput) {
      refs.dropZone.classList.add("is-empty");
      refs.dropInput.focus();
      showSaveStatus("先放入文字、链接或图片。", "error");
      window.setTimeout(() => refs.dropZone.classList.remove("is-empty"), 700);
      return;
    }

    refs.submitButton.disabled = true;
    showSaveStatus("正在保存");

    try {
      const resolvedTitle = title || await resolveAutoTitle(content, hasImageInput);
      const savedNote = window.BrainOSStorage.createNote({
        title: resolvedTitle,
        content,
        category,
        type: hasImageInput ? "image" : undefined,
        imageData: hasImageInput ? currentInput.imageData : "",
        imageSize: hasImageInput ? currentInput.imageSize : null,
        originalImageName: hasImageInput ? currentInput.originalImageName : ""
      });

      if (!savedNote || !window.BrainOSStorage.getById(savedNote.id)) {
        throw new Error("SAVE_VERIFY_FAILED");
      }

      resetDropZone();
      renderCategories();
      renderNotes();
      updateDropPlaceholder();
      showSaveStatus("保存成功", "success");
    } catch (error) {
      console.error("BrainOS 整理并存入失败。", error);
      showSaveStatus(`保存失败：${getSaveErrorMessage(error)}`, "error");
    } finally {
      refs.submitButton.disabled = false;
    }
  }

  function handleDragEnter(event) {
    event.preventDefault();
    refs.dropZone.classList.add("is-dragging");
  }

  function handleDragLeave(event) {
    if (!refs.dropZone.contains(event.relatedTarget)) {
      refs.dropZone.classList.remove("is-dragging");
    }
  }

  async function handleDrop(event) {
    event.preventDefault();
    refs.dropZone.classList.remove("is-dragging");

    const imageFile = Array.from(event.dataTransfer.files || []).find((file) => file.type.startsWith("image/"));
    if (imageFile) {
      await setImage(imageFile);
      return;
    }

    const droppedText = event.dataTransfer.getData("text/uri-list") || event.dataTransfer.getData("text/plain");
    if (droppedText) {
      refs.dropInput.value = droppedText.trim();
      refs.dropInput.focus();
    }
  }

  async function handlePaste(event) {
    const imageItem = Array.from(event.clipboardData.items || []).find((item) => item.type.startsWith("image/"));
    if (!imageItem) {
      return;
    }

    const file = imageItem.getAsFile();
    if (!file) {
      return;
    }

    event.preventDefault();
    await setImage(file);
  }

  async function handleImageSelect(event) {
    const file = event.target.files && event.target.files[0];
    if (file) {
      await setImage(file);
    }
  }

  function setImage(file) {
    refs.dropStatus.textContent = "正在压缩图片…";
    clearSaveStatus();

    return window.BrainOSImageProcessor.process(file).then((processedImage) => {
      setCurrentInput({
        type: "image",
        imageData: processedImage.imageData,
        originalImageName: processedImage.originalImageName,
        imageSize: processedImage.imageSize
      });

      refs.imagePreviewMedia.src = processedImage.imageData;
      refs.imageName.textContent = processedImage.originalImageName || "图片";
      refs.imageMeta.textContent = getImageMetaText(processedImage.imageSize);
      refs.dropStatus.textContent = "图片已压缩，可存入记忆库";
      refs.imagePreview.hidden = false;
      refs.dropZone.classList.add("has-image");
      return true;
    }).catch((error) => {
      console.error("BrainOS 图片处理失败。", error);
      setCurrentInput(null);
      refs.dropStatus.textContent = "";
      refs.imageInput.value = "";

      if (error && error.code === "IMAGE_TOO_LARGE") {
        showSaveStatus("这张图片仍然太大。当前本地版本建议保存图片说明，未来可接入云存储。", "error");
        return false;
      }

      showSaveStatus("图片读取失败，请换一张图片。", "error");
      return false;
    });
  }

  function getImageMetaText(imageSize) {
    if (!imageSize) {
      return "";
    }

    const original = window.BrainOSImageProcessor.formatBytes(imageSize.originalBytes);
    const compressed = window.BrainOSImageProcessor.formatBytes(imageSize.compressedBytes);
    return `原图 ${original} · 压缩后 ${compressed}`;
  }

  function clearImage(shouldFocus) {
    setCurrentInput(null);
    refs.imageInput.value = "";
    refs.imagePreviewMedia.removeAttribute("src");
    refs.imageName.textContent = "";
    refs.imageMeta.textContent = "";
    refs.dropStatus.textContent = "";
    refs.imagePreview.hidden = true;
    refs.dropZone.classList.remove("has-image");

    if (shouldFocus) {
      refs.dropInput.focus();
    }
  }

  function resetDropZone() {
    refs.noteForm.reset();
    clearImage(false);
  }

  function showSaveStatus(message, type) {
    if (!refs.saveStatus) {
      return;
    }

    window.clearTimeout(state.saveStatusTimer);
    refs.saveStatus.textContent = message || "";
    refs.saveStatus.className = `save-status${type ? ` is-${type}` : ""}`;

    if (message) {
      state.saveStatusTimer = window.setTimeout(clearSaveStatus, type === "error" ? 6200 : 2600);
    }
  }

  function clearSaveStatus() {
    if (!refs.saveStatus) {
      return;
    }

    window.clearTimeout(state.saveStatusTimer);
    refs.saveStatus.textContent = "";
    refs.saveStatus.className = "save-status";
  }

  async function resolveAutoTitle(content, hasImageInput) {
    if (hasImageInput || !isLikelyUrl(content)) {
      return "";
    }

    return fetchPageTitle(normalizeInputUrl(content));
  }

  function isLikelyUrl(value) {
    const text = String(value || "").trim();
    if (!text || /\s/.test(text)) {
      return false;
    }

    try {
      const url = new URL(normalizeInputUrl(text));
      return Boolean(url.hostname && url.hostname.includes("."));
    } catch (error) {
      return false;
    }
  }

  function normalizeInputUrl(value) {
    const text = String(value || "").trim();
    return /^https?:\/\//i.test(text) ? text : `https://${text}`;
  }

  async function fetchPageTitle(url) {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 2200);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        credentials: "omit"
      });
      const html = await response.text();
      const match = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      return match ? decodeHtmlEntity(match[1]).trim().slice(0, 80) : "";
    } catch (error) {
      return "";
    } finally {
      window.clearTimeout(timeoutId);
    }
  }

  function decodeHtmlEntity(value) {
    const textarea = document.createElement("textarea");
    textarea.innerHTML = value;
    return textarea.value;
  }

  function getSaveErrorMessage(error) {
    if (error && error.message === "LOCAL_STORAGE_QUOTA_EXCEEDED") {
      return "图片存储失败：浏览器本地空间不足。请尝试更小的图片或删除旧内容。";
    }

    if (error && error.message === "SAVE_VERIFY_FAILED") {
      return "保存失败：本地写入没有完成，请再试一次。";
    }

    return "保存失败，请再试一次。";
  }

  function getVisibleNotes() {
    const notes = window.BrainOSStorage.getAll();

    if (state.searchQuery) {
      const query = state.searchQuery.toLocaleLowerCase();
      return notes.filter((note) => matchesSearch(note, query));
    }

    if (state.activeCategory === window.BrainOSCategories.lastCategory) {
      return notes;
    }

    return notes.filter((note) => note.category === state.activeCategory);
  }

  function matchesSearch(note, query) {
    const text = [
      note.title,
      note.content,
      note.summary,
      note.category,
      note.url,
      note.originalImageName,
      ...(note.tags || [])
    ].join(" ").toLocaleLowerCase();

    return text.includes(query);
  }

  function renderNotes() {
    const notes = getVisibleNotes();

    refs.activeCategoryLabel.textContent = state.searchQuery ? "全部记忆" : state.activeCategory;
    refs.memoryTitle.textContent = state.searchQuery ? "搜索结果" : "记忆库";
    refs.noteCount.textContent = `${notes.length} 条`;

    if (notes.length === 0) {
      refs.notesList.innerHTML = `
        <div class="empty-state">
          <strong>${escapeHtml(getEmptyTitle())}</strong>
          <span>${escapeHtml(getEmptyDescription())}</span>
        </div>
      `;
      return;
    }

    refs.notesList.innerHTML = notes.map(renderNoteCard).join("");
  }

  function renderNoteCard(note) {
    return `
      <button class="note-card" type="button" data-note-id="${escapeHtml(note.id)}">
        <div class="note-card-main">
          <h3>${escapeHtml(note.title)}</h3>
          <p class="note-summary">${escapeHtml(getNotePreview(note))}</p>
        </div>
        <div class="note-meta">
          <span class="category-chip">${escapeHtml(note.category)}</span>
          <span class="time-text">${escapeHtml(formatDateTime(note.createdAt))}</span>
        </div>
      </button>
    `;
  }

  function openDetail(noteId) {
    const note = window.BrainOSStorage.getById(noteId);
    if (!note) {
      return;
    }

    state.selectedNoteId = note.id;
    refs.detailModal.classList.add("is-open");
    refs.detailModal.setAttribute("aria-hidden", "false");
    renderDetail(note);
  }

  function closeDetail() {
    refs.detailModal.classList.remove("is-open");
    refs.detailModal.setAttribute("aria-hidden", "true");
    state.selectedNoteId = null;
    setEditMode(false);
  }

  function renderDetail(note) {
    refs.modalTitle.textContent = note.title;
    refs.detailView.innerHTML = `
      <div class="detail-content">
        ${renderOriginalBlock(note)}
        <div class="detail-block">
          <span class="detail-label">时间</span>
          <p class="detail-text">创建：${escapeHtml(formatDateTime(note.createdAt))}<br>更新：${escapeHtml(formatDateTime(note.updatedAt))}</p>
        </div>
      </div>
    `;

    refs.editTitleInput.value = note.title;
    refs.editContentInput.value = getEditableContent(note);
    refs.editTagsInput.value = (note.tags || []).filter((tag) => tag !== note.category).join(", ");
    setEditMode(false);
  }

  function renderOriginalBlock(note) {
    if (note.type === "image") {
      return `
        ${note.content ? `
          <div class="detail-block">
            <span class="detail-label">内容</span>
            <p class="detail-text">${escapeHtml(note.content)}</p>
          </div>
        ` : ""}
        <div class="detail-block">
          <span class="detail-label">图片</span>
          ${note.imageData ? `<img class="detail-image" src="${escapeHtml(note.imageData)}" alt="${escapeHtml(note.originalImageName || "图片")}">` : ""}
          <p class="detail-text">${escapeHtml(note.originalImageName || "图片")}</p>
        </div>
      `;
    }

    if (note.type === "link") {
      return `
        <div class="detail-block">
          <span class="detail-label">链接</span>
          <a class="detail-link" href="${escapeHtml(note.url)}" target="_blank" rel="noreferrer">${escapeHtml(note.url)}</a>
        </div>
      `;
    }

    return `
      <div class="detail-block">
        <span class="detail-label">内容</span>
        <p class="detail-text">${escapeHtml(note.content || "没有内容。")}</p>
      </div>
    `;
  }

  function getEditableContent(note) {
    if (note.type === "link") {
      return note.url || "";
    }

    return note.content || "";
  }

  function startEditing() {
    setEditMode(true);
    refs.editTitleInput.focus();
  }

  function stopEditing() {
    const note = window.BrainOSStorage.getById(state.selectedNoteId);
    if (note) {
      renderDetail(note);
    }
  }

  function saveEdit() {
    const note = window.BrainOSStorage.getById(state.selectedNoteId);
    if (!note) {
      return;
    }

    const input = {
      title: refs.editTitleInput.value,
      content: note.type === "link" ? "" : refs.editContentInput.value,
      url: note.type === "link" ? refs.editContentInput.value : note.url,
      tags: refs.editTagsInput.value,
      type: note.type,
      category: note.category,
      imageData: note.imageData,
      imageSize: note.imageSize,
      originalImageName: note.originalImageName
    };
    const updated = window.BrainOSStorage.updateNote(state.selectedNoteId, input);

    if (updated) {
      renderDetail(updated);
      renderNotes();
    }
  }

  function deleteSelectedNote() {
    const note = window.BrainOSStorage.getById(state.selectedNoteId);
    if (!note) {
      return;
    }

    const confirmed = window.confirm(`确定删除「${note.title}」吗？`);
    if (!confirmed) {
      return;
    }

    window.BrainOSStorage.deleteNote(note.id);
    closeDetail();
    renderNotes();
  }

  function setEditMode(isEditing) {
    refs.detailView.hidden = isEditing;
    refs.editForm.hidden = !isEditing;
    refs.editNoteButton.hidden = isEditing;
    refs.cancelEditButton.hidden = !isEditing;
    refs.saveEditButton.hidden = !isEditing;
  }

  function renderTags(tags) {
    return (tags || [])
      .map((tag) => `<span class="tag-pill">${escapeHtml(tag)}</span>`)
      .join("");
  }

  function getNotePreview(note) {
    if (note.type === "link") {
      return note.url || note.summary || "链接";
    }

    if (note.type === "image") {
      return note.content || note.summary || note.originalImageName || "图片";
    }

    return note.summary || note.content || "没有内容";
  }

  function formatDateTime(value) {
    if (!value) {
      return "未知时间";
    }

    return new Intl.DateTimeFormat("zh-CN", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    }).format(new Date(value));
  }

  function getEmptyTitle() {
    if (state.searchQuery) {
      return "没有找到相关记忆";
    }

    return "还没有记忆";
  }

  function getEmptyDescription() {
    if (state.searchQuery) {
      return "换个关键词试试。";
    }

    return "把文字、图片或链接放进去，它会出现在这里。";
  }

  function escapeHtml(value) {
    return String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function setCurrentInput(input) {
    state.currentInput = input;
  }

  window.BrainOSUI = {
    init
  };
})();
