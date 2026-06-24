(function () {
  const STORAGE_KEY = "brainos.categories.v1";
  const SYSTEM_LAST = "全部";
  const FALLBACK_CATEGORY = "灵感";
  let initialized = false;

  const DEFAULT_CATEGORIES = [
    { id: "cat-photography", name: "摄影", isSystem: false, order: 10 },
    { id: "cat-film", name: "电影", isSystem: false, order: 20 },
    { id: "cat-investing", name: "投资", isSystem: false, order: 30 },
    { id: "cat-russian", name: "俄语", isSystem: false, order: 40 },
    { id: "cat-travel", name: "旅行", isSystem: false, order: 50 },
    { id: "cat-ideas", name: FALLBACK_CATEGORY, isSystem: false, order: 60 },
    { id: "cat-all", name: SYSTEM_LAST, isSystem: true, order: 9999 }
  ];

  function initialize() {
    if (initialized) {
      return;
    }

    if (!localStorage.getItem(STORAGE_KEY)) {
      writeCategories(DEFAULT_CATEGORIES.map((category) => withCreatedAt(category)));
      initialized = true;
      return;
    }

    writeCategories(normalizeCategories(readCategories()));
    initialized = true;
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

      if (!name || name === "收件箱" || seenNames.has(name.toLocaleLowerCase())) {
        return;
      }

      seenNames.add(name.toLocaleLowerCase());
      normalized.push({
        id: category.id || createId(),
        name,
        isSystem: name === SYSTEM_LAST,
        order: name === SYSTEM_LAST ? 9999 : getOrder(category, index),
        createdAt: category.createdAt || new Date().toISOString()
      });
    });

    if (!normalized.some((category) => category.name === SYSTEM_LAST)) {
      normalized.push(withCreatedAt({ id: "cat-all", name: SYSTEM_LAST, isSystem: true, order: 9999 }));
    }

    if (!normalized.some((category) => category.name !== SYSTEM_LAST)) {
      normalized.push(withCreatedAt({ id: "cat-ideas", name: FALLBACK_CATEGORY, isSystem: false, order: 10 }));
    }

    return sortCategories(normalized);
  }

  function getOrder(category, index) {
    return Number.isFinite(Number(category.order)) ? Number(category.order) : (index + 1) * 10;
  }

  function sortCategories(categories) {
    const all = categories.find((category) => category.name === SYSTEM_LAST);
    const editable = categories
      .filter((category) => category.name !== SYSTEM_LAST)
      .map((category) => ({ ...category, isSystem: false }))
      .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name, "zh-CN"));

    return [...editable, all || withCreatedAt({ id: "cat-all", name: SYSTEM_LAST, isSystem: true, order: 9999 })];
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
    return exists(name) ? normalizeName(name) : getFallbackCategory();
  }

  function getWritableCategory(name) {
    const cleanName = normalizeName(name);
    const category = getAll().find((item) => sameName(item.name, cleanName));

    if (category && !category.isSystem) {
      return category.name;
    }

    return getFallbackCategory();
  }

  function getFallbackCategory(excludedName) {
    const editable = getEditable().filter((category) => !sameName(category.name, excludedName));
    const ideas = editable.find((category) => sameName(category.name, FALLBACK_CATEGORY));
    return (ideas || editable[0] || { name: FALLBACK_CATEGORY }).name;
  }

  function getFirstWritableCategory() {
    return (getEditable()[0] || { name: FALLBACK_CATEGORY }).name;
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

    if (getEditable().length <= 1) {
      return fail("至少保留一个分类。");
    }

    const nextCategories = categories.filter((category) => category.id !== id);
    const fallbackCategory = getFallbackCategory(target.name);
    writeCategories(sortCategories(nextCategories));

    if (window.BrainOSStorage && typeof window.BrainOSStorage.moveCategoryNotes === "function") {
      window.BrainOSStorage.moveCategoryNotes(target.name, fallbackCategory);
    }

    return ok({ deletedName: target.name, fallbackCategory });
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
    getWritableCategory,
    getFallbackCategory,
    getFirstWritableCategory,
    addCategory,
    renameCategory,
    deleteCategory,
    moveCategory,
    fallbackCategory: FALLBACK_CATEGORY,
    lastCategory: SYSTEM_LAST
  };
})();
