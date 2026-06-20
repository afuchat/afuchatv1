const SUPABASE_HOST = 'rhnsjqqtdzlkvqazfcbg.supabase.co';
const CDN_HOST = 'cdn.afuchat.com';

function isTransformable(url: string): boolean {
  return url.includes(SUPABASE_HOST) || url.includes(CDN_HOST);
}

function transform(url: string, width: number, quality: number): string {
  try {
    const u = new URL(url);
    // Supabase storage: rewrite /object/public/ → /render/image/public/ for on-the-fly resizing
    if (u.hostname === SUPABASE_HOST && u.pathname.includes('/object/public/')) {
      u.pathname = u.pathname.replace('/object/public/', '/render/image/public/');
    }
    u.searchParams.set('width', String(width));
    u.searchParams.set('quality', String(quality));
    return u.toString();
  } catch {
    return url;
  }
}

/** Post body image — 800px wide, quality 80 */
export function imgPost(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  return isTransformable(url) ? transform(url, 800, 80) : url;
}

/** Square avatar — 80px wide, quality 75 */
export function imgAvatar(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  return isTransformable(url) ? transform(url, 80, 75) : url;
}

/** Profile cover banner — 1200px wide, quality 80 */
export function imgBanner(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  return isTransformable(url) ? transform(url, 1200, 80) : url;
}

/** Thumbnail / story ring image — 160px wide, quality 75 */
export function imgThumb(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  return isTransformable(url) ? transform(url, 160, 75) : url;
}
