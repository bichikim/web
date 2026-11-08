import {afterAll, beforeAll, expect, test} from 'vitest'
import {mkdtemp, readFile, rm, truncate, writeFile} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {writePsd} from 'ag-psd'
import {PNG} from 'pngjs'
import {importPsdSource, initializePsdPixels} from '@winter-love/puppet/converter'
import {importPsdPath} from '../import-psd-path'
import {encodePsdTexture} from '../encode-psd-texture'

let directory: string
let path: string
let bytes: Uint8Array

beforeAll(async () => {
  directory = await mkdtemp(join(tmpdir(), 'poffo-psd-'))
  path = join(directory, '눈 model.psd')
  initializePsdPixels()
  bytes = new Uint8Array(
    writePsd(
      {
        children: [
          {
            imageData: {
              data: new Uint8ClampedArray([255, 0, 0, 255, 0, 0, 255, 255]),
              height: 1,
              width: 2,
            },
            left: 1,
            mask: {
              defaultColor: 0,
              imageData: {data: new Uint8ClampedArray([128, 128, 128, 255]), height: 1, width: 1},
              left: 2,
              top: 1,
            },
            name: '눈',
            top: 1,
          },
        ],
        height: 3,
        width: 4,
      },
      {noBackground: true},
    ),
  )
  await writeFile(path, bytes)
})

afterAll(async () => {
  await rm(directory, {force: true, recursive: true})
})

test('should import actual path bytes and masked PNG pixels without browser APIs or modifying the source', async () => {
  expect(typeof document).toBe('undefined')
  const result = await importPsdPath(path)
  expect(result.ok).toBe(true)
  if (!result.ok) {
    throw new Error(`PSD import failed: ${result.error.code}`)
  }
  expect(result.document.viewport).toEqual({height: 3, width: 4})
  expect(result.document.scene?.roots[0]?.name).toBe('눈')
  const part = result.document.parts[0]!
  expect(Math.min(...part.mesh.vertices.filter((_, index) => index % 2 === 0))).toBe(2)
  expect(Math.min(...part.mesh.vertices.filter((_, index) => index % 2 !== 0))).toBe(1)
  expect(part.psdSource).toMatchObject({
    documentId: '눈 model.psd',
    fileName: '눈 model.psd',
    height: 1,
    width: 2,
    x: 1,
    y: 1,
  })
  const pixels = PNG.sync.read(Buffer.from(part.texture.src.split(',')[1]!, 'base64'))
  expect(pixels.data[3]).toBe(0)
  expect([...pixels.data.subarray(4, 8)]).toEqual([0, 0, 255, 128])
  expect(new Uint8Array(await readFile(path))).toEqual(bytes)
})

test('should keep concurrent path imports independent', async () => {
  const other = join(directory, 'other.psd')
  await writeFile(other, bytes)
  const [first, second] = await Promise.all([importPsdPath(path), importPsdPath(other)])
  expect(first.ok && second.ok).toBe(true)
  if (first.ok && second.ok) {
    expect(first.document.parts[0]?.psdSource?.fileName).toBe('눈 model.psd')
    expect(second.document.parts[0]?.psdSource?.fileName).toBe('other.psd')
    expect(first.document.parts[0]?.texture).toEqual(second.document.parts[0]?.texture)
  }
})

test('should produce the same document from path input and a File byte source', async () => {
  const file = new File([Uint8Array.from(bytes)], '눈 model.psd')
  const [fromPath, fromFile] = await Promise.all([
    importPsdPath(path),
    importPsdSource({
      encodeTexture: encodePsdTexture,
      source: {name: file.name, read: () => file.arrayBuffer(), size: file.size},
    }),
  ])
  expect(fromPath.ok).toBe(true)
  expect(fromFile).toEqual(fromPath)
})

test('should reject directory input without reading it as a PSD', async () => {
  expect(await importPsdPath(directory)).toEqual({error: {code: 'invalid-file'}, ok: false})
})

test('should reject a sparse oversized PSD before allocating its contents', async () => {
  const large = join(directory, 'large.psd')
  await writeFile(large, '')
  await truncate(large, 268_435_457)
  expect(await importPsdPath(large)).toEqual({error: {code: 'too-large'}, ok: false})
})

test('should return decode failure for a damaged file on disk', async () => {
  const damaged = join(directory, 'damaged.psd')
  await writeFile(damaged, '8BPS broken')
  expect(await importPsdPath(damaged)).toEqual({error: {code: 'decode-failed'}, ok: false})
})
