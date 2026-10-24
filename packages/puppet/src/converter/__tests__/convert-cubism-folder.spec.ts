import {afterEach, beforeEach, expect, test, vi} from 'vitest'
import {strToU8} from 'fflate'
import {createDemoDocument} from '../../player/create-demo-document'
import {convertCubismFolder} from '../convert-cubism-folder'
import {convertMoc3} from '../convert-moc3'
import {readCubismTexture} from '../read-cubism-texture'

vi.mock('../convert-moc3', () => ({convertMoc3: vi.fn()}))

const png = Uint8Array.from(
  Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/qV8AAAAASUVORK5CYII=',
    'base64',
  ),
)
const file = (path: string, bytes: Uint8Array<ArrayBuffer> = new Uint8Array([1])) => {
  const source = new File([bytes], path.split('/').at(-1)!)
  Object.defineProperty(source, 'webkitRelativePath', {value: path})
  Object.defineProperty(source, 'arrayBuffer', {
    configurable: true,
    value: () => Promise.resolve(bytes.buffer),
  })
  return source
}

beforeEach(() => {
  vi.mocked(convertMoc3).mockReturnValue({document: createDemoDocument(), warnings: []})
})
afterEach(() => {
  vi.clearAllMocks()
})

test('should convert a nested folder containing three textures without a manifest', async () => {
  const files = [
    file('root/model/avatar.moc3'),
    file('root/model/atlas/texture_02.png', png),
    file('root/model/atlas/texture_00.png', png),
    file('root/model/atlas/texture_01.png', png),
    file('root/model/icon.png'),
  ]
  const result = await convertCubismFolder(files)
  expect(result.document.parts.length).toBeGreaterThan(0)
  expect(convertMoc3).toHaveBeenCalledWith(new Uint8Array([1]), {
    textures: Array.from({length: 3}, () => readCubismTexture(png)),
  })
})

test('should preserve arbitrary texture order and expression references from the manifest', async () => {
  const manifest = {
    FileReferences: {
      Expressions: [{File: 'expressions/smile.exp3.json', Name: 'smile'}],
      Moc: 'avatar.moc3',
      Textures: ['b.png', 'a.png'],
    },
    Version: 3,
  }
  const second = new Uint8Array([...png, 1])
  const result = await convertCubismFolder([
    file('root/model/avatar.model3.json', strToU8(JSON.stringify(manifest))),
    file('root/model/avatar.moc3'),
    file('root/model/a.png', png),
    file('root/model/b.png', second),
    file('root/model/expressions/smile.exp3.json', strToU8('{"Parameters":[]}')),
  ])
  expect(convertMoc3).toHaveBeenCalledWith(new Uint8Array([1]), {
    textures: [readCubismTexture(second), readCubismTexture(png)],
  })
  expect(result.document.expressions?.[0]?.id).toBe('smile')
})

test('should report a missing texture referenced by the manifest', async () => {
  await expect(
    convertCubismFolder([
      file('root/avatar.moc3'),
      file(
        'root/avatar.model3.json',
        strToU8(
          JSON.stringify({
            FileReferences: {Moc: 'avatar.moc3', Textures: ['missing.png']},
            Version: 3,
          }),
        ),
      ),
    ]),
  ).rejects.toThrow('missing.png')
  expect(convertMoc3).not.toHaveBeenCalled()
})

test('should reject duplicate normalized paths before conversion', async () => {
  await expect(
    convertCubismFolder([file('root/avatar.moc3'), file('root/./avatar.moc3')]),
  ).rejects.toThrow('duplicated')
})

test('should stop conversion if cancelled during file reading', async () => {
  const controller = new AbortController()
  let finish!: (bytes: ArrayBuffer) => void
  const model = file('root/avatar.moc3')
  Object.defineProperty(model, 'arrayBuffer', {
    value: () =>
      new Promise<ArrayBuffer>((resolve) => {
        finish = resolve
      }),
  })
  const pending = convertCubismFolder([model], controller.signal)
  controller.abort()
  finish(new ArrayBuffer(1))
  await expect(pending).rejects.toThrow()
  expect(convertMoc3).not.toHaveBeenCalled()
})
