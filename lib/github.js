// The admin saves settings by committing data/config.json through the GitHub API.
// Each commit triggers the Pages workflow, which re-validates and redeploys the site.
export const REPO = 'claudeomosa/SafiBags'
export const BRANCH = 'main'
const FILE = 'data/config.json'
const URL = `https://api.github.com/repos/${REPO}/contents/${FILE}`

// base64 <-> UTF-8 text (btoa/atob alone break on characters like "×")
export const toB64 = (text) => btoa(String.fromCharCode(...new TextEncoder().encode(text)))
export const fromB64 = (b64) => new TextDecoder().decode(Uint8Array.from(atob(b64.replace(/\s/g, '')), (c) => c.charCodeAt(0)))

const ERRORS = {
  401: 'GitHub rejected the token. Check it was copied fully and has not expired.',
  403: 'This token cannot write to the repo. Give it "Contents: Read and write" on SafiBags.',
  404: 'Repo or settings file not found. The token may not have access to SafiBags.',
  409: 'Settings were changed somewhere else since you opened them. Reload and try again.',
}

async function gh(token, init = {}) {
  const r = await fetch(init.method === 'PUT' ? URL : `${URL}?ref=${BRANCH}`, {
    ...init,
    headers: { Accept: 'application/vnd.github+json', Authorization: `Bearer ${token}`, 'X-GitHub-Api-Version': '2022-11-28', ...init.headers },
    cache: 'no-store',
  })
  const j = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(ERRORS[r.status] || j.message || `GitHub error ${r.status}`)
  return j
}

// -> { cfg, sha }. sha is the version we edited, so a save can't overwrite someone else's newer change.
export async function loadConfig(token) {
  const j = await gh(token)
  return { cfg: JSON.parse(fromB64(j.content)), sha: j.sha }
}

// -> { sha, commitUrl }
export async function saveConfig(token, cfg, sha) {
  const j = await gh(token, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: 'Update site settings from admin', content: toB64(JSON.stringify(cfg, null, 2) + '\n'), sha, branch: BRANCH }),
  })
  return { sha: j.content.sha, commitUrl: j.commit.html_url }
}
