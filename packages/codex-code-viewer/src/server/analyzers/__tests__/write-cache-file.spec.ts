/** @vitest-environment node */
import {mkdir, mkdtemp, readdir, readFile, rm, writeFile} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {afterEach, beforeEach, describe, expect, it} from 'vitest'
import {writeCacheFile} from '../write-cache-file'

describe('writeCacheFile', () => {
  let root: string
  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'analyzer-cache-write-'))
  })
  afterEach(async () => {
    await rm(root, {force: true, recursive: true})
  })
  it('should replace stale contents with the complete artifact and remove staging files', async () => {
    const path = join(root, 'analyzer')
    await writeFile(path, 'stale')
    await writeCacheFile({bytes: Buffer.from('verified artifact'), mode: 0o755, path})
    expect(await readFile(path, 'utf8')).toBe('verified artifact')
    expect(await readdir(root)).toEqual(['analyzer'])
  })
  it('should accept simultaneous writers of the same artifact', async () => {
    const options = {
      bytes: Buffer.from('verified artifact'),
      mode: 0o755,
      path: join(root, 'analyzer'),
    }
    await Promise.all([writeCacheFile(options), writeCacheFile(options)])
    expect(await readFile(options.path)).toEqual(options.bytes)
    expect(await readdir(root)).toEqual(['analyzer'])
  })
  it('should preserve the destination and clean staging files when publication fails', async () => {
    const path = join(root, 'analyzer')
    await mkdir(path)
    await expect(
      writeCacheFile({bytes: Buffer.from('artifact'), mode: 0o755, path}),
    ).rejects.toThrow()
    expect(await readdir(path)).toEqual([])
    expect(await readdir(root)).toEqual(['analyzer'])
  })
})
