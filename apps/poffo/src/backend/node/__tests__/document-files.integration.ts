import {afterEach, beforeEach, expect, test} from 'vitest'
import {mkdtemp, readdir, readFile, rm, writeFile} from 'node:fs/promises'
import {join} from 'node:path'
import {tmpdir} from 'node:os'
import {createDemoDocument, serializeDocument} from '@winter-love/puppet/player'
import {readDocumentPath} from '../read-document-path'
import {writeDocumentPath} from '../write-document-path'
import {serializeDocumentFile} from '../../serialize-document-file'

let directory: string
beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), 'poffo-files-'))
})
afterEach(async () => {
  await rm(directory, {force: true, recursive: true})
})

test.each(['json', 'poffo'] as const)(
  'should save and reload a %s document with the same validated model',
  async (format) => {
    const document = createDemoDocument()
    const path = join(directory, `model.${format}`)
    await writeDocumentPath({content: await serializeDocumentFile(document, format), path})
    const result = await readDocumentPath(path)
    expect(result.ok).toBe(true)
    if (!result.ok) {
      throw new Error(result.error.code)
    }
    expect(serializeDocument(result.document)).toBe(serializeDocument(document))
    expect(await readdir(directory)).toEqual([`model.${format}`])
  },
)

test('should preserve an existing file unless overwrite was requested', async () => {
  const path = join(directory, 'model.json')
  await writeFile(path, 'original')
  await expect(writeDocumentPath({content: new Blob(['replacement']), path})).rejects.toThrow()
  expect(await readFile(path, 'utf8')).toBe('original')
  expect(await readdir(directory)).toEqual(['model.json'])
  await writeDocumentPath({content: new Blob(['replacement']), overwrite: true, path})
  expect(await readFile(path, 'utf8')).toBe('replacement')
})

test('should leave the destination intact when cancelled before publication', async () => {
  const path = join(directory, 'model.json')
  await writeFile(path, 'original')
  const reason = new Error('cancelled')
  await expect(
    writeDocumentPath({
      content: new Blob(['replacement']),
      overwrite: true,
      path,
      signal: AbortSignal.abort(reason),
    }),
  ).rejects.toBe(reason)
  expect(await readFile(path, 'utf8')).toBe('original')
  expect(await readdir(directory)).toEqual(['model.json'])
})
