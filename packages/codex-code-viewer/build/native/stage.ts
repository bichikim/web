import {createHash} from 'node:crypto'
import {createReadStream, createWriteStream} from 'node:fs'
import {mkdir, open, writeFile} from 'node:fs/promises'
import {join} from 'node:path'
import {pipeline} from 'node:stream/promises'
import {build} from 'esbuild'
import {NATIVE_ASSETS, NATIVE_BUILD, patchAssets} from './patch-assets'

interface ArchiveEntry {
  files?: Record<string, ArchiveEntry>
  offset?: string
  size?: number
  integrity?: {algorithm: string; hash: string; blockSize: number; blocks: string[]}
}

const hash = (value: Uint8Array): string => createHash('sha256').update(value).digest('hex')
const WORD_BYTES = 4
const PICKLE_BYTES = 8
const PREFIX_BYTES = 16
const LENGTH_OFFSET = 12
const INTEGRITY_BLOCK = 4194304
const entryAt = (header: ArchiveEntry, path: string): ArchiveEntry => {
  const entry = path.split('/').reduce((parent, part) => {
    const child = parent.files?.[part]
    if (child === undefined) {
      throw new Error(`Missing archive entry: ${path}`)
    }
    return child
  }, header)
  if (entry.offset === undefined || entry.size === undefined) {
    throw new Error(`Archive entry is not a packed file: ${path}`)
  }
  return entry
}

const [archive, destination] = process.argv.slice(2)
if (archive === undefined || destination === undefined) {
  throw new Error('Usage: stage.ts <original app.asar> <staging directory>')
}
const original = await open(archive, 'r')
try {
  const prefix = Buffer.alloc(PREFIX_BYTES)
  await original.read(prefix, 0, PREFIX_BYTES, 0)
  const headerBytes = Buffer.alloc(prefix.readUInt32LE(LENGTH_OFFSET))
  await original.read(headerBytes, 0, headerBytes.length, PREFIX_BYTES)
  const originalHash = hash(headerBytes)
  if (originalHash !== '29d1be7055b92b0507366b8c59f3ef1464e0fe5367dd6b5a5fe3f4d447cb2345') {
    throw new Error('Original ASAR header does not match the supported signed app.')
  }
  const header: ArchiveEntry = JSON.parse(headerBytes.toString('utf8'))
  const dataStart = PICKLE_BYTES + prefix.readUInt32LE(WORD_BYTES)
  const readEntry = async (path: string): Promise<Buffer> => {
    const entry = entryAt(header, path)
    const bytes = Buffer.alloc(entry.size!)
    await original.read(bytes, 0, bytes.length, dataStart + Number(entry.offset))
    return bytes
  }
  const manifest: {version: string} = JSON.parse((await readEntry('package.json')).toString('utf8'))
  const sources = new Map(
    await Promise.all(
      NATIVE_ASSETS.map(
        async (asset) =>
          [asset.name, (await readEntry(`webview/assets/${asset.name}`)).toString('utf8')] as const,
      ),
    ),
  )
  const bundle = await build({
    bundle: true,
    entryPoints: [new URL('./create-tab-location.ts', import.meta.url).pathname],
    format: 'iife',
    globalName: 'WinterLoveNative',
    minify: true,
    platform: 'browser',
    target: 'es2022',
    write: false,
  })
  const helper = bundle.outputFiles[0]?.text
  if (helper === undefined) {
    throw new Error('Native location helper was not built.')
  }
  const patched = patchAssets({helper, sources, version: manifest.version})
  await mkdir(destination, {recursive: true})
  const originalSize = (await original.stat()).size
  let offset = originalSize - dataStart
  const blocks: Buffer[] = []
  for (const [name, source] of patched) {
    const bytes = Buffer.from(source)
    const entry = entryAt(header, `webview/assets/${name}`)
    const blockSize = entry.integrity?.blockSize ?? INTEGRITY_BLOCK
    entry.offset = String(offset)
    entry.size = bytes.length
    entry.integrity = {
      algorithm: 'SHA256',
      blocks: Array.from({length: Math.ceil(bytes.length / blockSize)}, (_, index) =>
        hash(bytes.subarray(index * blockSize, (index + 1) * blockSize)),
      ),
      blockSize,
      hash: hash(bytes),
    }
    offset += bytes.length
    blocks.push(bytes)
  }
  await Promise.all(
    [...patched].map(([name, source]) => writeFile(join(destination, `${name}.mjs`), source)),
  )
  const serialized = Buffer.from(JSON.stringify(header))
  const headerSize = PICKLE_BYTES + Math.ceil(serialized.length / WORD_BYTES) * WORD_BYTES
  const output = Buffer.alloc(PICKLE_BYTES + headerSize)
  output.writeUInt32LE(WORD_BYTES, 0)
  output.writeUInt32LE(headerSize, WORD_BYTES)
  output.writeUInt32LE(headerSize - WORD_BYTES, PICKLE_BYTES)
  output.writeUInt32LE(serialized.length, LENGTH_OFFSET)
  serialized.copy(output, PREFIX_BYTES)
  const target = join(destination, 'app.asar')
  await writeFile(target, output)
  await pipeline(
    createReadStream(archive, {start: dataStart}),
    createWriteStream(target, {flags: 'a'}),
  )
  await writeFile(target, Buffer.concat(blocks), {flag: 'a'})
  await writeFile(
    join(destination, 'manifest.json'),
    JSON.stringify(
      {
        assets: NATIVE_ASSETS,
        originalArchive: archive,
        originalHeaderHash: originalHash,
        patchedHeaderHash: hash(serialized),
        version: NATIVE_BUILD,
      },
      null,
      2,
    ),
  )
} finally {
  await original.close()
}
