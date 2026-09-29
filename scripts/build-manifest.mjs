import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import matter from "gray-matter";
import MarkdownIt from "markdown-it";
import anchor from "markdown-it-anchor";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ARTICLES_DIR = path.resolve(__dirname, "../articles");
const OUT = path.resolve(__dirname, "../manifest.json");

const md = new MarkdownIt({ html: false, linkify: true, typographer: true });
md.use(anchor); // id="..." on headings for #deep-linking, no visible <a> wrapper

function validate(fm, filename) {
  const errors = [];
  const required = ["title", "description", "author", "publishDate", "featuredImage", "tags"];
  for (const key of required) if (!fm[key]) errors.push(`missing "${key}"`);
  if (fm.description && (fm.description.length < 50 || fm.description.length > 160)) {
    errors.push(`description should be 50-160 chars (got ${fm.description.length})`);
  }
  if (fm.publishDate && isNaN(Date.parse(fm.publishDate))) {
    errors.push(`publishDate "${fm.publishDate}" is not a valid date`);
  }
  if (errors.length) throw new Error(`[content] ${filename}: ${errors.join("; ")}`);
}

const files = (await readdir(ARTICLES_DIR)).filter((f) => f.endsWith(".md"));
const seenSlugs = new Set();
const posts = [];

for (const file of files) {
  const slug = file.replace(/\.md$/, "");
  const raw = await readFile(path.join(ARTICLES_DIR, file), "utf-8");
  const { data: fm, content } = matter(raw);

  validate(fm, file);
  if (fm.draft) continue;
  if (seenSlugs.has(slug)) throw new Error(`[content] duplicate slug: ${slug}`);
  seenSlugs.add(slug);

  const words = content.trim().split(/\s+/).length;
  const readingTimeMinutes = Math.max(1, Math.round(words / 200));

  posts.push({
    slug,
    title: fm.title,
    description: fm.description,
    author: fm.author,
    publishDate: fm.publishDate,
    updatedDate: fm.updatedDate ?? null,
    featuredImage: fm.featuredImage,
    featuredImageAlt: fm.featuredImageAlt ?? fm.title,
    tags: fm.tags ?? [],
    category: fm.category ?? null,
    faq: fm.faq ?? [],
    readingTimeMinutes,
    contentHtml: md.render(content),
  });
}

posts.sort((a, b) => (a.publishDate < b.publishDate ? 1 : -1));
await writeFile(OUT, JSON.stringify(posts, null, 2));
console.log(`[content] manifest.json written — ${posts.length} article(s)`);
