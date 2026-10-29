import {execFileSync} from 'node:child_process'
import {createHash} from 'node:crypto'
import {existsSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs'
import {isAbsolute} from 'node:path'
import snapshot from './sdk-types.json' with {type: 'json'}

const destination = new URL('./.cache/claude-code.d.ts', import.meta.url)
const digest = (bytes: Uint8Array): string => createHash('sha256').update(bytes).digest('hex')
const cached = existsSync(destination) ? readFileSync(destination) : undefined
if (cached !== undefined && digest(cached) === snapshot.sha256) {
  console.log(`Claude SDK ${snapshot.version} types are ready.`)
} else {
  const configured = process.env.CLAUDE_BINARY ?? 'claude'
  const [binary] = isAbsolute(configured)
    ? [configured]
    : execFileSync(process.platform === 'win32' ? 'where.exe' : 'which', [configured], {
        encoding: 'utf8',
      }).split(/\r?\n/u)
  if (binary === undefined || binary === '') {
    throw new Error('Claude CLI was not found.')
  }
  const [version] = execFileSync(binary, ['--version'], {encoding: 'utf8'}).trim().split(' ')
  if (version !== snapshot.version) {
    throw new Error(`SDK types require Claude CLI ${snapshot.version}; found ${version}.`)
  }
  const bytes = readFileSync(binary)
  const magic = Buffer.from('28b52ffd', 'hex')
  const frames: number[] = []
  let cursor = bytes.indexOf(magic)
  while (cursor >= 0) {
    frames.push(cursor)
    cursor = bytes.indexOf(magic, cursor + magic.length)
  }
  const MAX_FRAME_BYTES = 2_000_000
  const [declarations] = frames.flatMap((offset, index) => {
    const end = frames[index + 1] ?? Math.min(bytes.length, offset + MAX_FRAME_BYTES)
    if (end - offset > MAX_FRAME_BYTES) {
      return []
    }
    let decoded: Buffer
    try {
      decoded = execFileSync(process.env.ZSTD_BINARY ?? 'zstd', ['-q', '-d', '-c'], {
        input: bytes.subarray(offset, end),
        maxBuffer: MAX_FRAME_BYTES,
        stdio: ['pipe', 'pipe', 'pipe'],
      })
    } catch (error) {
      // Bundled frames may be followed by binary metadata after the completed stream.
      if (!(error instanceof Error && 'stdout' in error && Buffer.isBuffer(error.stdout))) {
        throw error
      }
      decoded = error.stdout
    }
    if (!decoded.includes("declare module 'claude-code/testing'")) {
      return []
    }
    const source = Buffer.concat([Buffer.from(`// Written by Claude Code ${version}.\n`), decoded])
    return digest(source) === snapshot.sha256 ? [source] : []
  })
  if (declarations === undefined) {
    throw new Error('The CLI bundle did not contain the pinned SDK declarations.')
  }
  mkdirSync(new URL('./.cache/', import.meta.url), {recursive: true})
  writeFileSync(destination, declarations)
  console.log(`Prepared Claude SDK ${version} types from the local CLI.`)
}
