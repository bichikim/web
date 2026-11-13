/** @vitest-environment node */
import {mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {dirname, join, relative} from 'node:path'
import {afterEach, beforeEach, expect, it} from 'vitest'
import {validateSteamAssets} from '../validate-steam-assets'

const REQUIRED_FILES = [
  'models/text-generation/demo/model.onnx',
  'audio/tracks/track.mp3',
  'runtime/onnxruntime-web/1/runtime.mjs',
  'runtime/onnxruntime-web/1/runtime.wasm',
]
let directory: string

const writeAsset = (path: string, contents = 'asset') => {
  const destination = join(directory, path)
  mkdirSync(dirname(destination), {recursive: true})
  writeFileSync(destination, contents)
}
const writeManifest = (files: ReadonlyArray<string>) =>
  writeFileSync(join(directory, 'manifest.json'), JSON.stringify({files, version: 1}))

beforeEach(() => {
  directory = mkdtempSync(join(tmpdir(), 'pomo-steam-inventory-'))
  for (const path of REQUIRED_FILES) {
    writeAsset(path)
  }
  writeManifest(REQUIRED_FILES)
})
afterEach(() => rmSync(directory, {force: true, recursive: true}))

it('should accept an exactly listed nested inventory with relative and Unicode paths', () => {
  writeAsset('README.md')
  writeAsset('docs/안내.txt')
  writeManifest([...REQUIRED_FILES, 'README.md', 'docs/안내.txt'])

  expect(validateSteamAssets({assetsDirectory: relative(process.cwd(), directory)})).toBeUndefined()
})

it('should skip inventory checks and permit empty listed files in non-strict mode', () => {
  writeAsset('README.md', '')
  writeManifest(['README.md'])
  symlinkSync(join(directory, REQUIRED_FILES[0]!), join(directory, 'unlisted-link'))

  expect(validateSteamAssets({assetsDirectory: directory, strict: false})).toBeUndefined()
})

it.each([false, true])(
  'should reject duplicate paths before missing files when strict is %s',
  (strict) => {
    writeManifest(['missing.dat', 'missing.dat'])

    expect(() => validateSteamAssets({assetsDirectory: directory, strict})).toThrowError(
      new TypeError('Steam asset manifest lists a file more than once.'),
    )
  },
)

it('should reject listing the manifest itself', () => {
  writeManifest([...REQUIRED_FILES, 'manifest.json'])

  expect(() => validateSteamAssets({assetsDirectory: directory})).toThrowError(
    new TypeError('Steam asset manifest must not list manifest.json.'),
  )
})

it.each(
  ['', '/absolute', '..', '.', '../outside', './file', 'a/../b', 'a/./b', 'a//b', 'a\\b'].flatMap(
    (path) => [false, true].map((strict) => [path, strict] as const),
  ),
)('should reject the invalid manifest path %j when strict is %s', (path, strict) => {
  writeManifest([path])

  expect(() => validateSteamAssets({assetsDirectory: directory, strict})).toThrowError(
    new TypeError(`Steam asset path must be a relative path without traversal: ${path}`),
  )
})

it.each([false, true])('should reject missing listed files when strict is %s', (strict) => {
  writeManifest(['missing.dat'])

  expect(() => validateSteamAssets({assetsDirectory: directory, strict})).toThrowError(
    expect.objectContaining({
      cause: expect.objectContaining({code: 'ENOENT'}),
      message: 'Steam asset listed in manifest does not exist: missing.dat',
      name: 'Error',
    }),
  )
})

it('should reject empty listed files in strict mode', () => {
  writeAsset(REQUIRED_FILES[0]!, '')

  expect(() => validateSteamAssets({assetsDirectory: directory})).toThrowError(
    new TypeError(`Steam asset listed in manifest is empty: ${REQUIRED_FILES[0]}`),
  )
})

it('should reject a listed directory', () => {
  writeManifest([...REQUIRED_FILES, 'models'])

  expect(() => validateSteamAssets({assetsDirectory: directory})).toThrowError(
    new TypeError('Steam asset listed in manifest is not a regular file: models'),
  )
})

it.each([false, true])('should reject a listed symbolic link when strict is %s', (strict) => {
  symlinkSync(join(directory, REQUIRED_FILES[0]!), join(directory, 'listed-link'))
  writeManifest([...REQUIRED_FILES, 'listed-link'])

  expect(() => validateSteamAssets({assetsDirectory: directory, strict})).toThrowError(
    new TypeError('Steam asset listed in manifest is not a regular file: listed-link'),
  )
})

it('should reject an unlisted symbolic link during traversal', () => {
  const path = join(directory, 'unlisted-link')
  symlinkSync(join(directory, REQUIRED_FILES[0]!), path)

  expect(() => validateSteamAssets({assetsDirectory: directory})).toThrowError(
    new TypeError(`Steam asset directory contains an unsupported entry: ${path}`),
  )
})

it('should report an omitted filename even when its prefix is listed', () => {
  const omitted = `${REQUIRED_FILES[0]}_data`
  writeAsset(omitted)

  expect(() => validateSteamAssets({assetsDirectory: directory})).toThrowError(
    new Error(`Steam asset manifest omits files present in the bundle: ${omitted}`),
  )
})

it('should report an omitted required file before a missing required type', () => {
  const omitted = REQUIRED_FILES[1]!
  writeManifest(REQUIRED_FILES.filter((path) => path !== omitted))

  expect(() => validateSteamAssets({assetsDirectory: directory})).toThrowError(
    new Error(`Steam asset manifest omits files present in the bundle: ${omitted}`),
  )
})

it('should report all missing required types for a README-only release manifest', () => {
  for (const path of REQUIRED_FILES) {
    rmSync(join(directory, path))
  }
  writeAsset('README.md')
  writeManifest(['README.md'])

  expect(() => validateSteamAssets({assetsDirectory: directory})).toThrowError(
    new Error(
      'Steam asset manifest is incomplete. Required asset types are missing: ' +
        'text model weights, MP3 track, ONNX Runtime module, ONNX Runtime WASM.',
    ),
  )
})

it.each([
  [REQUIRED_FILES[0]!, 'text model weights'],
  [REQUIRED_FILES[1]!, 'MP3 track'],
  [REQUIRED_FILES[2]!, 'ONNX Runtime module'],
  [REQUIRED_FILES[3]!, 'ONNX Runtime WASM'],
])(
  'should report a missing required asset type after inventory validation for %s',
  (path, name) => {
    rmSync(join(directory, path))
    writeManifest(REQUIRED_FILES.filter((file) => file !== path))

    expect(() => validateSteamAssets({assetsDirectory: directory})).toThrowError(
      new Error(`Steam asset manifest is incomplete. Required asset types are missing: ${name}.`),
    )
  },
)

it.each(
  [
    null,
    [],
    {},
    {files: [], version: 2},
    {files: 'file', version: 1},
    {files: [1], version: 1},
  ].flatMap((value) => [false, true].map((strict) => [value, strict] as const)),
)('should reject the invalid manifest schema %j when strict is %s', (value, strict) => {
  const path = join(directory, 'manifest.json')
  writeFileSync(path, JSON.stringify(value))

  expect(() => validateSteamAssets({assetsDirectory: directory, strict})).toThrowError(
    new TypeError(`Steam asset manifest must contain version 1 and a string files array: ${path}`),
  )
})

it('should retain a JSON parse error as the manifest failure cause', () => {
  const path = join(directory, 'manifest.json')
  writeFileSync(path, '{')

  expect(() => validateSteamAssets({assetsDirectory: directory})).toThrowError(
    expect.objectContaining({
      cause: expect.any(SyntaxError),
      message: `Steam asset manifest is not valid JSON: ${path}`,
      name: 'TypeError',
    }),
  )
})

it('should retain the filesystem cause when the manifest is missing', () => {
  const path = join(directory, 'manifest.json')
  rmSync(path)

  expect(() => validateSteamAssets({assetsDirectory: directory})).toThrowError(
    expect.objectContaining({
      cause: expect.objectContaining({code: 'ENOENT'}),
      message: `Steam asset manifest could not be read: ${path}`,
      name: 'Error',
    }),
  )
})
