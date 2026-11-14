import {expect, test} from 'vitest'
import {resolveVtubeAsset} from '../resolve-vtube-asset'

test('should retain a missing basename without searching another model directory', () => {
  const entries = new Map([['other/exp/face.exp3.json', new Uint8Array()]])
  expect(resolveVtubeAsset(entries, 'model/avatar.model3.json', 'face.exp3.json')).toBe(
    'face.exp3.json',
  )
})

test('should retain explicit relative paths instead of substituting another folder', () => {
  const entries = new Map([['model/b/face.exp3.json', new Uint8Array()]])
  expect(resolveVtubeAsset(entries, 'model/avatar.model3.json', 'a/face.exp3.json')).toBe(
    'a/face.exp3.json',
  )
})

test('should resolve a nested asset when the model is at the archive root', () => {
  const entries = new Map([['exp/face.exp3.json', new Uint8Array()]])
  expect(resolveVtubeAsset(entries, 'avatar.model3.json', 'face.exp3.json')).toBe(
    'exp/face.exp3.json',
  )
})

test.each(['https://example.com/face.exp3.json', '/face.exp3.json', '../../face.exp3.json'])(
  'should reject a reference outside the archive: %s',
  (reference) => {
    expect(() => resolveVtubeAsset(new Map(), 'model/avatar.model3.json', reference)).toThrow()
  },
)
