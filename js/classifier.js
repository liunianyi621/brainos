(function () {
  const CATEGORY_RULES = [
    {
      category: "摄影",
      keywords: ["camera", "lens", "photography", "photo", "portrait", "light", "lighting", "摄影", "相机", "镜头", "人像", "光线", "灯光"]
    },
    {
      category: "电影",
      keywords: ["film", "cinema", "script", "director", "cinematography", "scene", "电影", "剧本", "导演", "摄影指导", "场景", "镜头语言"]
    },
    {
      category: "投资",
      keywords: ["stock", "investing", "market", "AI", "Microsoft", "NVIDIA", "ETF", "股票", "投资", "市场", "美股", "基金", "微软", "英伟达"]
    },
    {
      category: "俄语",
      keywords: ["Russian", "русский", "grammar", "word", "phrase", "俄语", "俄文", "语法", "单词", "短语", "发音"]
    },
    {
      category: "旅行",
      keywords: ["travel", "visa", "flight", "hotel", "country", "city", "旅行", "签证", "机票", "酒店", "国家", "城市"]
    }
  ];

  function normalizeText(value) {
    return String(value || "").toLocaleLowerCase();
  }

  function classify(title, content, tags) {
    const source = [title, content, tags].flat().join(" ");
    const haystack = normalizeText(source);
    const match = CATEGORY_RULES.find((rule) => {
      return rule.keywords.some((keyword) => matchesKeyword(haystack, keyword));
    });

    if (!match) {
      return "灵感";
    }

    if (window.BrainOSCategories && typeof window.BrainOSCategories.resolveCategory === "function") {
      return window.BrainOSCategories.resolveCategory(match.category);
    }

    return match.category;
  }

  function matchesKeyword(haystack, keyword) {
    const normalizedKeyword = normalizeText(keyword);

    if (/^[a-z0-9]+$/i.test(keyword)) {
      const escapedKeyword = normalizedKeyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      return new RegExp(`(^|[^a-z0-9])${escapedKeyword}([^a-z0-9]|$)`).test(haystack);
    }

    return haystack.includes(normalizedKeyword);
  }

  function summarize(title, content) {
    const cleanContent = String(content || "").trim();
    const fallbackTitle = String(title || "未命名记忆").trim();
    const source = cleanContent || fallbackTitle;
    const summary = source.slice(0, 120);
    return source.length > 120 ? `${summary}…` : summary;
  }

  function parseTags(rawTags) {
    if (Array.isArray(rawTags)) {
      return uniqueTags(rawTags);
    }

    return uniqueTags(
      String(rawTags || "")
        .split(/[,，]/)
        .map((tag) => tag.trim())
        .filter(Boolean)
    );
  }

  function uniqueTags(tags) {
    const seen = new Set();
    const result = [];

    tags.forEach((tag) => {
      const cleanTag = String(tag || "").trim();
      const key = cleanTag.toLocaleLowerCase();

      if (!cleanTag || seen.has(key)) {
        return;
      }

      seen.add(key);
      result.push(cleanTag);
    });

    return result;
  }

  function buildTags(rawTags, category) {
    return uniqueTags([...parseTags(rawTags), category]);
  }

  window.BrainOSClassifier = {
    classify,
    summarize,
    parseTags,
    buildTags
  };
})();
