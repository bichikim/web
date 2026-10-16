import {strict as assert} from 'node:assert'
import {
  mkdtempSync,
  readFileSync,
  renameSync,
  statSync,
  symlinkSync,
  unlinkSync,
  utimesSync,
  writeFileSync,
} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {readPathRevisions} from '../../src/server/navigation-cache/read-path-revisions'
import {readInputRevisions} from './read-input-revisions'

const root = mkdtempSync(join(tmpdir(), 'native-revisions-'))
const source = join(root, 'source.ts')
const missing = join(root, 'missing.ts')
const configuration = join(root, 'tsconfig.json')
const link = join(root, 'linked.ts')
const other = join(root, 'other.ts')
const STABLE_TIME = 1_700_000_000
writeFileSync(source, 'export const value = 1')
utimesSync(source, STABLE_TIME, STABLE_TIME)
writeFileSync(other, 'export const value = 2')
writeFileSync(configuration, '{}')
symlinkSync(source, link)
const paths = [root, source, missing, configuration, link, other]
const capture = async () => {
  const before = await readPathRevisions(paths, new AbortController().signal)
  const after = await readInputRevisions(paths, new AbortController().signal)
  assert.deepEqual(after, before)
  return after
}
const initial = await capture()
assert.deepEqual(await capture(), initial)
const original = statSync(source, {bigint: true})
writeFileSync(source, readFileSync(source, 'utf8').replace('1', '3'))
utimesSync(source, STABLE_TIME, STABLE_TIME)
const rewritten = statSync(source, {bigint: true})
assert.equal(rewritten.size, original.size)
assert.equal(rewritten.mtimeNs, original.mtimeNs)
assert.notEqual(rewritten.ctimeNs, original.ctimeNs)
assert.notEqual((await capture()).get(source), initial.get(source))
const beforeReplace = await capture()
const replacement = join(root, 'replacement.ts')
writeFileSync(replacement, readFileSync(source))
renameSync(replacement, source)
assert.notEqual((await capture()).get(source), beforeReplace.get(source))
writeFileSync(missing, 'export {}')
assert.notEqual((await capture()).get(missing), null)
unlinkSync(missing)
assert.equal((await capture()).get(missing), null)
writeFileSync(configuration, '{"compilerOptions":{"strict":true}}')
assert.notEqual((await capture()).get(configuration), initial.get(configuration))
const beforeLink = await capture()
unlinkSync(link)
symlinkSync(other, link)
assert.notEqual((await capture()).get(link), beforeLink.get(link))
console.log(
  JSON.stringify({
    checks: [
      'unchanged',
      'same-size-restored-mtime',
      'atomic-replacement',
      'missing-created',
      'deleted',
      'configuration',
      'symlink-retarget',
    ],
    passed: true,
  }),
)
