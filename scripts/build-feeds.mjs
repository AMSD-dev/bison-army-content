import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SITE_URL = "https://bisonarmy.ca"; // the app's real domain, not this repo

const posts = JSON.parse(
  await readFile(path.resolve(__dirname, "../manifest.json"), "utf-8")
);

function escapeXml(str = "") {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// --- blog-sitemap.xml (referenced as a child sitemap from the app's main sitemap.xml) ---
const tags = [...new Set(posts.flatMap((p) => p.tags))];
const sitemapUrls = [
  ...posts.map((p) => ({
    loc: `${SITE_URL}/blog/${p.slug}`,
    lastmod: p.updatedDate ?? p.publishDate,
  })),
  ...tags.map((t) => ({
    loc: `${SITE_URL}/blog/tag/${t}`,
    lastmod: new Date().toISOString().slice(0, 10),
  })),
];
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapUrls
  .map((u) => `  <url><loc>${u.loc}</loc><lastmod>${u.lastmod}</lastmod></url>`)
  .join("\n")}
</urlset>
`;
await writeFile(path.resolve(__dirname, "../blog-sitemap.xml"), sitemap);

// --- rss.xml ---
const items = posts
  .map(
    (p) => `    <item>
      <title>${escapeXml(p.title)}</title>
      <link>${SITE_URL}/blog/${p.slug}</link>
      <guid isPermaLink="true">${SITE_URL}/blog/${p.slug}</guid>
      <pubDate>${new Date(p.publishDate).toUTCString()}</pubDate>
      <description>${escapeXml(p.description)}</description>
    </item>`
  )
  .join("\n");
const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Bison Army — Field Dispatches</title>
    <link>${SITE_URL}/blog</link>
    <description>Articles on discipline, calisthenics, and the Bison Army methodology.</description>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${items}
  </channel>
</rss>
`;
await writeFile(path.resolve(__dirname, "../rss.xml"), rss);

// --- llms-articles.txt (fragment merged into the app's llms.txt at request time) ---
const llms = posts
  .map((p) => `- [${p.title}](${SITE_URL}/blog/${p.slug}): ${p.description}`)
  .join("\n");
await writeFile(path.resolve(__dirname, "../llms-articles.txt"), llms + "\n");

console.log(`[content] feeds regenerated for ${posts.length} article(s)`);
