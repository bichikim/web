import {expect, test} from 'vitest'
import {createEmptyDocument} from '../../../create-empty-document'
import {supportsWgpuDocument} from '../supports-document'
const part = {
  id: 'part',
  mesh: {indices: [0, 1, 2], uvs: [0, 0, 1, 0, 0, 1], vertices: [0, 0, 1, 0, 0, 1]},
  texture: {height: 1, src: 'part.png', width: 1},
}
const node = {id: 'part', kind: 'part' as const, locked: false, name: 'part', visible: true}

test('should retain supported mesh and alpha-mask scenes', () => {
  expect(
    supportsWgpuDocument({...createEmptyDocument(), parts: [part], scene: {roots: [node]}}),
  ).toBe(true)
})

test('should retain the existing renderer for isolated scene groups', () => {
  expect(
    supportsWgpuDocument({
      ...createEmptyDocument(),
      parts: [part],
      scene: {
        roots: [
          {
            children: [node],
            id: 'group',
            kind: 'group',
            locked: false,
            name: 'group',
            properties: {offscreen: true},
            visible: true,
          },
        ],
      },
    }),
  ).toBe(false)
})
