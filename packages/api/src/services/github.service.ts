/**
 * Lightweight GitHub commit fetcher.
 * Uses the public REST API; no OAuth needed for public repos.
 * Optional GITHUB_TOKEN env raises the rate limit from 60/hr to 5000/hr.
 */

export type ParsedRepo = { owner: string; repo: string };

export type CommitSummary = {
    sha: string;
    message: string;
    authorName: string;
    authorDate: string;
    htmlUrl: string;
};

export type FetchCommitsResult = {
    commits: CommitSummary[];
    note?: string;
};

/**
 * Accepts URLs in any of these forms:
 *   https://github.com/{owner}/{repo}
 *   https://github.com/{owner}/{repo}.git
 *   https://github.com/{owner}/{repo}/tree/main
 *   git@github.com:{owner}/{repo}.git
 *
 * Returns null if the URL doesn't look like a GitHub repo.
 */
export function parseGithubRepoUrl(raw: string): ParsedRepo | null {
    if (typeof raw !== 'string' || !raw.trim()) return null;
    const trimmed = raw.trim();

    // SSH form
    const sshMatch = trimmed.match(/^git@github\.com:([^/]+)\/([^/.]+?)(?:\.git)?$/i);
    if (sshMatch) {
        return { owner: sshMatch[1], repo: sshMatch[2] };
    }

    // HTTPS form (with or without trailing /tree/branch, .git, query, fragment)
    let u: URL;
    try {
        u = new URL(trimmed);
    } catch {
        return null;
    }
    if (!/^github\.com$/i.test(u.hostname)) return null;

    const segments = u.pathname.split('/').filter(Boolean);
    if (segments.length < 2) return null;
    const owner = segments[0];
    let repo = segments[1];
    repo = repo.replace(/\.git$/i, '');
    if (!owner || !repo) return null;

    return { owner, repo };
}

/**
 * Fetch up to {limit} most recent commits from a public repo.
 * Never throws — returns { commits: [], note } on failure so the caller
 * can surface a friendly message to the user.
 */
export async function fetchRecentCommits(
    owner: string,
    repo: string,
    limit = 30,
): Promise<FetchCommitsResult> {
    const perPage = Math.min(Math.max(limit, 1), 100);
    const url = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/commits?per_page=${perPage}`;

    const headers: Record<string, string> = {
        Accept: 'application/vnd.github+json',
        'User-Agent': 'elearning-platform',
    };
    if (process.env.GITHUB_TOKEN) {
        headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
    }

    let response: Response;
    try {
        response = await fetch(url, { headers });
    } catch (err) {
        return { commits: [], note: `Không gọi được GitHub: ${(err as Error).message}` };
    }

    if (response.status === 404) {
        return { commits: [], note: 'Repo không tồn tại hoặc đang ở chế độ private.' };
    }
    if (response.status === 403) {
        return {
            commits: [],
            note: 'GitHub trả về 403 (rate limit hoặc bị chặn). Thử lại sau hoặc đặt GITHUB_TOKEN.',
        };
    }
    if (!response.ok) {
        return { commits: [], note: `GitHub trả về ${response.status}.` };
    }

    let raw: unknown;
    try {
        raw = await response.json();
    } catch (err) {
        return { commits: [], note: `Phản hồi GitHub không phải JSON: ${(err as Error).message}` };
    }

    if (!Array.isArray(raw)) {
        return { commits: [], note: 'Phản hồi GitHub không phải mảng commits.' };
    }

    const commits: CommitSummary[] = [];
    for (const item of raw) {
        if (!item || typeof item !== 'object') continue;
        const obj = item as Record<string, any>;
        const sha = typeof obj.sha === 'string' ? obj.sha : null;
        const message = obj.commit?.message;
        const authorName = obj.commit?.author?.name ?? obj.author?.login ?? 'unknown';
        const authorDate = obj.commit?.author?.date ?? obj.commit?.committer?.date ?? null;
        const htmlUrl = obj.html_url ?? '';
        if (!sha || typeof message !== 'string' || !authorDate) continue;

        commits.push({
            sha,
            message: message.length > 500 ? message.slice(0, 500) + '...' : message,
            authorName: String(authorName),
            authorDate: String(authorDate),
            htmlUrl: String(htmlUrl),
        });
    }

    return { commits };
}
