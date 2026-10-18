/** @vitest-environment node */
import {createHash} from 'node:crypto'
import {mkdtemp, readdir, readFile, rm, writeFile} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {dirname, join} from 'node:path'
import {gzipSync} from 'node:zlib'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {ensureTypescriptAnalyzer} from '../ensure-typescript-analyzer'

const entry = (name: string, content: string): Buffer => {
  const header = Buffer.alloc(512)
  header.write(`package/${name}`)
  header.write(content.length.toString(8).padStart(11, '0'), 124)
  header.write('0', 156)
  return Buffer.concat([
    header,
    Buffer.from(content),
    Buffer.alloc((512 - (content.length % 512)) % 512),
  ])
}
const archive = (binary = 'tsc'): Buffer =>
  gzipSync(
    Buffer.concat([
      entry(`lib/${binary}`, 'verified executable'),
      entry('lib/lib.d.ts', 'verified declarations'),
      entry('LICENSE', 'license'),
      entry('NOTICE.txt', 'notice'),
    ]),
  )
const integrity = (bytes: Uint8Array): string =>
  `sha512-${createHash('sha512').update(bytes).digest('base64')}`

describe('ensureTypescriptAnalyzer', () => {
  const bytes = archive()
  const download = vi.fn<typeof fetch>()
  let root: string
  const options = () => ({
    asset: {host: 'linux-x64', integrity: integrity(bytes)},
    cacheRoot: root,
    version: '7.0.2',
  })
  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'typescript-analyzer-'))
    download.mockReset().mockImplementation(async () => new Response(new Uint8Array(bytes)))
    vi.stubGlobal('fetch', download)
  })
  afterEach(async () => {
    vi.unstubAllGlobals()
    await rm(root, {force: true, recursive: true})
  })
  it('should download the pinned host archive and reuse verified files offline', async () => {
    const path = await ensureTypescriptAnalyzer(options())
    expect(await readFile(path, 'utf8')).toBe('verified executable')
    expect(await readFile(join(dirname(path), 'lib.d.ts'), 'utf8')).toBe('verified declarations')
    expect(download).toHaveBeenCalledWith(
      'https://registry.npmjs.org/@typescript/typescript-linux-x64/-/typescript-linux-x64-7.0.2.tgz',
      expect.any(Object),
    )
    download.mockRejectedValue(new Error('offline'))
    expect(await ensureTypescriptAnalyzer(options())).toBe(path)
    expect(download).toHaveBeenCalledTimes(1)
  })
  it('should reject mismatched bytes before publishing files', async () => {
    download.mockResolvedValue(new Response(new Uint8Array(archive('tsc.exe'))))
    await expect(ensureTypescriptAnalyzer(options())).rejects.toThrow('checksum mismatch')
    expect(await readdir(root)).toEqual([])
  })
  it('should repair executable and SDK corruption from the verified archive offline', async () => {
    const path = await ensureTypescriptAnalyzer(options())
    await writeFile(path, 'damaged')
    await writeFile(join(dirname(path), 'lib.d.ts'), 'damaged')
    download.mockRejectedValue(new Error('offline'))
    await ensureTypescriptAnalyzer(options())
    expect(await readFile(path, 'utf8')).toBe('verified executable')
    expect(await readFile(join(dirname(path), 'lib.d.ts'), 'utf8')).toBe('verified declarations')
    expect(download).toHaveBeenCalledTimes(1)
  })
  it('should download again when the cached archive is corrupted', async () => {
    const path = await ensureTypescriptAnalyzer(options())
    await writeFile(join(dirname(path), 'archive.tgz'), 'damaged')
    await ensureTypescriptAnalyzer(options())
    expect(download).toHaveBeenCalledTimes(2)
  })
  it('should retry after a failed download without retaining a rejected request', async () => {
    download.mockRejectedValueOnce(new Error('offline'))
    await expect(ensureTypescriptAnalyzer(options())).rejects.toThrow('offline')
    expect(await readFile(await ensureTypescriptAnalyzer(options()), 'utf8')).toBe(
      'verified executable',
    )
  })
  it('should share a download between concurrent requests', async () => {
    const paths = await Promise.all([
      ensureTypescriptAnalyzer(options()),
      ensureTypescriptAnalyzer(options()),
    ])
    expect(paths[0]).toBe(paths[1])
    expect(download).toHaveBeenCalledTimes(1)
  })
  it('should extract a Windows executable', async () => {
    const windows = archive('tsc.exe')
    download.mockResolvedValue(new Response(new Uint8Array(windows)))
    const path = await ensureTypescriptAnalyzer({
      ...options(),
      asset: {host: 'win32-arm64', integrity: integrity(windows)},
    })
    expect(path.endsWith('tsc.exe')).toBe(true)
    expect(await readFile(path, 'utf8')).toBe('verified executable')
  })
  it('should reject a verified archive missing the requested host executable', async () => {
    await expect(
      ensureTypescriptAnalyzer({...options(), asset: {...options().asset, host: 'win32-x64'}}),
    ).rejects.toThrow('Missing TypeScript binary or SDK')
    expect(await readdir(root)).toEqual([])
  })
})
