import markdownIt from "markdown-it";

const md = markdownIt({ html: true, breaks: true, linkify: true });

export default function (eleventyConfig) {
  // Files copied to the site as they are
  eleventyConfig.addPassthroughCopy("src/assets");
  eleventyConfig.addPassthroughCopy("src/img");
  eleventyConfig.addPassthroughCopy("src/admin");
  eleventyConfig.addPassthroughCopy("src/files");

  eleventyConfig.addGlobalData("year", () => new Date().getFullYear());

  // Markdown for text fields: **bold**, *italic*, links, line breaks
  eleventyConfig.addFilter("md", (s) => (s ? md.render(String(s)) : ""));
  eleventyConfig.addFilter("mdi", (s) => (s ? md.renderInline(String(s)) : ""));

  // Headings: *word* becomes the burgundy italic accent
  eleventyConfig.addFilter("accent", (s) =>
    s ? String(s).replace(/\*([^*]+)\*/g, "<em>$1</em>").replace(/\n/g, "<br>") : ""
  );

  // €24 / €24,50
  eleventyConfig.addFilter("euro", (n) => {
    if (n === undefined || n === null || n === "") return "";
    const v = Number(n);
    return "€" + (Number.isInteger(v) ? v : v.toFixed(2).replace(".", ","));
  });

  eleventyConfig.addFilter("where", (arr, key, val) => (arr || []).filter((x) => x.data[key] === val));
  eleventyConfig.addFilter("whereNot", (arr, key, val) => (arr || []).filter((x) => x.data[key] !== val));
  eleventyConfig.addFilter("bySlug", (arr, slug) => (arr || []).find((x) => x.fileSlug === slug));
  // image format chosen in the admin: "4/5", "1/1", "original"...
  eleventyConfig.addFilter("ratio", (r) => {
    if (!r || r === "default") return "";
    if (r === "original") return "";
    return ` style="--ratio:${r}"`;
  });
  eleventyConfig.addFilter("ratioClass", (r) => (r === "original" ? " original" : ""));
  eleventyConfig.addFilter("unique", (arr) => [...new Set(arr || [])]);
  // lets text fields mention {{ settings.email }} and similar
  eleventyConfig.addFilter("fill", (str, settings) =>
    String(str || "").replace(/\{\{\s*settings\.(\w+)\s*\}\}/g, (m, k) => (settings && settings[k]) || "")
  );
  eleventyConfig.addFilter("json", (v) => JSON.stringify(v));

  // All templates (products), ordered by the "order" field
  eleventyConfig.addCollection("products", (api) =>
    api
      .getFilteredByGlob("src/templates/*.md")
      .filter((p) => p.data.status !== "hidden")
      .sort((a, b) => (a.data.order || 99) - (b.data.order || 99))
  );

  return {
    dir: { input: "src", output: "_site", includes: "_includes", data: "_data" },
    templateFormats: ["njk", "md", "html"],
    htmlTemplateEngine: "njk",
    markdownTemplateEngine: "njk",
  };
}
