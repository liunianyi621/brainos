(function () {
  const state = {
    activeCategory: "收件箱",
    searchQuery: "",
    selectedNoteId: null,
    pendingImage: null
  };

  const refs = {};

  function init() {
    window.BrainOSCategories.initialize();

    refs.noteForm = document.querySelector("#noteForm");
    refs.dropZone = document.querySelector("#dropZone");
    refs.dropInput = document.querySelector("#dropInput");
    refs.dropStatus = document.querySelector("#dropStatus");
    refs.imageInput = document.querySelector("#imageInput");
    refs.imagePreview = document.querySelector("#imagePreview");
    refs.imagePreviewMedia = document.querySelector("#imagePreviewMedia");
    refs.imageName = document.querySelector("#imageName");
    refs.clearImageButton = document.querySelector("#clearImageButton");
    refs.searchInput = document.querySelector("#searchInput");
    refs.categoryList = document.querySelector("#categoryList");
    refs.manageCategoriesButton = document.querySelector("#manageCategoriesButton");
    refs.activeCategoryLabel = document.querySelector("#activeCategoryLabel");
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
  }

  function bindEvents() {
    refs.noteForm.addEventListener("submit", handleCreateNote);
    refs.imageInput.addEventListener("change", handleImageSelect);
    refs.clearImageButton.addEventListener("click", clearImage);
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

      state.activeCategory = button.dataset.category;
      renderCategories();
      renderNotes();
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
      state.activeCategory = window.BrainOSCategories.firstCategory;
    }

    refs.categoryList.innerHTML = categories.map((category) => {
      const activeClass = category.name === state.activeCategory ? " is-active" : "";
      return `
        <button class="category-button${activeClass}" type="button" data-category="${escapeHtml(category.name)}">
          ${escapeHtml(category.name)}
        </button>
      `;
    }).join("");
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
  }

  function deleteCategory(category) {
    const confirmed = window.confirm("删除分类后，该分类下的笔记会移动到「灵感」。确定删除吗？");
    if (!confirmed) {
      return;
    }

    const result = window.BrainOSCategories.deleteCategory(category.id);
    if (!result.ok) {
      setCategoryMessage(result.error);
      return;
    }

    if (state.activeCategory === result.deletedName) {
      state.activeCategory = window.BrainOSCategories.firstCategory;
    }

    clearCategoryMessage();
    renderCategories();
    renderCategoryManager();
    renderNotes();
  }

  function setCategoryMessage(message) {
    refs.categoryMessage.textContent = message || "";
  }

  function clearCategoryMessage() {
    setCategoryMessage("");
  }

  function handleCreateNote(event) {
    event.preventDefault();
    const content = refs.dropInput.value.trim();

    if (!content && !state.pendingImage) {
      refs.dropZone.classList.add("is-empty");
      refs.dropInput.focus();
      window.setTimeout(() => refs.dropZone.classList.remove("is-empty"), 700);
      return;
    }

    window.BrainOSStorage.createNote({
      content,
      type: state.pendingImage ? "image" : undefined,
      imageName: state.pendingImage ? state.pendingImage.name : "",
      imagePreview: state.pendingImage ? state.pendingImage.dataUrl : ""
    });

    resetDropZone();
    state.activeCategory = window.BrainOSCategories.firstCategory;
    renderCategories();
    renderNotes();
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
    return readImageFile(file).then((dataUrl) => {
      state.pendingImage = {
        name: file.name || "粘贴图片",
        dataUrl
      };

      refs.imagePreviewMedia.src = dataUrl;
      refs.imageName.textContent = state.pendingImage.name;
      refs.dropStatus.textContent = "图片已放入";
      refs.imagePreview.hidden = false;
      refs.dropZone.classList.add("has-image");
    });
  }

  function readImageFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function clearImage() {
    state.pendingImage = null;
    refs.imageInput.value = "";
    refs.imagePreviewMedia.removeAttribute("src");
    refs.imageName.textContent = "";
    refs.dropStatus.textContent = "";
    refs.imagePreview.hidden = true;
    refs.dropZone.classList.remove("has-image");
    refs.dropInput.focus();
  }

  function resetDropZone() {
    refs.noteForm.reset();
    clearImage();
  }

  function getVisibleNotes() {
    const notes = window.BrainOSStorage.getAll();
    const byCategory = notes.filter((note) => {
      if (state.activeCategory === "收件箱" || state.activeCategory === "全部") {
        return true;
      }

      return note.category === state.activeCategory;
    });

    if (!state.searchQuery) {
      return byCategory;
    }

    const query = state.searchQuery.toLocaleLowerCase();
    return byCategory.filter((note) => {
      const text = [
        note.title,
        note.content,
        note.summary,
        note.category,
        note.type,
        note.sourceUrl,
        note.imageName,
        ...(note.tags || [])
      ].join(" ").toLocaleLowerCase();

      return text.includes(query);
    });
  }

  function renderNotes() {
    const notes = getVisibleNotes();
    refs.activeCategoryLabel.textContent = state.activeCategory;
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
          <p class="note-summary">${escapeHtml(note.summary)}</p>
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
          <span class="detail-label">摘要</span>
          <p class="detail-text summary-box">${escapeHtml(note.summary)}</p>
        </div>
        <div class="detail-block">
          <span class="detail-label">分类与标签</span>
          <div class="detail-meta">
            <span class="category-chip">${escapeHtml(note.category)}</span>
            ${renderTags(note.tags)}
          </div>
        </div>
        <div class="detail-block">
          <span class="detail-label">时间</span>
          <p class="detail-text">创建：${escapeHtml(formatDateTime(note.createdAt))}<br>更新：${escapeHtml(formatDateTime(note.updatedAt))}</p>
        </div>
      </div>
    `;

    refs.editTitleInput.value = note.title;
    refs.editContentInput.value = note.content || note.sourceUrl || note.imageName || "";
    refs.editTagsInput.value = (note.tags || []).filter((tag) => tag !== note.category).join(", ");
    setEditMode(false);
  }

  function renderOriginalBlock(note) {
    if (note.type === "image") {
      return `
        <div class="detail-block">
          <span class="detail-label">图片</span>
          ${note.imagePreview ? `<img class="detail-image" src="${escapeHtml(note.imagePreview)}" alt="${escapeHtml(note.imageName || "图片记录")}">` : ""}
          <p class="detail-text">${escapeHtml(note.imageName || note.content || "图片记录")}</p>
        </div>
      `;
    }

    if (note.type === "link") {
      return `
        <div class="detail-block">
          <span class="detail-label">链接</span>
          <a class="detail-link" href="${escapeHtml(normalizeHref(note.sourceUrl || note.content))}" target="_blank" rel="noreferrer">${escapeHtml(note.sourceUrl || note.content)}</a>
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

    const updated = window.BrainOSStorage.updateNote(state.selectedNoteId, {
      title: refs.editTitleInput.value,
      content: refs.editContentInput.value,
      tags: refs.editTagsInput.value,
      type: note.type,
      sourceUrl: note.type === "link" ? refs.editContentInput.value : note.sourceUrl,
      imageName: note.imageName,
      imagePreview: note.imagePreview
    });

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

  function normalizeHref(value) {
    const text = String(value || "").trim();
    return /^https?:\/\//i.test(text) ? text : `https://${text}`;
  }

  function getEmptyTitle() {
    if (state.searchQuery) {
      return "没有找到匹配内容";
    }

    return state.activeCategory === "收件箱" ? "还没有内容" : `还没有${state.activeCategory}内容`;
  }

  function getEmptyDescription() {
    if (state.searchQuery) {
      return "换一个关键词，或者先存入新的知识。";
    }

    return "把文字、链接或图片放进上方空白区。";
  }

  function escapeHtml(value) {
    return String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  window.BrainOSUI = {
    init
  };
})();
