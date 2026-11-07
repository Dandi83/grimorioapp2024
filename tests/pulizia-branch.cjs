// «Pulizia branch» (PROMPT 42 + PROMPT 74): .github/scripts/pulizia-branch.sh runs against a fake «gh» (no call
// reaches GitHub). «prova» and «elimina» keep their behaviour; the new «archivia-prova» / «archivia-ed-elimina» work
// only on an explicit list, refuse main, cloud/…, protected branches, open PRs and unknown names, create the archive
// tag before deleting and delete only after reading the tag back from GitHub.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {spawnSync} = require('node:child_process');

const SCRIPT = path.resolve('.github/scripts/pulizia-branch.sh');
const FAKE = path.resolve('tests/fixtures/pulizia-branch-gh.cjs');
const REPO = 'Dandi83/grimorioapp2024';
const sha = letter => letter.repeat(40);

for (const tool of ['bash', 'jq']) {
  assert.equal(spawnSync(tool, ['--version']).status, 0, `${tool} is required by the script`);
}

function fixture() {
  return {
    repo: REPO,
    branches: {
      main: {sha: sha('a'), protected: true},
      protetto: {sha: sha('b'), protected: true},
      'cloud/grimorio-ios-20261018': {sha: sha('c')},
      'con-pr-aperta': {sha: sha('d')},
      'unito-con-pr': {sha: sha('e')},
      'dietro-main': {sha: sha('f')},
      'feature/a': {sha: sha('1')},
      'feature/b': {sha: sha('2')},
      'feature/c': {sha: sha('3')},
      'feature/d': {sha: sha('4')},
    },
    prs: [
      {number: 10, state: 'open', head: {ref: 'con-pr-aperta', sha: sha('d')}},
      {number: 11, state: 'closed', merged_at: '2026-11-01T00:00:00Z', head: {ref: 'unito-con-pr', sha: sha('e')}},
      {number: 12, state: 'closed', merged_at: '2026-10-01T00:00:00Z', head: {ref: 'feature/d', sha: sha('9')}},
    ],
    tags: {
      'archivio/feature/b': {type: 'commit', sha: sha('2')},
      'archivio/feature/c': {type: 'commit', sha: sha('0')},
    },
    mainContains: [sha('f')],
  };
}

function run(mode, state, list, extraEnv = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pulizia-branch-'));
  const bin = path.join(dir, 'bin');
  fs.mkdirSync(bin);
  fs.writeFileSync(path.join(bin, 'gh'), `#!/usr/bin/env bash\nexec node "${FAKE}" "$@"\n`, {mode: 0o755});
  const statePath = path.join(dir, 'state.json');
  const logPath = path.join(dir, 'gh.log');
  const summaryPath = path.join(dir, 'summary.md');
  fs.writeFileSync(statePath, JSON.stringify(state));
  fs.writeFileSync(logPath, '');
  fs.writeFileSync(summaryPath, '');
  const env = {...process.env, ...extraEnv, PATH: `${bin}:${process.env.PATH}`, GITHUB_REPOSITORY: REPO, GITHUB_STEP_SUMMARY: summaryPath, MODALITA: mode, FAKE_GH_STATE: statePath, FAKE_GH_LOG: logPath, GH_TOKEN: 'finto'};
  delete env.NODE_OPTIONS;
  if (list === undefined) delete env.BRANCH_LIST; else env.BRANCH_LIST = list;
  const result = spawnSync('bash', [SCRIPT], {env, encoding: 'utf8'});
  return {
    status: result.status,
    stdout: result.stdout,
    stderr: result.stderr,
    summary: fs.readFileSync(summaryPath, 'utf8'),
    log: fs.readFileSync(logPath, 'utf8').split('\n').filter(Boolean),
    state: JSON.parse(fs.readFileSync(statePath, 'utf8')),
  };
}

const writes = log => log.filter(line => !line.startsWith('GET '));
const row = (summary, name) => summary.split('\n').find(line => line.startsWith(`| \`${name}\` |`));

// ── «prova»: lists, writes nothing; the «branch» input is ignored ──
{
  const r = run('prova', fixture(), 'feature/a, feature/b');
  assert.equal(r.status, 0, r.stderr);
  assert.deepEqual(writes(r.log), [], 'prova writes nothing');
  assert.deepEqual(r.state.branches, fixture().branches);
  assert.match(r.summary, /## Pulizia branch uniti — modalità «prova»/);
  assert.match(r.summary, /\*\*Da eliminare: 2\*\* · \*\*Tenuti: 8\*\*/);
  assert.match(row(r.summary, 'unito-con-pr'), /PR unita, stesso ultimo commit \| #11/);
  assert.match(row(r.summary, 'dietro-main'), /già contenuto in main \(behind\)/);
  assert.match(row(r.summary, 'main'), /branch principale/);
  assert.match(row(r.summary, 'protetto'), /branch protetto/);
  assert.match(row(r.summary, 'cloud/grimorio-ios-20261018'), /filone iPhone/);
  assert.match(row(r.summary, 'con-pr-aperta'), /PR ancora aperta #10/);
  assert.match(row(r.summary, 'feature/a'), /non unito in main \(ahead\)/);
  assert.match(row(r.summary, 'feature/d'), /non unito in main \(ahead\)/, 'a merged PR on an older commit does not count');
  assert.equal(run('prova', fixture(), undefined).summary, r.summary, 'without the «branch» input the output is the same');
}

// ── «elimina»: only the merged branches, after a second check; never tags; the «branch» input is ignored ──
{
  const r = run('elimina', fixture(), 'feature/a');
  assert.equal(r.status, 0, r.stderr);
  assert.deepEqual(writes(r.log), [`DELETE repos/${REPO}/git/refs/heads/unito-con-pr`, `DELETE repos/${REPO}/git/refs/heads/dietro-main`]);
  assert.deepEqual(Object.keys(r.state.branches).sort(), ['cloud/grimorio-ios-20261018', 'con-pr-aperta', 'feature/a', 'feature/b', 'feature/c', 'feature/d', 'main', 'protetto']);
  assert.deepEqual(r.state.tags, fixture().tags, 'elimina never touches tags');
  for (const name of ['unito-con-pr', 'dietro-main']) {
    const check = r.log.indexOf(`GET repos/${REPO}/branches/${name}`);
    assert.ok(check >= 0 && check < r.log.indexOf(`DELETE repos/${REPO}/git/refs/heads/${name}`), `${name}: checked again right before the deletion`);
  }
  assert.match(r.summary, /\*\*Eliminati: 2\*\* su 2 uniti/);
  assert.match(r.stdout, /Eliminato: unito-con-pr/);
}

// ── Unknown mode and empty list: error, no call to GitHub ──
{
  const r = run('cancella-tutto', fixture(), 'feature/a');
  assert.equal(r.status, 2);
  assert.deepEqual(r.log, []);
  for (const mode of ['archivia-prova', 'archivia-ed-elimina']) {
    for (const list of [undefined, '', ' , ,\n\t']) {
      const e = run(mode, fixture(), list);
      assert.equal(e.status, 2, `${mode} with an empty list fails`);
      assert.deepEqual(e.log, [], `${mode} with an empty list calls nothing`);
      assert.match(e.stderr, /richiede l'elenco dei branch/);
      assert.match(e.summary, /elenco dei branch vuoto\. Nessuna azione/);
      assert.deepEqual(e.state, fixture());
    }
  }
}

const LIST = 'main, protetto cloud/grimorio-ios-20261018\ncon-pr-aperta,inesistente\n feature/a feature/b feature/c, feature/a, strano~nome';

// ── «archivia-prova»: shows what it would do, writes nothing ──
{
  const r = run('archivia-prova', fixture(), LIST);
  assert.equal(r.status, 0, r.stderr);
  assert.deepEqual(writes(r.log), [], 'archivia-prova writes nothing');
  assert.deepEqual(r.state, fixture());
  assert.ok(!r.log.includes(`GET repos/${REPO}/branches`), 'works on the list, not on all branches');
  assert.match(r.summary, /## Pulizia branch — modalità «archivia-prova»/);
  assert.match(r.summary, /Nessuna scrittura.*\*\*Da eliminare: 2\*\* \(tag da creare: 1, già presenti: 1\) · \*\*Rifiutati: 7\*\* · in elenco: 9/);
  assert.match(r.summary, /\| Branch \| Ultimo commit \| Tag d'archivio \| Esito \|/);
  assert.match(row(r.summary, 'main'), /\| — \| — \| rifiutato: branch principale \|/);
  assert.match(row(r.summary, 'protetto'), /`bbbbbbb`.*rifiutato: branch protetto/);
  assert.match(row(r.summary, 'cloud/grimorio-ios-20261018'), /\| — \| — \| rifiutato: filone iPhone \(cloud\/…\)/);
  assert.match(row(r.summary, 'con-pr-aperta'), /rifiutato: PR ancora aperta #10/);
  assert.match(row(r.summary, 'inesistente'), /\| — \| — \| rifiutato: non esiste/);
  assert.match(row(r.summary, 'strano~nome'), /rifiutato: nome non valido/);
  assert.match(row(r.summary, 'feature/a'), /`1111111` \| da creare \(`archivio\/feature\/a`\) \| da eliminare \|/);
  assert.match(row(r.summary, 'feature/b'), /`2222222` \| già presente \(`archivio\/feature\/b`\) \| da eliminare \|/);
  assert.match(row(r.summary, 'feature/c'), /rifiutato: tag `archivio\/feature\/c` già presente su un altro commit \(0000000\)/);
  assert.equal(r.summary.split('\n').filter(line => line.startsWith('| `feature/a`')).length, 1, 'duplicates in the list are listed once');
  assert.ok(!r.log.some(line => line.includes('/branches/main') || line.includes('/branches/cloud/')), 'main and cloud/… are refused before any read');
  assert.match(r.stdout, /feature\/a: 1111111 · tag da creare · da eliminare/);
}

// ── «archivia-ed-elimina»: tag first, read back, branch checked again, then deleted ──
{
  const r = run('archivia-ed-elimina', fixture(), LIST);
  assert.equal(r.status, 0, r.stderr);
  assert.deepEqual(writes(r.log), [
    `POST repos/${REPO}/git/refs {"ref":"refs/tags/archivio/feature/a","sha":"${sha('1')}"}`,
    `DELETE repos/${REPO}/git/refs/heads/feature/a`,
    `DELETE repos/${REPO}/git/refs/heads/feature/b`,
  ], 'only two deletions, one tag created, nothing else written');
  const i = name => r.log.indexOf(name);
  const post = i(`POST repos/${REPO}/git/refs {"ref":"refs/tags/archivio/feature/a","sha":"${sha('1')}"}`);
  const reread = r.log.lastIndexOf(`GET repos/${REPO}/git/ref/tags/archivio/feature/a`);
  const branchAgain = r.log.lastIndexOf(`GET repos/${REPO}/branches/feature/a`);
  const prsAgain = r.log.findIndex(line => line.includes(`pulls?state=open&head=Dandi83:feature/a`));
  const del = i(`DELETE repos/${REPO}/git/refs/heads/feature/a`);
  assert.ok(post < reread && reread < branchAgain && branchAgain < del && prsAgain > reread && prsAgain < del, `order tag → read back → branch and PRs again → delete:\n${r.log.join('\n')}`);
  assert.deepEqual(r.state.tags, {...fixture().tags, 'archivio/feature/a': {type: 'commit', sha: sha('1')}});
  assert.deepEqual(Object.keys(r.state.branches).sort(), ['cloud/grimorio-ios-20261018', 'con-pr-aperta', 'dietro-main', 'feature/c', 'feature/d', 'main', 'protetto', 'unito-con-pr']);
  assert.match(r.summary, /\*\*Eliminati: 2\*\* · \*\*Tag creati: 1\*\* \(già presenti: 1\) · \*\*Rifiutati: 7\*\* · in elenco: 9/);
  assert.match(row(r.summary, 'feature/a'), /creato \(`archivio\/feature\/a`\) \| eliminato \|/);
  assert.match(row(r.summary, 'feature/b'), /già presente \(`archivio\/feature\/b`\) \| eliminato \|/);
  assert.match(row(r.summary, 'feature/c'), /rifiutato: tag `archivio\/feature\/c` già presente su un altro commit/);
  for (const name of ['main', 'protetto', 'cloud/grimorio-ios-20261018', 'con-pr-aperta', 'inesistente']) assert.match(row(r.summary, name), /rifiutato/);
}

// ── The tag is not there when read back: the branch stays ──
{
  const state = fixture();
  state.quirks = {tagCreateSilent: ['archivio/feature/a']};
  const r = run('archivia-ed-elimina', state, 'feature/a');
  assert.equal(r.status, 0, r.stderr);
  assert.deepEqual(writes(r.log), [`POST repos/${REPO}/git/refs {"ref":"refs/tags/archivio/feature/a","sha":"${sha('1')}"}`], 'no deletion without the tag read back');
  assert.ok(r.state.branches['feature/a']);
  assert.match(row(r.summary, 'feature/a'), /creato.*rifiutato: tag `archivio\/feature\/a` non riletto da GitHub/);
  assert.match(r.summary, /\*\*Eliminati: 0\*\*/);
}

// ── The branch moves between the tag and the deletion: the branch stays, the tag is never moved or deleted ──
{
  const state = fixture();
  state.quirks = {moveOnTagRead: {'feature/b': sha('7')}};
  const r = run('archivia-ed-elimina', state, 'feature/b');
  assert.equal(r.status, 0, r.stderr);
  assert.deepEqual(writes(r.log), []);
  assert.equal(r.state.branches['feature/b'].sha, sha('7'));
  assert.deepEqual(r.state.tags['archivio/feature/b'], {type: 'commit', sha: sha('2')});
  assert.match(row(r.summary, 'feature/b'), /rifiutato: branch cambiato nel frattempo \(ora 7777777\); tag lasciato/);
}

// ── An annotated archive tag on the same commit is fine ──
{
  const state = fixture();
  state.tags['archivio/feature/a'] = {type: 'tag', sha: sha('8')};
  state.annotated = {[sha('8')]: sha('1')};
  const r = run('archivia-ed-elimina', state, 'feature/a');
  assert.equal(r.status, 0, r.stderr);
  assert.deepEqual(writes(r.log), [`DELETE repos/${REPO}/git/refs/heads/feature/a`]);
  assert.match(row(r.summary, 'feature/a'), /già presente.*eliminato/);
}

// ── Never a tag deleted or moved, in any mode ──
{
  for (const mode of ['prova', 'elimina', 'archivia-prova', 'archivia-ed-elimina']) {
    const r = run(mode, fixture(), LIST);
    assert.ok(!r.log.some(line => /^(DELETE|PATCH) .*\/git\/refs\/tags\//.test(line) || line.startsWith('PATCH ')), `${mode}: no tag deleted or moved`);
  }
}

console.log('pulizia-branch: ok');
