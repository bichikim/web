import {createHash} from 'node:crypto'
import {chmod, copyFile, mkdir, mkdtemp, readFile, rm, writeFile} from 'node:fs/promises'
import {join} from 'node:path'
import {tmpdir} from 'node:os'
import {spawn} from 'node:child_process'
import {once} from 'node:events'

const TARGETS = {
  'aarch64-apple-darwin': 'darwin-arm64',
  'x86_64-apple-darwin': 'darwin-x64',
  'x86_64-pc-windows-msvc': 'win-x64',
}

export const downloadNode = async ({target, directory, licenses}) => {
  const platform = TARGETS[target]
  if (platform === undefined) {
    throw new Error(`Unsupported desktop target: ${target}`)
  }
  const windows = platform.startsWith('win-')
  const name = `node-${process.version}-${platform}`
  const archive = `${name}.${windows ? 'zip' : 'tar.gz'}`
  const base = `https://nodejs.org/dist/${process.version}`
  const listing = await fetch(`${base}/SHASUMS256.txt`)
  if (!listing.ok) {
    throw new Error(`Node checksums: HTTP ${listing.status}`)
  }
  const expected = (await listing.text())
    .split('\n')
    .find((line) => line.endsWith(`  ${archive}`))
    ?.split(' ')[0]
  if (expected === undefined) {
    throw new Error(`Node archive is not listed: ${archive}`)
  }
  const temporary = await mkdtemp(join(tmpdir(), 'poffo-node-'))
  try {
    const response = await fetch(`${base}/${archive}`)
    if (!response.ok) {
      throw new Error(`Node archive: HTTP ${response.status}`)
    }
    const bytes = Buffer.from(await response.arrayBuffer())
    if (createHash('sha256').update(bytes).digest('hex') !== expected) {
      throw new Error('Node archive checksum mismatch')
    }
    const path = join(temporary, archive)
    await writeFile(path, bytes)
    const systemRoot = process.env.SystemRoot
    if (process.platform === 'win32' && systemRoot === undefined) {
      throw new Error('Windows SystemRoot is unavailable')
    }
    // Git Bash's GNU tar treats drive letters as remote hosts and does not extract ZIPs.
    const extractor = process.platform === 'win32' ? join(systemRoot, 'System32', 'tar.exe') : 'tar'
    const child = spawn(extractor, ['-xf', archive], {cwd: temporary, stdio: 'inherit'})
    const [code] = await once(child, 'exit')
    if (code !== 0) {
      throw new Error('Node archive extraction failed')
    }
    await mkdir(directory, {recursive: true})
    await mkdir(licenses, {recursive: true})
    const destination = join(directory, `poffo-node-${target}${windows ? '.exe' : ''}`)
    await copyFile(join(temporary, name, windows ? 'node.exe' : 'bin/node'), destination)
    const EXECUTABLE_MODE = 0o755
    await chmod(destination, EXECUTABLE_MODE)
    await writeFile(
      join(licenses, 'Node-LICENSE.txt'),
      await readFile(join(temporary, name, 'LICENSE')),
    )
    return {archive, sha256: expected, version: process.version}
  } finally {
    await rm(temporary, {force: true, recursive: true})
  }
}
