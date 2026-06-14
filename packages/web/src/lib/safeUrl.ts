// Only allow http:/https: URLs through to DOM sinks (<video src>,
// <a href>, <img src>). A teacher can type any string into the content
// URL fields, and `javascript:alert(...)` would XSS the student on
// click or on video load. Callers pass the raw value; we return it if
// safe, or null to render the "missing" fallback.
export function safeHttpUrl(raw: string | null | undefined): string | null {
    if (!raw) return null;
    try {
        const u = new URL(raw, window.location.origin);
        if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
        return u.toString();
    } catch {
        return null;
    }
}
