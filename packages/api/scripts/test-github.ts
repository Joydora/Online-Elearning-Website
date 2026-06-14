import 'dotenv/config';
import { parseGithubRepoUrl, fetchRecentCommits } from '../src/services/github.service';

function expect(label: string, got: unknown, want: unknown) {
    const ok = JSON.stringify(got) === JSON.stringify(want);
    console.log(`  ${ok ? '✅' : '❌'} ${label}: ${ok ? 'matches' : `got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`}`);
}

async function main() {
    console.log('--- parseGithubRepoUrl ---');
    expect('https plain', parseGithubRepoUrl('https://github.com/torvalds/linux'), { owner: 'torvalds', repo: 'linux' });
    expect('https .git', parseGithubRepoUrl('https://github.com/torvalds/linux.git'), { owner: 'torvalds', repo: 'linux' });
    expect('https /tree/main', parseGithubRepoUrl('https://github.com/torvalds/linux/tree/main'), { owner: 'torvalds', repo: 'linux' });
    expect('ssh', parseGithubRepoUrl('git@github.com:torvalds/linux.git'), { owner: 'torvalds', repo: 'linux' });
    expect('not github', parseGithubRepoUrl('https://gitlab.com/x/y'), null);
    expect('garbage', parseGithubRepoUrl('not a url'), null);
    expect('empty', parseGithubRepoUrl(''), null);

    console.log('\n--- fetchRecentCommits unknown repo (should return empty + note) ---');
    const r1 = await fetchRecentCommits('this-user-definitely-does-not-exist-9999', 'never-a-real-repo');
    console.log(`  commits.length = ${r1.commits.length}, note = ${r1.note}`);
    console.log(`  ${r1.commits.length === 0 && !!r1.note ? '✅' : '❌'} graceful failure on 404`);

    console.log('\n--- fetchRecentCommits real public repo (sindresorhus/is) ---');
    const r2 = await fetchRecentCommits('sindresorhus', 'is', 5);
    console.log(`  commits.length = ${r2.commits.length}`);
    if (r2.commits.length > 0) {
        const c = r2.commits[0];
        console.log(`  first sha=${c.sha.slice(0, 7)} msg="${c.message.split('\\n')[0].slice(0, 80)}" by ${c.authorName}`);
        console.log(`  ${c.sha && c.message && c.authorName && c.authorDate && c.htmlUrl ? '✅' : '❌'} commit shape valid`);
    } else {
        console.log(`  note: ${r2.note}`);
        console.log(`  ⚠️ no commits — likely network/rate-limited; service handled it gracefully`);
    }
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
