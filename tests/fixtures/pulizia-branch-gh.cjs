// A fake «gh api» for tests/pulizia-branch.cjs: answers the REST calls of .github/scripts/pulizia-branch.sh from a
// JSON state file (FAKE_GH_STATE), records every call in FAKE_GH_LOG and applies the writes (tag created, branch
// deleted) to the state file. Nothing reaches GitHub. «--jq» runs the real jq, as gh does.
const fs = require('node:fs');
const {spawnSync} = require('node:child_process');

const statePath = process.env.FAKE_GH_STATE;
const logPath = process.env.FAKE_GH_LOG;
const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
const save = () => fs.writeFileSync(statePath, JSON.stringify(state, null, 2));

const args = process.argv.slice(2);
if (args.shift() !== 'api') fail(`fake gh: solo «gh api» (${args.join(' ')})`);
let method = 'GET';
let filter = null;
let path = null;
const fields = {};
for (let i = 0; i < args.length; i += 1) {
  const a = args[i];
  if (a === '-X') method = args[++i];
  else if (a === '--jq') filter = args[++i];
  else if (a === '-f') { const [k, ...v] = args[++i].split('='); fields[k] = v.join('='); }
  else if (a.startsWith('-')) fail(`fake gh: opzione sconosciuta ${a}`);
  else path = a;
}
fs.appendFileSync(logPath, `${method} ${path}${Object.keys(fields).length ? ' ' + JSON.stringify(fields) : ''}\n`);

const repo = state.repo;
const [route, query = ''] = path.split('?');
const params = Object.fromEntries(query.split('&').filter(Boolean).map(p => p.split('=').map(decodeURIComponent)));
const page = Number(params.page || 1);
const prJson = pr => ({number: pr.number, state: pr.state, merged_at: pr.merged_at || null, head: {ref: pr.head.ref, sha: pr.head.sha, repo: {full_name: pr.head.repo || repo}}});
const branchJson = (name, b) => ({name, commit: {sha: b.sha}, protected: Boolean(b.protected)});

function fail(message, code = 1) {
  process.stderr.write(`${message}\n`);
  process.exit(code);
}
function notFound() { fail(`gh: Not Found (HTTP 404)\n{"message":"Not Found"}`); }

let body;
if (method === 'GET' && route === `repos/${repo}/pulls`) {
  let prs = state.prs;
  if (params.state && params.state !== 'all') prs = prs.filter(pr => pr.state === params.state);
  if (params.head) prs = prs.filter(pr => `${repo.split('/')[0]}:${pr.head.ref}` === params.head);
  body = page === 1 ? prs.map(prJson) : [];
} else if (method === 'GET' && route === `repos/${repo}/branches`) {
  body = page === 1 ? Object.entries(state.branches).map(([name, b]) => branchJson(name, b)) : [];
} else if (method === 'GET' && route.startsWith(`repos/${repo}/branches/`)) {
  const name = route.slice(`repos/${repo}/branches/`.length);
  if (!state.branches[name]) notFound();
  body = branchJson(name, state.branches[name]);
} else if (method === 'GET' && route.startsWith(`repos/${repo}/compare/main...`)) {
  const sha = route.slice(`repos/${repo}/compare/main...`.length);
  body = {status: (state.mainContains || []).includes(sha) ? 'behind' : 'ahead'};
} else if (method === 'GET' && route.startsWith(`repos/${repo}/git/ref/tags/`)) {
  const tag = route.slice(`repos/${repo}/git/ref/tags/`.length);
  // Quirk: the branch moves between the tag read and the deletion (someone pushed meanwhile).
  const move = state.quirks && state.quirks.moveOnTagRead && state.quirks.moveOnTagRead[tag.replace(/^archivio\//, '')];
  if (move) { state.branches[tag.replace(/^archivio\//, '')].sha = move; save(); }
  if (!state.tags[tag]) notFound();
  body = {ref: `refs/tags/${tag}`, object: state.tags[tag]};
} else if (method === 'GET' && route.startsWith(`repos/${repo}/git/tags/`)) {
  const sha = route.slice(`repos/${repo}/git/tags/`.length);
  if (!state.annotated || !state.annotated[sha]) notFound();
  body = {sha, object: {type: 'commit', sha: state.annotated[sha]}};
} else if (method === 'POST' && route === `repos/${repo}/git/refs`) {
  const ref = fields.ref || '';
  if (!ref.startsWith('refs/tags/') || !fields.sha) fail('fake gh: POST git/refs solo per tag con sha', 1);
  const tag = ref.slice('refs/tags/'.length);
  if (state.tags[tag]) fail('gh: Reference already exists (HTTP 422)', 1);
  // Quirk: GitHub answers 201 but the tag is not there when read again.
  if (!(state.quirks && state.quirks.tagCreateSilent && state.quirks.tagCreateSilent.includes(tag))) {
    state.tags[tag] = {type: 'commit', sha: fields.sha};
    save();
  }
  body = {ref, object: {type: 'commit', sha: fields.sha}};
} else if (method === 'DELETE' && route.startsWith(`repos/${repo}/git/refs/heads/`)) {
  const name = route.slice(`repos/${repo}/git/refs/heads/`.length);
  if (!state.branches[name]) fail('gh: Reference does not exist (HTTP 422)', 1);
  delete state.branches[name];
  save();
  process.exit(0);
} else {
  fail(`fake gh: chiamata non prevista ${method} ${path}`, 1);
}

const text = JSON.stringify(body);
if (filter === null) {
  process.stdout.write(text);
} else {
  const jq = spawnSync('jq', ['-r', filter], {input: text, encoding: 'utf8'});
  if (jq.status !== 0) fail(jq.stderr, jq.status || 1);
  process.stdout.write(jq.stdout);
}
