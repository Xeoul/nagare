// The path the app is served under: "" normally, or e.g. "/nagare" for the
// GitHub Pages demo (set by NEXT_PUBLIC_BASE_PATH at build time, matching
// next.config.ts's basePath). Next's <Link> and router add it on their own;
// plain fetch() calls for files in public/ go through assetUrl() instead.
export const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export function assetUrl(path: string): string {
  return `${basePath}${path}`;
}
