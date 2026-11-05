export function parseItemImageUrls(imageUrls: unknown, imageUrl: string | null | undefined): string[] {
  if (Array.isArray(imageUrls)) {
    const urls = imageUrls.filter((url): url is string => typeof url === "string" && url.length > 0);
    if (urls.length > 0) return urls;
  }
  return imageUrl ? [imageUrl] : [];
}

export function appendItemImageUrl(imageUrls: unknown, imageUrl: string | null | undefined, nextUrl: string): string[] {
  const existing = parseItemImageUrls(imageUrls, imageUrl);
  if (existing.includes(nextUrl)) return existing;
  return [...existing, nextUrl];
}
