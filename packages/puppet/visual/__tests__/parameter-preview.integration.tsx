import {expect, test} from 'vitest'
import {createParameterPreview} from '../../src/editor/internal/parameter-sampling'
import {
  createEmptyDocument,
  createPlayer,
  parseDocumentValue,
  type PuppetDocument,
} from '../../src/player'

const SIZE = 32

const solid = (color: string) => {
  const canvas = document.createElement('canvas')
  canvas.width = 4
  canvas.height = 4
  const context = canvas.getContext('2d')!
  context.fillStyle = color
  context.fillRect(0, 0, 4, 4)
  return canvas.toDataURL()
}

const createDocument = (offscreen: boolean): PuppetDocument => ({
  ...createEmptyDocument(),
  parameterBindings: [
    {
      id: 'appearance',
      keyforms: [
        {groups: [{groupId: 'g', properties: {drawOrder: 100}}], parts: [], values: [0]},
        {
          groups: [
            {
              groupId: 'g',
              properties: {
                drawOrder: 800,
                multiplyColor: [0.2, 0.4, 0.6],
                opacity: 0.25,
                screenColor: [0.1, 0.2, 0.3],
              },
            },
          ],
          parts: [],
          values: [1],
        },
      ],
      parameterIds: ['p'],
      targetGroupIds: ['g'],
      targetPartIds: [],
    },
  ],
  parameters: [{defaultValue: 0, id: 'p', maximum: 1, minimum: 0, name: 'P'}],
  parts: [
    {
      id: 'inside',
      mesh: {
        indices: [0, 1, 2, 1, 3, 2],
        uvs: [0, 0, 1, 0, 0, 1, 1, 1],
        vertices: [0, 0, 24, 0, 0, 24, 24, 24],
      },
      texture: {height: 4, src: solid('#f04020'), width: 4},
    },
    {
      id: 'outside',
      mesh: {
        indices: [0, 1, 2, 1, 3, 2],
        uvs: [0, 0, 1, 0, 0, 1, 1, 1],
        vertices: [8, 8, 32, 8, 8, 32, 32, 32],
      },
      texture: {height: 4, src: solid('#2060e0'), width: 4},
    },
  ],
  scene: {
    roots: [
      {
        children: [{id: 'inside', kind: 'part', locked: false, name: 'Inside', visible: true}],
        id: 'g',
        kind: 'group',
        locked: false,
        name: 'G',
        properties: {drawOrder: 100, offscreen},
        visible: true,
      },
      {id: 'outside', kind: 'part', locked: false, name: 'Outside', visible: true},
    ],
  },
  viewport: {height: SIZE, width: SIZE},
})

const render = async (document: PuppetDocument, value: number) => {
  const parsed = parseDocumentValue(document)
  if (!parsed.ok) {
    throw new Error('잘못된 미리보기 테스트 문서')
  }
  const canvas = globalThis.document.createElement('canvas')
  const player = await createPlayer({canvas, document: parsed.document, resolution: 1})
  try {
    player.setParameterValues({p: value})
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => resolve())
    })
    player.redraw()
    const copy = globalThis.document.createElement('canvas')
    copy.width = SIZE
    copy.height = SIZE
    const context = copy.getContext('2d', {willReadFrequently: true})!
    context.drawImage(canvas, 0, 0)
    return context.getImageData(0, 0, SIZE, SIZE).data
  } finally {
    player.destroy()
  }
}

const difference = (first: Uint8ClampedArray, second: Uint8ClampedArray) =>
  first.reduce((maximum, value, index) => Math.max(maximum, Math.abs(value - second[index]!)), 0)

test.each([false, true])(
  'should render keyed groups identically in modeling preview with offscreen=%s',
  async (offscreen) => {
    const document = createDocument(offscreen)
    const value = 0.75
    const preview = createParameterPreview({document, parameterValues: {p: value}})
    const expected = await render(document, value)
    expect(difference(await render(preview, value), expected)).toBeLessThanOrEqual(2)
    expect(difference(await render(document, 0), expected)).toBeGreaterThan(20)
  },
)
