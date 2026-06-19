(function () {
  const STORAGE_KEY = "brainos.categories.v1";
  const FALLBACK_CATEGORY = "灵感";
  const SYSTEM_FIRST = "收件箱";
  const SYSTEM_LAST = "全部";

  const DEFAULT_CATEGORIES = [
    { id: "cat-inbox", name: SYSTEM_FIRST, isSystem: true, order: 0 },
    { id: "cat-photography", name: "摄影", isSystem: false, order: 10 },
    { id: "cat-film", name: "电影", isSystem: false, order: 20 },
    { id: "cat-investing", name: "投资", isSystem: false, order: 30 },
    { id: "cat-russian", name: "俄语", isSystem: false, order: 40 },
    { id: "cat-travel", name: "旅行", isSystem: false, order: 50 },
    { id: "cat-ideas", name: FALLBACK_CATEGORY, isSystem: false, order: 60 },
    { id: "cat-all", name: SYSTEM_LAST, isSystem: true, order: 9999 }
  ];

  function initialize() {
    if (!localStorage.getItem(STORAGE_KEY)) {
      writeCategories(DEFAULT_CATEGORIES.map((category) => withCreatedAt(category)));
    } else {
      writeCategories(normalizeCategories(readCategories()));
    }
  }

  function readCategories() {
    try {
      const value = localStorage.getItem(STORAGE_KEY);
      const parsed = value ? JSON.parse(value) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.warn("BrainOS 无法读取分类，已恢复默认分类。", error);
      return [];
    }
  }

  function writeCategories(categories) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(categories));
  }

  function withCreatedAt(category) {
    return {
      ...category,
      createdAt: category.createdAt || new Date().toISOString()
    };
  }

  function normalizeCategories(categories) {
    const seenNames = new Set();
    const normalized = [];

    categories.forEach((category, index) => {
      const name = normalizeName(category.name);
      if (!name || seenNames.has(name.toLocaleLowerCase())) {
        return;
      }

      seenNames.add(name.toLocaleLowerCase());
      normalized.push({
        id: category.id || createId(),
        name,
        isSystem: name === SYSTEM_FIRST || name === SYSTEM_LAST,
        order: Number.isFinite(Number(category.order)) ? Number(category.order) : (index + 1) * 10,
        createdAt: category.createdAt || new Date().toISOString()
      });
    });

    if (!normalized.some((category) => category.name === SYSTEM_FIRST)) {
      normalized.push(withCreatedAt({ id: "cat-inbox", name: SYSTEM_FIRST, isSystem: true, order: 0 }));
    }

    if (!normalized.some((category) => category.name === SYSTEM_LAST)) {
      normalized.push(withCreatedAt({ id: "cat-all", name: SYSTEM_LAST, isSystem: true, order: 9999 }));
    }

    return sortCategories(normalized);
  }

  function sortCategories(categories) {
    const inbox = categories.find((category) => category.name === SYSTEM_FIRST);
    const all = categories.find((category) => category.name === SYSTEM_LAST);
    const editable = categories
      .filter((category) => category.name !== SYSTEM_FIRST && category.name !== SYSTEM_LAST)
      .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name, "zh-CN"));

    return [inbox, ...editable, all].filter(Boolean);
  }

  function getAll() {
    initialize();
    return sortCategories(readCategories());
  }

  function getEditable() {
    return getAll().filter((category) => !category.isSystem);
  }

  function exists(name) {
    const cleanName = normalizeName(name);
    return getAll().some((category) => sameName(category.name, cleanName));
  }

  function resolveCategory(name) {
    return exists(name) ? normalizeName(name) : FALLBACK_CATEGORY;
  }

  function addCategory(name) {
    const cleanName = normalizeName(name);
    if (!cleanName) {
      return fail("分类名称不能为空。");
    }

    if (exists(cleanName)) {
      return fail("这个分类已经存在。");
    }

    const categories = getAll();
    const editable = categories.filter((category) => !category.isSystem);
    const maxOrder = editable.reduce((max, category) => Math.max(max, Number(category.order) || 0), 0);
    const nextCategory = {
      id: createId(),
      name: cleanName,
      isSystem: false,
      order: maxOrder + 10,
      createdAt: new Date().toISOString()
    };

    writeCategories(sortCategories([...categories, nextCategory]));
    return ok({ category: nextCategory });
  }

  function renameCategory(id, nextName) {
    const cleanName = normalizeName(nextName);
    if (!cleanName) {
      return fail("分类名称不能为空。");
    }

    const categories = getAll();
    const target = categories.find((category) => category.id === id);
    if (!target) {
      return fail("没有找到这个分类。");
    }

    if (target.isSystem) {
      return fail("系统分类不能重命名。");
    }

    if (categories.some((category) => category.id !== id && sameName(category.name, cleanName))) {
      return fail("这个分类已经存在。");
    }

    const oldName = target.name;
    const updated = categories.map((category) => {
      return category.id === id ? { ...category, name: cleanName } : category;
    });

    writeCategories(sortCategories(updated));
    if (window.BrainOSStorage && typeof window.BrainOSStorage.renameCategory === "function") {
      window.BrainOSStorage.renameCategory(oldName, cleanName);
    }

    return ok({ oldName, newName: cleanName });
  }

  function deleteCategory(id) {
    const categories = getAll();
    const target = categories.find((category) => category.id === id);
    if (!target) {
      return fail("没有找到这个分类。");
    }

    if (target.isSystem) {
      return fail("系统分类不能删除。");
    }

    writeCategories(sortCategories(categories.filter((category) => category.id !== id)));
    if (window.BrainOSStorage && typeof window.BrainOSStorage.moveCategoryNotes === "function") {
      window.BrainOSStorage.moveCategoryNotes(target.name, FALLBACK_CATEGORY);
    }

    return ok({ deletedName: target.name });
  }

  function moveCategory(id, direction) {
    const categories = getAll();
    const editable = getEditable();
    const index = editable.findIndex((category) => category.id === id);
    const nextIndex = direction === "up" ? index - 1 : index + 1;

    if (index === -1 || nextIndex < 0 || nextIndex >= editable.length) {
      return fail("这个分类不能继续移动。");
    }

    const current = editable[index];
    const next = editable[nextIndex];
    const updated = categories.map((category) => {
      if (category.id === current.id) {
        return { ...category, order: next.order };
      }

      if (category.id === next.id) {
        return { ...category, order: current.order };
      }

      return category;
    });

    writeCategories(sortCategories(updated));
    return ok();
  }

  function createId() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
      return window.crypto.randomUUID();
    }

    return `cat-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function normalizeName(name) {
    return String(name || "").trim().replace(/\s+/g, " ");
  }

  function sameName(a, b) {
    return normalizeName(a).toLocaleLowerCase() === normalizeName(b).toLocaleLowerCase();
  }

  function ok(data) {
    return { ok: true, ...(data || {}) };
  }

  function fail(error) {
    return { ok: false, error };
  }

  window.BrainOSCategories = {
    initialize,
    getAll,
    getEditable,
    exists,
    resolveCategory,
    addCategory,
    renameCategory,
    deleteCategory,
    moveCategory,
    fallbackCategory: FALLBACK_CATEGORY,
    firstCategory: SYSTEM_FIRST,
    lastCategory: SYSTEM_LAST
  };
})();
