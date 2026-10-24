import {afterEach, describe, expect, test} from 'vitest'
import {createPlayer, type Player} from '../../src/player/create-player'
import {createEmptyDocument} from '../../src/player/create-empty-document'
import type {PuppetDocument, PuppetPart} from '../../src/player/document'
import {parseDocument} from '../../src/player/parse-document'
import {serializeDocument} from '../../src/player/serialize-document'
import type {PlayerViewCamera} from '../../src/player/view-camera'

const WIDTH = 320
const HEIGHT = 230
const MODEL_WIDTH = 600
const MODEL_HEIGHT = 842
const players: Player[] = []

afterEach(() => players.splice(0).forEach((player) => player.destroy()))

const createCanvas = (width: number, height: number) => {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  return {canvas, context: canvas.getContext('2d', {willReadFrequently: true})!}
}

const createTexture = () => {
  const {canvas, context} = createCanvas(MODEL_WIDTH, MODEL_HEIGHT)
  context.fillStyle = '#4090c0'
  context.fillRect(0, 0, MODEL_WIDTH, MODEL_HEIGHT)
  context.fillStyle = '#c06030'
  for (let row = 0; row < MODEL_HEIGHT; row += 64) {
    for (let column = 0; column < MODEL_WIDTH; column += 64) {
      context.fillRect(column, row, 32, 32)
    }
  }
  return canvas
}

const quad = (id: string, texture: HTMLCanvasElement): PuppetPart => ({
  id,
  mesh: {
    indices: [0, 1, 2, 0, 2, 3],
    uvs: [0, 0, 1, 0, 1, 1, 0, 1],
    vertices: [0, 0, MODEL_WIDTH, 0, MODEL_WIDTH, MODEL_HEIGHT, 0, MODEL_HEIGHT],
  },
  texture: {height: texture.height, src: texture.toDataURL(), width: texture.width},
})

const createFixture = (backdrop: HTMLCanvasElement): PuppetDocument => {
  const {canvas, context} = createCanvas(1, 1)
  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, 1, 1)
  const part = (id: string) => ({id, kind: 'part' as const, locked: false, name: id, visible: true})
  return {
    ...createEmptyDocument(),
    parts: [
      quad('backdrop', backdrop),
      {...quad('base-mask', canvas), properties: {renderWhenUsedAsMask: false}},
      {
        ...quad('mask', canvas),
        properties: {clippingMaskIds: ['base-mask'], renderWhenUsedAsMask: false},
      },
      {
        ...quad('front', canvas),
        properties: {
          alphaBlendMode: 'atop',
          blendMode: 'multiply',
          clippingMaskIds: ['mask'],
          opacity: 0.5,
        },
      },
      {
        ...quad('outside', canvas),
        mesh: {
          ...quad('outside', canvas).mesh,
          vertices: [1000, 1000, 1600, 1000, 1600, 1842, 1000, 1842],
        },
        properties: {alphaBlendMode: 'atop', blendMode: 'multiply', clippingMaskIds: ['mask']},
      },
    ],
    scene: {
      roots: [
        part('base-mask'),
        part('mask'),
        {
          children: [part('backdrop'), part('front'), part('outside')],
          id: 'isolated',
          kind: 'group',
          locked: false,
          name: 'isolated',
          properties: {offscreen: true},
          visible: true,
        },
      ],
    },
    viewport: {height: MODEL_HEIGHT, width: MODEL_WIDTH},
  }
}

const comparePixels = (
  actual: CanvasRenderingContext2D,
  expected: CanvasRenderingContext2D,
  camera: PlayerViewCamera,
  resolution: number,
) => {
  const mismatches = []
  const boundary = (value: number) => Math.min(value % 32, 32 - (value % 32)) * camera.zoom < 2
  for (let y = 8; y < actual.canvas.height / resolution; y += 17) {
    for (let x = 8; x < actual.canvas.width / resolution; x += 19) {
      const sourceX = x / camera.zoom + camera.x
      const sourceY = y / camera.zoom + camera.y
      const inside =
        sourceX > 3 && sourceX < MODEL_WIDTH - 3 && sourceY > 3 && sourceY < MODEL_HEIGHT - 3
      const outside =
        sourceX < -3 || sourceX > MODEL_WIDTH + 3 || sourceY < -3 || sourceY > MODEL_HEIGHT + 3
      if (outside || (inside && !boundary(sourceX) && !boundary(sourceY))) {
        const got = actual.getImageData(x * resolution, y * resolution, 1, 1).data
        const want = expected.getImageData(x * resolution, y * resolution, 1, 1).data
        if (got.some((value, channel) => Math.abs(value - want[channel]!) > 4)) {
          mismatches.push({got: [...got], want: [...want], x, y})
        }
      }
    }
  }
  return mismatches
}

interface ViewportSize {
  width: number
  height: number
}

const createFixturePlayer = async (resolution: number, size: ViewportSize) => {
  const backdrop = createTexture()
  const parsed = parseDocument(serializeDocument(createFixture(backdrop)))
  if (!parsed.ok) {
    throw new Error('Invalid zoom fixture')
  }
  const host = document.createElement('div')
  Object.defineProperties(host, {
    clientHeight: {get: () => size.height},
    clientWidth: {get: () => size.width},
  })
  const canvas = document.createElement('canvas')
  const actual = createCanvas(size.width * resolution, size.height * resolution)
  const player = await createPlayer({
    canvas,
    document: parsed.document,
    onAfterRender: () => {
      if (actual.canvas.width !== canvas.width || actual.canvas.height !== canvas.height) {
        actual.canvas.width = canvas.width
        actual.canvas.height = canvas.height
      }
      actual.context.clearRect(0, 0, actual.canvas.width, actual.canvas.height)
      actual.context.drawImage(canvas, 0, 0)
    },
    resizeTo: host,
    resolution,
  })
  players.push(player)
  player.pause()
  return {actual, backdrop, canvas, player}
}

describe('createPlayer zoomed compositing', () => {
  test.each([1, 2])(
    'should preserve the backdrop through masked blending at resolution %i while zooming and panning',
    async (resolution) => {
      // Multiplying by white leaves the backdrop unchanged, including its texture coordinates.
      const {actual, backdrop, canvas, player} = await createFixturePlayer(resolution, {
        height: HEIGHT,
        width: WIDTH,
      })
      const expected = createCanvas(WIDTH * resolution, HEIGHT * resolution)
      const graphics = canvas.getContext('webgl2')!
      for (const zoom of [0.4, 0.7, 0.8, 1, 2, 4, 8, 32]) {
        for (const center of [
          [300, 421],
          [0, 0],
          [600, 842],
        ] as const) {
          const camera = {
            x: center[0] - WIDTH / (2 * zoom),
            y: center[1] - HEIGHT / (2 * zoom),
            zoom,
          }
          player.setViewCamera(camera)
          player.redraw()
          expect(graphics.getError(), `GPU error at ${zoom}, ${center}`).toBe(0)
          expected.context.setTransform(1, 0, 0, 1, 0, 0)
          expected.context.clearRect(0, 0, expected.canvas.width, expected.canvas.height)
          expected.context.setTransform(
            zoom * resolution,
            0,
            0,
            zoom * resolution,
            -camera.x * zoom * resolution,
            -camera.y * zoom * resolution,
          )
          expected.context.drawImage(backdrop, 0, 0)
          const mismatches = comparePixels(actual.context, expected.context, camera, resolution)
          expect(mismatches, `zoom ${zoom}, center ${center}`).toEqual([])
        }
      }
    },
  )
  test.each([1, 2])(
    'should retain nested compositing after repeated viewport resizes at resolution %i',
    async (resolution) => {
      const size = {height: HEIGHT, width: WIDTH}
      const {actual, backdrop, canvas, player} = await createFixturePlayer(resolution, size)
      const camera = {x: 100, y: 200, zoom: 0.8}
      player.setViewCamera(camera)
      player.redraw()
      const graphics = canvas.getContext('webgl2')!
      const expected = createCanvas(canvas.width, canvas.height)
      for (const [width, height] of [
        [347, 229],
        [487, 296],
        [191, 123],
        [320, 230],
        [347, 229],
      ] as const) {
        size.width = width
        size.height = height
        expect(() => player.resize()).not.toThrow()
        expect(() => player.redraw()).not.toThrow()
        expect(canvas.width).toBe(size.width * resolution)
        expect(canvas.height).toBe(size.height * resolution)
        expect(graphics.getError()).toBe(0)
        expected.canvas.width = canvas.width
        expected.canvas.height = canvas.height
        expected.context.setTransform(
          camera.zoom * resolution,
          0,
          0,
          camera.zoom * resolution,
          -camera.x * camera.zoom * resolution,
          -camera.y * camera.zoom * resolution,
        )
        expected.context.drawImage(backdrop, 0, 0)
        expect(comparePixels(actual.context, expected.context, camera, resolution)).toEqual([])
      }
    },
  )
})
