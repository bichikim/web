import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import {readdir, readFile} from 'node:fs/promises'
import {join, relative} from 'node:path'

/**
 * Verifies every packed file's SHA-256 against its installed copy and returns the file count.
 * @param {import('./types.js').CompareFilesOptions} options
 */
export const compareFiles = async ({packed, installed}) => {
  const files = (await readdir(packed, {recursive: true, withFileTypes: true}))
    .filter((entry) => entry.isFile())
    .map((entry) => relative(packed, join(entry.parentPath, entry.name)))
  // Compare one pair at a time to bound open file descriptors on developer machines and CI.
  await files.reduce(async (pending, file) => {
    await pending
    const contents = await Promise.all([
      readFile(join(packed, file)),
      readFile(join(installed, file)),
    ])
    const hashes = contents.map((content) => createHash('sha256').update(content).digest('hex'))
    assert.equal(hashes[0], hashes[1], `Installed file differs from packed archive: ${file}`)
  }, Promise.resolve())
  return files.length
}
