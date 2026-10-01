/** @vitest-environment node */
import {mkdir, mkdtemp, rm, writeFile} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {afterEach, expect, it} from 'vitest'
import {validateSteamAssets} from '../validate-steam-assets'

const directories: string[] = []
const completeAssetFiles = [
  'README.md',
  'models/text-generation/example/model.onnx',
  'audio/tracks/focus.mp3',
  'runtime/onnxruntime-web/1.27.0/ort-wasm-simd-threaded.mjs',
  'runtime/onnxruntime-web/1.27.0/ort-wasm-simd-threaded.wasm',
] as const

afterEach(async () => {
  await Promise.all(
    directories.splice(0).map((directory) => rm(directory, {force: true, recursive: true})),
  )
})

const createAssetFixture = async (
  files: ReadonlyArray<string>,
  manifestFiles: ReadonlyArray<string> = files,
): Promise<string> => {
  const directory = await mkdtemp(join(tmpdir(), 'pomo-steam-assets-'))
  directories.push(directory)

  await Promise.all(
    files.map(async (file) => {
      const path = join(directory, file)
      await mkdir(join(path, '..'), {recursive: true})
      await writeFile(path, 'asset')
    }),
  )
  await writeFile(
    join(directory, 'manifest.json'),
    JSON.stringify({files: manifestFiles, version: 1}),
  )

  return directory
}

it('should accept a complete Steam asset manifest', async () => {
  const directory = await createAssetFixture(completeAssetFiles)

  expect(() => validateSteamAssets({assetsDirectory: directory})).not.toThrow()
})

it('should reject a release manifest without model, audio, and runtime assets', async () => {
  const directory = await createAssetFixture(['README.md'])

  expect(() => validateSteamAssets({assetsDirectory: directory})).toThrow(
    'Required asset types are missing',
  )
})

it('should reject a release manifest that omits a file present in the bundle', async () => {
  const directory = await createAssetFixture(
    completeAssetFiles,
    completeAssetFiles.filter((file) => file !== 'audio/tracks/focus.mp3'),
  )

  expect(() => validateSteamAssets({assetsDirectory: directory})).toThrow('audio/tracks/focus.mp3')
})

it('should reject a manifest entry whose file is missing', async () => {
  const directory = await createAssetFixture(
    ['README.md'],
    ['README.md', 'audio/tracks/missing.mp3'],
  )

  expect(() => validateSteamAssets({assetsDirectory: directory, strict: false})).toThrow(
    'audio/tracks/missing.mp3',
  )
})

it('should allow an incomplete manifest for a non-release Steam build', async () => {
  const directory = await createAssetFixture(['README.md'])

  expect(() => validateSteamAssets({assetsDirectory: directory, strict: false})).not.toThrow()
})

it('should reject a manifest with an unsupported schema', async () => {
  const directory = await createAssetFixture([])
  await writeFile(join(directory, 'manifest.json'), JSON.stringify({files: [], version: 2}))

  expect(() => validateSteamAssets({assetsDirectory: directory, strict: false})).toThrow(
    'version 1',
  )
})

it.each([
  {files: ['../outside.mp3'], message: 'must be a relative path'},
  {files: ['README.md', 'README.md'], message: 'more than once'},
])('should reject invalid manifest paths', async ({files, message}) => {
  const directory = await createAssetFixture(['README.md'], files)

  expect(() => validateSteamAssets({assetsDirectory: directory, strict: false})).toThrow(message)
})
