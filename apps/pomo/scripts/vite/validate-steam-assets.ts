import {lstatSync, readdirSync, readFileSync} from 'node:fs'
import {isAbsolute, join, relative, resolve, sep} from 'node:path'

const STEAM_ASSET_MANIFEST_FILE = 'manifest.json'
const STEAM_ASSET_MANIFEST_VERSION = 1
const MODEL_ASSET_PATTERN = /^models\/text-generation\/.+\.(?:onnx|onnx_data)$/u
const AUDIO_ASSET_PATTERN = /^audio\/tracks\/.+\.mp3$/u
const RUNTIME_MODULE_PATTERN = /^runtime\/onnxruntime-web\/.+\.mjs$/u
const RUNTIME_WASM_PATTERN = /^runtime\/onnxruntime-web\/.+\.wasm$/u

interface SteamAssetManifest {
  readonly files: ReadonlyArray<string>
  readonly version: 1
}

interface SteamAssetRequirement {
  readonly matches: (path: string) => boolean
  readonly name: string
}

export interface ValidateSteamAssetsOptions {
  readonly assetsDirectory: string
  readonly strict?: boolean
}

const STEAM_ASSET_REQUIREMENTS: ReadonlyArray<SteamAssetRequirement> = [
  {matches: (path) => MODEL_ASSET_PATTERN.test(path), name: 'text model weights'},
  {matches: (path) => AUDIO_ASSET_PATTERN.test(path), name: 'MP3 track'},
  {matches: (path) => RUNTIME_MODULE_PATTERN.test(path), name: 'ONNX Runtime module'},
  {matches: (path) => RUNTIME_WASM_PATTERN.test(path), name: 'ONNX Runtime WASM'},
]

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isStringArray = (value: unknown): value is ReadonlyArray<string> =>
  Array.isArray(value) && value.every((item: unknown) => typeof item === 'string')

const isSteamAssetManifest = (value: unknown): value is SteamAssetManifest =>
  isRecord(value) && value.version === STEAM_ASSET_MANIFEST_VERSION && isStringArray(value.files)

const readSteamAssetManifest = (manifestPath: string): SteamAssetManifest => {
  let contents: string
  try {
    contents = readFileSync(manifestPath, 'utf8')
  } catch (error) {
    throw new Error(`Steam asset manifest could not be read: ${manifestPath}`, {cause: error})
  }

  let value: unknown
  try {
    value = JSON.parse(contents) as unknown
  } catch (error) {
    throw new TypeError(`Steam asset manifest is not valid JSON: ${manifestPath}`, {cause: error})
  }

  if (!isSteamAssetManifest(value)) {
    const manifestDescription = `Steam asset manifest must contain version ${STEAM_ASSET_MANIFEST_VERSION}`
    throw new TypeError(`${manifestDescription} and a string files array: ${manifestPath}`)
  }

  return value
}

const resolveManifestAssetPath = (assetsDirectory: string, assetPath: string): string => {
  const pathSegments = assetPath.split('/')
  const isInvalidPath =
    assetPath === '' ||
    isAbsolute(assetPath) ||
    assetPath.includes('\\') ||
    pathSegments.some((segment) => segment === '' || segment === '.' || segment === '..')

  if (isInvalidPath) {
    throw new TypeError(`Steam asset path must be a relative path without traversal: ${assetPath}`)
  }

  const assetRoot = resolve(assetsDirectory)
  const resolvedPath = resolve(assetRoot, assetPath)
  const relativePath = relative(assetRoot, resolvedPath)
  if (
    relativePath === '' ||
    relativePath === '..' ||
    relativePath.startsWith(`..${sep}`) ||
    isAbsolute(relativePath)
  ) {
    throw new TypeError(`Steam asset path must stay inside assets-steam: ${assetPath}`)
  }

  return resolvedPath
}

const validateListedAssetFile = (
  assetPath: string,
  resolvedPath: string,
  strict: boolean,
): void => {
  let fileStats
  try {
    fileStats = lstatSync(resolvedPath)
  } catch (error) {
    throw new Error(`Steam asset listed in manifest does not exist: ${assetPath}`, {cause: error})
  }

  if (!fileStats.isFile()) {
    throw new TypeError(`Steam asset listed in manifest is not a regular file: ${assetPath}`)
  }
  if (strict && fileStats.size === 0) {
    throw new TypeError(`Steam asset listed in manifest is empty: ${assetPath}`)
  }
}

const listSteamAssetFiles = (
  assetsDirectory: string,
  currentDirectory: string = assetsDirectory,
): ReadonlyArray<string> =>
  readdirSync(currentDirectory, {withFileTypes: true}).flatMap((entry) => {
    const resolvedPath = join(currentDirectory, entry.name)
    if (entry.isDirectory()) {
      return listSteamAssetFiles(assetsDirectory, resolvedPath)
    }
    if (entry.isFile()) {
      return [relative(assetsDirectory, resolvedPath).split(sep).join('/')]
    }

    throw new TypeError(`Steam asset directory contains an unsupported entry: ${resolvedPath}`)
  })

const validateManifestFileList = (
  assetsDirectory: string,
  manifestFiles: ReadonlyArray<string>,
  strict: boolean,
): void => {
  const uniqueFiles = new Set(manifestFiles)
  if (uniqueFiles.size !== manifestFiles.length) {
    throw new TypeError('Steam asset manifest lists a file more than once.')
  }

  manifestFiles.forEach((assetPath) => {
    if (assetPath === STEAM_ASSET_MANIFEST_FILE) {
      throw new TypeError(`Steam asset manifest must not list ${STEAM_ASSET_MANIFEST_FILE}.`)
    }
    const resolvedPath = resolveManifestAssetPath(assetsDirectory, assetPath)
    validateListedAssetFile(assetPath, resolvedPath, strict)
  })
}

const validateCompleteInventory = (
  assetsDirectory: string,
  manifestFiles: ReadonlyArray<string>,
): ReadonlyArray<string> => {
  const actualFiles = listSteamAssetFiles(assetsDirectory).filter(
    (assetPath) => assetPath !== STEAM_ASSET_MANIFEST_FILE,
  )
  const listedFiles = new Set(manifestFiles)
  return actualFiles.filter((assetPath) => !listedFiles.has(assetPath))
}

const validateRequiredAssetTypes = (manifestFiles: ReadonlyArray<string>): void => {
  const missingRequirements = STEAM_ASSET_REQUIREMENTS.filter(
    (requirement) => !manifestFiles.some(requirement.matches),
  ).map((requirement) => requirement.name)

  if (missingRequirements.length > 0) {
    throw new Error(
      `Steam asset manifest is incomplete. Required asset types are missing: ${missingRequirements.join(', ')}.`,
    )
  }
}

/** Validates the Steam asset inventory for a build profile. */
export const validateSteamAssets = ({
  assetsDirectory,
  strict = true,
}: ValidateSteamAssetsOptions): void => {
  const assetRoot = resolve(assetsDirectory)
  const manifest = readSteamAssetManifest(join(assetRoot, STEAM_ASSET_MANIFEST_FILE))
  validateManifestFileList(assetRoot, manifest.files, strict)

  if (!strict) {
    return
  }

  const omittedFiles = validateCompleteInventory(assetRoot, manifest.files)
  if (omittedFiles.length > 0) {
    throw new Error(
      `Steam asset manifest omits files present in the bundle: ${omittedFiles.join(', ')}`,
    )
  }

  validateRequiredAssetTypes(manifest.files)
}
