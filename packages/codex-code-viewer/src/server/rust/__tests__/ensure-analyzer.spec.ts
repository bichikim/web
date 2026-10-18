/** @vitest-environment node */
import {createHash} from 'node:crypto'
import {mkdtemp, readdir, readFile, rm, stat, writeFile} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {gzipSync} from 'node:zlib'
import {zipSync} from 'fflate'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {ensureAnalyzer} from '../ensure-analyzer'

describe('ensureAnalyzer', () => {
  const executable = Buffer.from('analyzer fixture')
  const compressed = gzipSync(executable)
  const fetchArchive = vi.fn<typeof fetch>()
  let root: string
  const asset = {
    archive: 'analyzer.gz',
    host: 'darwin-arm64',
    sha256: createHash('sha256').update(compressed).digest('hex'),
  }
  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'rust-analyzer-cache-'))
    fetchArchive.mockReset().mockResolvedValue(new Response(compressed))
    vi.stubGlobal('fetch', fetchArchive)
  })
  afterEach(async () => {
    vi.unstubAllGlobals()
    await rm(root, {force: true, recursive: true})
  })
  const options = () => ({asset, cacheRoot: root, version: 'release-fixture'})

  it('should cache a verified executable and reuse it offline', async () => {
    const path = await ensureAnalyzer(options())
    expect(await readFile(path)).toEqual(executable)
    if (process.platform !== 'win32') {
      expect((await stat(path)).mode.toString(8).slice(-3)).toBe('755')
    }
    fetchArchive.mockRejectedValue(new Error('offline'))
    expect(await ensureAnalyzer(options())).toBe(path)
    expect(fetchArchive).toHaveBeenCalledTimes(1)
  })

  it('should extract only the Windows executable from its verified zip', async () => {
    const archive = zipSync({'other.txt': Buffer.from('ignored'), 'rust-analyzer.exe': executable})
    fetchArchive.mockResolvedValue(new Response(archive))
    const path = await ensureAnalyzer({
      ...options(),
      asset: {
        archive: 'analyzer.zip',
        host: 'win32-arm64',
        sha256: createHash('sha256').update(archive).digest('hex'),
      },
    })
    expect(path.endsWith('rust-analyzer.exe')).toBe(true)
    expect(await readFile(path)).toEqual(executable)
  })

  it('should repair a damaged executable from the verified cache without downloading', async () => {
    const path = await ensureAnalyzer(options())
    await writeFile(path, 'damaged executable')
    fetchArchive.mockRejectedValue(new Error('offline'))
    expect(await ensureAnalyzer(options())).toBe(path)
    expect(await readFile(path)).toEqual(executable)
    expect(fetchArchive).toHaveBeenCalledTimes(1)
  })

  it('should discard a corrupted archive and download its pinned replacement', async () => {
    const path = await ensureAnalyzer(options())
    await writeFile(join(path, '..', asset.archive), 'damaged archive')
    fetchArchive.mockResolvedValue(new Response(compressed))
    await ensureAnalyzer(options())
    expect(fetchArchive).toHaveBeenCalledTimes(2)
  })

  it('should reject a checksum mismatch without publishing an executable', async () => {
    fetchArchive.mockResolvedValue(new Response(gzipSync(Buffer.from('unexpected executable'))))
    await expect(ensureAnalyzer(options())).rejects.toThrow('checksum mismatch')
    expect(await readdir(root)).toEqual([])
  })

  it('should retry a failed download on the next request', async () => {
    fetchArchive.mockRejectedValueOnce(new Error('offline'))
    await expect(ensureAnalyzer(options())).rejects.toThrow('offline')
    expect(await readFile(await ensureAnalyzer(options()))).toEqual(executable)
    expect(fetchArchive).toHaveBeenCalledTimes(2)
  })

  it('should reject an unsuccessful response without caching it', async () => {
    fetchArchive.mockResolvedValue(new Response('not found', {status: 404}))
    await expect(ensureAnalyzer(options())).rejects.toThrow('404')
    expect(await readdir(root)).toEqual([])
  })

  it('should share one download among simultaneous requests', async () => {
    const paths = await Promise.all([ensureAnalyzer(options()), ensureAnalyzer(options())])
    expect(paths[0]).toBe(paths[1])
    expect(fetchArchive).toHaveBeenCalledTimes(1)
    expect(await readdir(join(paths[0]!, '..'))).toEqual(
      expect.arrayContaining([asset.archive, 'rust-analyzer']),
    )
    expect(
      (await readdir(join(paths[0]!, '..'))).some((name) => name.startsWith('.pending-')),
    ).toBe(false)
  })
})
