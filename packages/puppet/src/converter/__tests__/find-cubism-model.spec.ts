import {expect, test} from 'vitest'
import {strToU8} from 'fflate'
import {findCubismModel} from '../find-cubism-model'

const entries = (paths: ReadonlyArray<string>) =>
  new Map(paths.map((path) => [path, new Uint8Array()]))

test('should prefer the manifest and preserve its texture order regardless of filenames', () => {
  const model = {FileReferences: {Moc: 'avatar.moc3', Textures: ['b.png', 'a.png']}, Version: 3}
  const files = entries(['nested/avatar.moc3', 'nested/b.png', 'nested/a.png', 'icon.png'])
  files.set('nested/avatar.model3.json', strToU8(JSON.stringify(model)))
  expect(findCubismModel(files)).toEqual({model, path: 'nested/avatar.model3.json'})
})

test.each([1, 3, 12])('should discover %i numbered textures without a manifest', (count) => {
  const textures = Array.from({length: count}, (_, index) => `nested/atlas/texture_${index}.png`)
  const result = findCubismModel(
    entries(['nested/avatar.MOC3', ...textures.toReversed(), 'icon.png']),
  )
  expect(result.model).toEqual({
    FileReferences: {Moc: 'avatar.MOC3', Textures: textures.map((path) => path.slice(7))},
    Version: 3,
  })
  expect(result.path).toBe('nested/avatar.model3.json')
})

test('should accept a single arbitrarily named PNG without a manifest', () => {
  expect(findCubismModel(entries(['avatar.moc3', 'artwork.png'])).model).toMatchObject({
    FileReferences: {Textures: ['artwork.png']},
  })
})

test('should ignore macOS metadata and textures outside the model directory', () => {
  const files = entries([
    'model/avatar.moc3',
    'model/texture_00.png',
    'other/texture_00.png',
    '__MACOSX/model/._avatar.moc3',
  ])
  expect(findCubismModel(files).model).toMatchObject({
    FileReferences: {Textures: ['texture_00.png']},
  })
})

test.each([
  ['a.moc3', 'b.moc3', 'texture_00.png'],
  ['avatar.moc3'],
  ['avatar.moc3', 'a.png', 'b.png'],
  ['avatar.moc3', 'texture_00.png', 'texture_02.png'],
  ['avatar.moc3', 'a/texture_00.png', 'b/texture_00.png'],
])('should reject ambiguous or missing model assets: %j', (...paths) => {
  expect(() => findCubismModel(entries(paths))).toThrow()
})

test('should require a choice when multiple manifests exist', () => {
  const files = new Map([
    ['a.model3.json', strToU8('{"Version":3}')],
    ['b.model3.json', strToU8('{"Version":3}')],
  ])
  expect(() => findCubismModel(files)).toThrow('model3.json')
  expect(findCubismModel(files, 'b.model3.json').path).toBe('b.model3.json')
})

test('should report an invalid manifest rather than silently inferring other files', () => {
  const files = entries(['avatar.moc3', 'texture_00.png'])
  files.set('avatar.model3.json', strToU8('invalid JSON'))
  expect(() => findCubismModel(files)).toThrow()
})

test('should distinguish a missing model from an ambiguous model selection', () => {
  expect(() => findCubismModel(entries(['texture_00.png']))).toThrow('.moc3 모델 파일이 없습니다')
  expect(() => findCubismModel(entries(['a.moc3', 'b.moc3']))).toThrow('하나로 확정')
})

test('should explicitly identify missing PNGs without guessing the original filename', () => {
  expect(() => findCubismModel(entries(['avatar.moc3']))).toThrow('PNG 텍스처 파일이 없습니다')
  expect(() =>
    findCubismModel(entries(['avatar.moc3', 'texture_00.png', 'texture_02.png'])),
  ).toThrow('인덱스 1')
  expect(() =>
    findCubismModel(entries(['avatar.moc3', 'texture_00.png', 'texture_10.png'])),
  ).toThrow('인덱스 1~9')
})
