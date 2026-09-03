// Lightweight RSS parsing for the news module.
// Sources should be publications that permit syndication via their public RSS feed
// (standard practice — feeds are published for this purpose). We only ever store
// title + a short original-length excerpt + link back to the source; never full text.

export interface RssSourceConfig {
  name: string;
  feedUrl: string;
  category: string;
}

// Configure with real SA business/labour news RSS feeds before going live.
// These are placeholders — verify each publication's feed URL and syndication
// terms before enabling. Prefer feeds explicitly intended for this kind of reuse.
export const NEWS_SOURCES: RssSourceConfig[] = [
  {
    name: "Department of Employment and Labour",
    feedUrl: "https://www.labour.gov.za/rss", // verify actual feed path before use
    category: "Policy",
  },
  // Add further legitimate, syndication-permitting SA sources here.
];

interface ParsedRssItem {
  title: string;
  link: string;
  pubDate: string;
  descriptionRaw: string;
}

export function parseRssXml(xml: string): ParsedRssItem[] {
  const items: ParsedRssItem[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match: RegExpExecArray | null;

  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1];
    items.push({
      title: extractTag(block, "title"),
      link: extractTag(block, "link"),
      pubDate: extractTag(block, "pubDate"),
      descriptionRaw: extractTag(block, "description"),
    });
  }
  return items;
}

function extractTag(block: string, tag: string): string {
  const regex = new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, "i");
  const m = block.match(regex);
  if (!m) return "";
  return m[1]
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]+>/g, "")
    .trim();
}

// Produces a short, original excerpt bounded well under any reproduction concern.
// This truncates rather than "summarizes" — a real ingestion job should replace
// this with an actual short rewritten summary, not a truncation of source text,
// to stay clearly on the right side of fair use.
export function shortExcerpt(text: string, maxLen = 160): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen).replace(/\s+\S*$/, "") + "…";
}
