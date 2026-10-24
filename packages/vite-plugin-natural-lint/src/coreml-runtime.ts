import {spawn} from 'node:child_process'
import {createHash} from 'node:crypto'
import {access, chmod, mkdir, mkdtemp, readFile, rename, rm, writeFile} from 'node:fs/promises'
import {constants} from 'node:fs'
import {release} from 'node:os'
import path from 'node:path'

const LAYA_COREML_REQUIREMENT = 'laya-coreml==0.1.0'
const MANAGED_PYTHON_VERSION = '3.12'
const BYTES_PER_MEBIBYTE = 1_048_576
const EXECUTABLE_FILE_MODE = 0o755
const MACOS_15_KERNEL_MAJOR = 24
const MAXIMUM_UV_ARCHIVE_MEBIBYTES = 64
const MAXIMUM_UV_ARCHIVE_BYTES = MAXIMUM_UV_ARCHIVE_MEBIBYTES * BYTES_PER_MEBIBYTE
const RUNTIME_DIRECTORY = 'environment-v1'
const UV_ARCHIVE_SHA256 = '85f00cbdc6dd3e97eba4c31b4d014375a9fdfe8f570023b84e5102fc3456896b'
const UV_ARCHIVE_URL =
  'https://github.com/astral-sh/uv/releases/download/0.12.17/uv-aarch64-apple-darwin.tar.gz'
const UV_DIRECTORY = 'uv-0.12.17-aarch64-apple-darwin'

const runtimeManifest = JSON.stringify(
  {
    laya: LAYA_COREML_REQUIREMENT,
    python: MANAGED_PYTHON_VERSION,
    schema: 1,
    uv: '0.12.17',
  },
  undefined,
  2,
)

export interface CoremlRuntimeCommandOptions {
  readonly environment: Readonly<Record<string, string | undefined>>
}

export interface CoremlRuntimeSystem {
  readonly arch: string
  readonly platform: NodeJS.Platform
  readonly release: string
  download(url: string, destination: string, expectedSha256: string): Promise<void>
  reportStatus?(message: string): void
  run(
    command: string,
    arguments_: ReadonlyArray<string>,
    options: CoremlRuntimeCommandOptions,
  ): Promise<void>
}

export interface PreparedCoremlRuntime {
  readonly environment: Readonly<Record<string, string | undefined>>
  readonly pythonPath: string
}

export type CoremlRuntimeProvisioner = (runtimeDirectory: string) => Promise<PreparedCoremlRuntime>

const download = async (
  url: string,
  destination: string,
  expectedSha256: string,
): Promise<void> => {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`CoreML runtime download failed with HTTP ${response.status}.`)
  }
  const contentLength = Number(response.headers.get('content-length'))
  if (Number.isFinite(contentLength) && contentLength > MAXIMUM_UV_ARCHIVE_BYTES) {
    throw new Error('CoreML runtime download exceeded the expected size.')
  }
  if (response.body === null) {
    throw new Error('CoreML runtime download returned no content.')
  }
  const chunks: Buffer[] = []
  let archiveSize = 0
  for await (const chunk of response.body) {
    const buffer = Buffer.from(chunk)
    archiveSize += buffer.byteLength
    if (archiveSize > MAXIMUM_UV_ARCHIVE_BYTES) {
      throw new Error('CoreML runtime download exceeded the expected size.')
    }
    chunks.push(buffer)
  }
  const archive = Buffer.concat(chunks, archiveSize)
  const digest = createHash('sha256').update(archive).digest('hex')
  if (digest !== expectedSha256) {
    throw new Error('CoreML runtime download failed SHA-256 verification.')
  }
  await writeFile(destination, archive, {mode: 0o600})
}

const run = async (
  command: string,
  arguments_: ReadonlyArray<string>,
  options: CoremlRuntimeCommandOptions,
): Promise<void> =>
  new Promise((resolve, reject) => {
    const child = spawn(command, [...arguments_], {
      env: {...options.environment},
      stdio: ['ignore', 'ignore', 'pipe'],
    })
    let standardError = ''
    child.stderr.setEncoding('utf8')
    child.stderr.on('data', (chunk: string) => {
      standardError += chunk
    })
    child.once('error', (cause) => {
      reject(new Error(`CoreML runtime command could not start: ${command}`, {cause}))
    })
    child.once('exit', (code, signal) => {
      if (code === 0) {
        resolve()
        return
      }
      const detail = standardError.trim()
      const suffix = detail.length === 0 ? '' : `\n${detail}`
      reject(
        new Error(
          `CoreML runtime command failed: ${command} (code=${String(code)}, signal=${String(signal)})${suffix}`,
        ),
      )
    })
  })

const defaultSystem: CoremlRuntimeSystem = {
  arch: process.arch,
  download,
  platform: process.platform,
  release: release(),
  reportStatus: (message) => process.stderr.write(`[natural-lint] ${message}\n`),
  run,
}

const canExecute = async (filePath: string): Promise<boolean> => {
  try {
    await access(filePath, constants.X_OK)
    return true
  } catch {
    return false
  }
}

const isPrepared = async (environmentDirectory: string): Promise<boolean> => {
  const pythonPath = path.join(environmentDirectory, 'bin/python')
  try {
    const manifest = await readFile(path.join(environmentDirectory, 'runtime.json'), 'utf8')
    return manifest === runtimeManifest && (await canExecute(pythonPath))
  } catch {
    return false
  }
}

const ensureSupportedPlatform = (system: CoremlRuntimeSystem): void => {
  if (system.platform !== 'darwin' || system.arch !== 'arm64') {
    throw new Error('Managed CoreML requires Apple Silicon macOS.')
  }
  const kernelMajor = Number.parseInt(system.release.split('.')[0] ?? '', 10)
  if (!Number.isFinite(kernelMajor) || kernelMajor < MACOS_15_KERNEL_MAJOR) {
    throw new Error('Managed CoreML requires macOS 15 or newer.')
  }
}

const runtimeEnvironment = (
  runtimeDirectory: string,
): Readonly<Record<string, string | undefined>> => {
  const inheritedEnvironment = Object.fromEntries(
    Object.entries(process.env).filter(
      ([name]) => !name.startsWith('PIP_') && !name.startsWith('UV_') && name !== 'HF_ENDPOINT',
    ),
  )
  return {
    ...inheritedEnvironment,
    HF_ENDPOINT: 'https://huggingface.co',
    HF_HOME: path.join(runtimeDirectory, 'huggingface'),
    HF_HUB_DISABLE_TELEMETRY: '1',
    PYTHONNOUSERSITE: '1',
    PYTHONSAFEPATH: '1',
    TOKENIZERS_PARALLELISM: 'false',
    UV_CACHE_DIR: path.join(runtimeDirectory, 'uv-cache'),
    UV_DEFAULT_INDEX: 'https://pypi.org/simple',
    UV_INDEX_STRATEGY: 'first-index',
    UV_KEYRING_PROVIDER: 'disabled',
    UV_NO_CONFIG: '1',
    UV_PYTHON_INSTALL_DIR: path.join(runtimeDirectory, 'python'),
  }
}

const installUv = async (
  runtimeDirectory: string,
  system: CoremlRuntimeSystem,
  environment: Readonly<Record<string, string | undefined>>,
): Promise<string> => {
  const toolDirectory = path.join(runtimeDirectory, UV_DIRECTORY)
  const uvPath = path.join(toolDirectory, 'uv')
  if (await canExecute(uvPath)) {
    return uvPath
  }
  const temporaryDirectory = await mkdtemp(path.join(runtimeDirectory, '.uv-'))
  try {
    const archivePath = path.join(temporaryDirectory, 'uv.tar.gz')
    const extractedDirectory = path.join(temporaryDirectory, 'extracted')
    await mkdir(extractedDirectory)
    await system.download(UV_ARCHIVE_URL, archivePath, UV_ARCHIVE_SHA256)
    await system.run(
      '/usr/bin/tar',
      ['-xzf', archivePath, '--strip-components=1', '-C', extractedDirectory],
      {environment},
    )
    await chmod(path.join(extractedDirectory, 'uv'), EXECUTABLE_FILE_MODE)
    try {
      await rename(extractedDirectory, toolDirectory)
    } catch (cause: unknown) {
      if (!(await canExecute(uvPath))) {
        throw new Error('CoreML runtime could not install its verified uv executable.', {cause})
      }
    }
    return uvPath
  } finally {
    await rm(temporaryDirectory, {force: true, recursive: true})
  }
}

const installEnvironment = async (
  runtimeDirectory: string,
  uvPath: string,
  system: CoremlRuntimeSystem,
  environment: Readonly<Record<string, string | undefined>>,
): Promise<string> => {
  const environmentDirectory = path.join(runtimeDirectory, RUNTIME_DIRECTORY)
  if (await isPrepared(environmentDirectory)) {
    return environmentDirectory
  }
  const temporaryDirectory = await mkdtemp(path.join(runtimeDirectory, '.environment-'))
  try {
    await system.run(
      uvPath,
      [
        'venv',
        '--python',
        MANAGED_PYTHON_VERSION,
        '--managed-python',
        '--no-project',
        '--no-config',
        '--no-progress',
        temporaryDirectory,
      ],
      {environment},
    )
    const pythonPath = path.join(temporaryDirectory, 'bin/python')
    const requirementsPath = path.resolve(import.meta.dirname, '../bridge/coreml-requirements.txt')
    await system.run(
      uvPath,
      [
        'pip',
        'install',
        '--python',
        pythonPath,
        '--require-hashes',
        '--only-binary',
        ':all:',
        '--no-config',
        '--no-progress',
        '--requirement',
        requirementsPath,
      ],
      {environment},
    )
    await writeFile(path.join(temporaryDirectory, 'runtime.json'), runtimeManifest)
    try {
      await rename(temporaryDirectory, environmentDirectory)
    } catch (cause: unknown) {
      if (!(await isPrepared(environmentDirectory))) {
        throw new Error('CoreML runtime could not publish its isolated environment.', {cause})
      }
    }
    return environmentDirectory
  } finally {
    await rm(temporaryDirectory, {force: true, recursive: true})
  }
}

export const createCoremlRuntimeProvisioner =
  (system: CoremlRuntimeSystem): CoremlRuntimeProvisioner =>
  async (runtimeDirectory) => {
    ensureSupportedPlatform(system)
    await mkdir(runtimeDirectory, {recursive: true})
    const environment = runtimeEnvironment(runtimeDirectory)
    const environmentDirectory = path.join(runtimeDirectory, RUNTIME_DIRECTORY)
    if (!(await isPrepared(environmentDirectory))) {
      system.reportStatus?.(
        `Preparing the isolated CoreML runtime in ${runtimeDirectory}. The first run may take several minutes.`,
      )
      const uvPath = await installUv(runtimeDirectory, system, environment)
      await installEnvironment(runtimeDirectory, uvPath, system, environment)
    }
    return {
      environment,
      pythonPath: path.join(environmentDirectory, 'bin/python'),
    }
  }

export const ensureCoremlRuntime = createCoremlRuntimeProvisioner(defaultSystem)
