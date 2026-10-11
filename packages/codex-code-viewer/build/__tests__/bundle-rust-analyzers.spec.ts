import {createHash} from 'node:crypto'
import {accessSync, constants, mkdtempSync, readFileSync, rmSync, writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {gzipSync} from 'node:zlib'
import {zipSync} from 'fflate'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {bundleRustAnalyzers} from '../bundle-rust-analyzers'

describe('bundleRustAnalyzers', () => {
  let output: string
  const executable = Buffer.from('analyzer fixture')
  const compressed = gzipSync(executable)
  const checksum = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex')
  const asset = {archive: 'analyzer.gz', host: 'darwin-arm64', sha256: checksum(compressed)}
  const fetch = vi.fn()
  beforeEach(() => {
    output = mkdtempSync(join(tmpdir(), 'rust-bundle-'))
    fetch.mockResolvedValue(new Response(compressed))
    vi.stubGlobal('fetch', fetch)
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.clearAllMocks()
    rmSync(output, {force: true, recursive: true})
  })

  it('should verify, extract and reuse a pinned analyzer without downloading it again', async () => {
    const options = {assets: [asset], output, version: 'pinned-version'}
    await bundleRustAnalyzers(options)
    const path = join(output, 'rust/darwin-arm64/rust-analyzer')
    expect(readFileSync(path)).toEqual(executable)
    if (process.platform !== 'win32') {
      expect(() => accessSync(path, constants.X_OK)).not.toThrow()
    }
    await bundleRustAnalyzers(options)
    expect(fetch).toHaveBeenCalledOnce()
    expect(fetch).toHaveBeenCalledWith(
      'https://github.com/rust-lang/rust-analyzer/releases/download/pinned-version/analyzer.gz',
    )
  })
  it('should reject corrupted cached archives', async () => {
    const options = {assets: [asset], output, version: 'pinned-version'}
    await bundleRustAnalyzers(options)
    writeFileSync(join(output, 'rust/darwin-arm64/pinned-version/analyzer.gz'), 'corrupted')
    await expect(bundleRustAnalyzers(options)).rejects.toThrow('checksum mismatch')
    expect(fetch).toHaveBeenCalledOnce()
  })
  it('should fetch a new release instead of treating the previous release cache as corruption', async () => {
    await bundleRustAnalyzers({assets: [asset], output, version: 'first-version'})
    const updated = Buffer.from('updated analyzer fixture')
    const compressed = gzipSync(updated)
    fetch.mockResolvedValue(new Response(compressed))
    await bundleRustAnalyzers({
      assets: [{...asset, sha256: checksum(compressed)}],
      output,
      version: 'second-version',
    })
    expect(readFileSync(join(output, 'rust/darwin-arm64/rust-analyzer'))).toEqual(updated)
    expect(fetch).toHaveBeenCalledTimes(2)
  })
  it('should extract only the Windows executable from the official zip layout', async () => {
    const compressed = zipSync({
      'rust-analyzer.exe': executable,
      'unrelated.txt': Buffer.from('ignore'),
    })
    fetch.mockResolvedValue(new Response(compressed))
    await bundleRustAnalyzers({
      assets: [{archive: 'analyzer.zip', host: 'win32-x64', sha256: checksum(compressed)}],
      output,
      version: 'pinned-version',
    })
    expect(readFileSync(join(output, 'rust/win32-x64/rust-analyzer.exe'))).toEqual(executable)
  })
  it('should fail the build when the release cannot be downloaded', async () => {
    fetch.mockResolvedValue(new Response('', {status: 404}))
    await expect(
      bundleRustAnalyzers({assets: [asset], output, version: 'pinned-version'}),
    ).rejects.toThrow('Cannot download Rust analyzer: 404')
  })
})
