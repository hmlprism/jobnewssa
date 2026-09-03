export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function jobSlug(title: string, city: string | null, id: string): string {
  const base = slugify(`${title}-${city ?? ""}`);
  const shortId = id.slice(0, 8);
  return `${base}-${shortId}`;
}
