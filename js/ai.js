(function () {
  function generateSummary(input) {
    const type = input && input.type;

    const source = String((input && (input.content || input.url || input.title)) || "").trim();
    if (type === "image") {
      return source || "图片";
    }

    const summary = source.slice(0, 120);
    return source.length > 120 ? `${summary}…` : summary;
  }

  function generateTags(input) {
    const category = String((input && input.category) || "").trim();
    return category ? [category] : [];
  }

  function classifyContent() {
    return {
      category: "",
      confidence: 0,
      reason: "mock"
    };
  }

  function suggestLinks() {
    return [];
  }

  window.BrainOSAI = {
    generateSummary,
    generateTags,
    classifyContent,
    suggestLinks
  };
})();
