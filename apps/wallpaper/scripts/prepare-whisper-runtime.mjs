import {createHash} from 'node:crypto'
import {createReadStream, createWriteStream} from 'node:fs'
import {
  chmod,
  copyFile,
  mkdir,
  readdir,
  readFile,
  rename,
  rm,
  stat,
  writeFile,
} from 'node:fs/promises'
import {execFile} from 'node:child_process'
import {basename, join} from 'node:path'
import {Readable} from 'node:stream'
import {pipeline} from 'node:stream/promises'
import {fileURLToPath} from 'node:url'
import {promisify} from 'node:util'

const execute = promisify(execFile)
const root = fileURLToPath(new URL('..', import.meta.url))
const manifest = JSON.parse(await readFile(join(root, 'whisper-runtime.json'), 'utf8'))
const directory = join(root, '.cache/whisper-runtime')
const platform = manifest.platforms[`${process.platform}-${process.arch}`]
const EXECUTABLE_MODE = 0o755

const digest = async (path) => {
  const hash = createHash('sha256')
  for await (const chunk of createReadStream(path)) {
    hash.update(chunk)
  }
  return hash.digest('hex')
}

const archiveFile = async () => {
  const archive = join(directory, `${manifest.version}-${platform.archive}`)
  const exists = await stat(archive).then(
    () => true,
    (cause) => {
      if (cause.code !== 'ENOENT') {
        throw cause
      }
      return false
    },
  )
  if (exists && (await digest(archive)) === platform.sha256) {
    return archive
  }
  const response = await fetch(
    `https://github.com/${manifest.repository}/releases/download/v${manifest.version}/${platform.archive}`,
  )
  if (!response.ok || response.body === null) {
    throw new Error(`Whisper runtime download failed (${response.status})`)
  }
  const temporary = `${archive}.download`
  try {
    await pipeline(Readable.fromWeb(response.body), createWriteStream(temporary))
    if ((await digest(temporary)) !== platform.sha256) {
      throw new Error('Whisper runtime checksum mismatch')
    }
    await rename(temporary, archive)
  } finally {
    await rm(temporary, {force: true})
  }
  return archive
}

/** Bundles the pinned Whisper-compatible executable, its libraries and upstream license notices. */
export const prepareWhisperRuntime = async () => {
  if (platform === undefined) {
    throw new Error(`Whisper runtime unavailable for ${process.platform}-${process.arch}`)
  }
  const libraries = join(directory, 'libraries')
  await mkdir(libraries, {recursive: true})
  const extension = process.platform === 'win32' ? '.exe' : ''
  const executable = join(directory, `crispasr-${platform.target}${extension}`)
  const stamp = join(directory, 'version.txt')
  try {
    if ((await readFile(stamp, 'utf8')) === manifest.version && (await stat(executable)).size > 0) {
      return
    }
  } catch (cause) {
    if (cause.code !== 'ENOENT') {
      throw cause
    }
  }
  const archive = await archiveFile()
  const unpacked = join(directory, `unpacked-${manifest.version}`)
  await mkdir(unpacked, {recursive: true})
  if (platform.archive.endsWith('.zip') && process.platform !== 'win32') {
    await execute('unzip', ['-q', '-o', archive, '-d', unpacked])
  } else {
    // Windows includes a ZIP-capable tar. Git Bash may put GNU tar first on PATH.
    const tar =
      process.platform === 'win32'
        ? join(process.env.SystemRoot ?? 'C:\\Windows', 'System32', 'tar.exe')
        : 'tar'
    await execute(tar, ['-xf', archive, '-C', unpacked])
  }
  const entries = await readdir(unpacked, {recursive: true})
  const binary = entries.find((entry) => basename(entry) === `crispasr${extension}`)
  if (binary === undefined) {
    throw new Error('Whisper runtime executable missing from archive')
  }
  await copyFile(join(unpacked, binary), executable)
  await Promise.all(
    entries
      .filter((entry) => /\.(?:dylib|dll|so(?:\.\d+)*)$/iu.test(entry))
      .map((entry) => copyFile(join(unpacked, entry), join(libraries, basename(entry)))),
  )
  if (process.platform !== 'win32') {
    await chmod(executable, EXECUTABLE_MODE)
  }
  if (process.platform === 'darwin') {
    await execute('install_name_tool', ['-add_rpath', '@loader_path/libraries', executable])
    await execute('install_name_tool', [
      '-add_rpath',
      '@executable_path/../Resources/whisper-runtime',
      executable,
    ])
    await execute('codesign', ['--force', '--sign', '-', executable])
  }
  await Promise.all(
    ['LICENSE', 'THIRD_PARTY_NOTICES.txt'].map(async (name) => {
      const entry = entries.find((entry) => basename(entry) === name)
      if (entry === undefined) {
        throw new Error(`Whisper runtime ${name} missing from archive`)
      }
      await copyFile(join(unpacked, entry), join(libraries, name))
    }),
  )
  await writeFile(
    join(libraries, 'MODELS.txt'),
    `${[
      'BuzzASR Korean (MIT): https://huggingface.co/BuzzASR/korean',
      'GGML Q8 conversion (MIT): https://huggingface.co/wavu/buzzasr-korean-ggml',
      'Silero VAD (MIT): https://github.com/snakers4/silero-vad',
    ].join('\n')}\n`,
  )
  await writeFile(stamp, manifest.version)
}
