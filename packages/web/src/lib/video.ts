// Convert a YouTube watch/short URL to its embeddable form.
// Returns null for non-YouTube URLs (caller should fall back to a <video> tag).
export const getYouTubeEmbedUrl = (url: string): string | null => {
    try {
        const parsed = new URL(url);
        if (parsed.hostname.includes('youtube.com')) {
            const id = parsed.searchParams.get('v');
            return id ? `https://www.youtube.com/embed/${id}` : null;
        }
        if (parsed.hostname === 'youtu.be') {
            const id = parsed.pathname.replace('/', '').trim();
            return id ? `https://www.youtube.com/embed/${id}` : null;
        }
    } catch {
        return null;
    }
    return null;
};
