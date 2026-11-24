import {homedir} from 'node:os'
import {dirname, join, posix, win32} from 'node:path'
import {createHash, randomUUID} from 'node:crypto'
import {createReadStream, createWriteStream} from 'node:fs'
import {copyFile, mkdir, rename, rm, stat} from 'node:fs/promises'
import {Readable, Transform} from 'node:stream'
import {pipeline} from 'node:stream/promises'

/** Resolves one OS cache namespace independently of the current working directory. */
export const cacheDirectory = (
  identifier,
  {platform = process.platform, home = homedir(), environment = process.env} = {},
) => {
  switch (platform) {
    case 'darwin':
      return posix.join(home, 'Library/Caches', identifier)
    case 'win32':
      return win32.join(
        win32.isAbsolute(environment.LOCALAPPDATA ?? '')
          ? environment.LOCALAPPDATA
          : win32.join(home, 'AppData/Local'),
        identifier,
      )
    default:
      return posix.join(
        posix.isAbsolute(environment.XDG_CACHE_HOME ?? '')
          ? environment.XDG_CACHE_HOME
          : posix.join(home, '.cache'),
        identifier,
      )
  }
}

const verified = new Map()
const pending = new Map()
const fingerprint = (metadata, checksum) =>
  [metadata.dev, metadata.ino, metadata.size, metadata.mtimeNs, metadata.ctimeNs, checksum].join(
    ':',
  )
const valid = async (path, file) => {
  try {
    const metadata = await stat(path, {bigint: true})
    if (metadata.size !== BigInt(file.size)) {
      return false
    }
    const stamp = fingerprint(metadata, file.sha256)
    if (verified.get(path) === stamp) {
      return true
    }
    const hash = createHash('sha256')
    for await (const chunk of createReadStream(path)) {
      hash.update(chunk)
    }
    if (hash.digest('hex') !== file.sha256) {
      verified.delete(path)
      return false
    }
    if (fingerprint(await stat(path, {bigint: true}), file.sha256) !== stamp) {
      verified.delete(path)
      return false
    }
    verified.set(path, stamp)
    return true
  } catch (cause) {
    if (cause.code === 'ENOENT') {
      return false
    }
    throw cause
  }
}
const migrate = async (source, destination, temporary, file) => {
  try {
    await rename(source, destination)
  } catch (cause) {
    if (cause.code !== 'EXDEV') {
      throw cause
    }
    await copyFile(source, temporary)
    if (!(await valid(temporary, file))) {
      throw new Error(`Model migration checksum mismatch: ${file.path}`)
    }
    await rename(temporary, destination)
    await rm(source)
  }
}
const prepare = async (directory, file, url, previous) => {
  const path = join(directory, file.path)
  if (await valid(path, file)) {
    return path
  }
  await mkdir(dirname(path), {recursive: true})
  const temporary = `${path}.${randomUUID()}.download`
  try {
    const candidates = await Promise.all(
      previous.map(async (root) => {
        const source = join(root, file.path)
        return (await valid(source, file)) ? source : null
      }),
    )
    const source = candidates.find((candidate) => candidate !== null)
    if (source !== undefined) {
      try {
        await migrate(source, path, temporary, file)
      } catch (cause) {
        // Another process can move the verified legacy file before this rename.
        if (cause.code !== 'ENOENT' || !(await valid(path, file))) {
          throw cause
        }
      }
      return path
    }
    if (await valid(path, file)) {
      return path
    }
    const response = await fetch(url)
    if (!response.ok || response.body === null) {
      throw new Error(`Model asset unavailable: ${file.path} (${response.status})`)
    }
    let length = 0
    const bounded = new Transform({
      transform(chunk, _encoding, callback) {
        length += chunk.length
        callback(
          length > file.size ? new Error('Model download exceeds its manifest size') : null,
          chunk,
        )
      },
    })
    await pipeline(Readable.fromWeb(response.body), bounded, createWriteStream(temporary))
    if (!(await valid(temporary, file))) {
      throw new Error(`Model asset checksum mismatch: ${file.path}`)
    }
    await rename(temporary, path)
    return path
  } finally {
    verified.delete(temporary)
    await rm(temporary, {force: true})
  }
}

/** Reuses verified weights in the supplied cache; overlapping requests share preparation and failures can be retried. */
export const prepareModelAsset = (directory, file, url, previous = []) => {
  if (
    file.path
      .split('/')
      .some((part) => !part || part === '.' || part === '..' || part.includes('\\'))
  ) {
    return Promise.reject(new Error('Invalid model cache path'))
  }
  const key = `${join(directory, file.path)}:${file.sha256}`
  if (!pending.has(key)) {
    pending.set(
      key,
      prepare(directory, file, url, previous).finally(() => pending.delete(key)),
    )
  }
  return pending.get(key)
}
