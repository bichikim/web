import {afterEach, describe, expect, test} from 'vitest'

import {createPlayer, type Player} from '../../src/player/create-player'
import {
  PUPPET_DOCUMENT_FORMAT,
  PUPPET_DOCUMENT_VERSION,
  type PuppetDocument,
  type PuppetGroupRenderProperties,
  type PuppetPart,
  type PuppetPartRenderProperties,
  type PuppetSceneNode,
} from '../../src/player/document'
import {parseDocument} from '../../src/player/parse-document'

/**
 * Offscreen groups against Canvas 2D: a group drawn into its own canvas and then composited is
 * exactly an isolated layer, so Chromium's compositing is the independent reference.
 */

type Rgb = readonly [number, number, number]
type Rect = readonly [number, number, number, number]

const SWATCH = 48
const GAP = 8
const BACKDROP: Rgb = [60, 160, 110]
const FIRST: Rgb = [210, 60, 40]
const SECOND: Rgb = [40, 90, 200]
const BACKDROP_ALPHAS = [1, 0.5] as const
const TOLERANCE = 4
const GLOW_OPACITY = 0.6

let player: Player | undefined

afterEach(() => {
  player?.destroy()
  player = undefined
  document.body.replaceChildren()
})

const canvas2d = (width: number, height: number) => {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  return {canvas, context: canvas.getContext('2d', {willReadFrequently: true})!}
}

const solidUrl = (rgb: Rgb) => {
  const {canvas, context} = canvas2d(4, 4)
  context.fillStyle = `rgb(${rgb.join(',')})`
  context.fillRect(0, 0, 4, 4)
  return canvas.toDataURL('image/png')
}

/** Overlapping squares inside a swatch: first at the top left, second at the bottom right. */
const FIRST_RECT: Rect = [4, 4, 28, 28]
const SECOND_RECT: Rect = [16, 16, 28, 28]
const MASK_RECT: Rect = [12, 12, 24, 24]
/** First only, overlap, second only, and backdrop only, inside a swatch. */
const PROBES = [
  [8, 8],
  [24, 24],
  [40, 40],
  [40, 8],
  [14, 14],
] as const

interface Column {
  readonly name: string
  /** Scene children of the swatch, given its part factory. */
  readonly scene: (part: PartFactory) => ReadonlyArray<PuppetSceneNode>
  /** Draws the swatch over the backdrop with Canvas 2D at the swatch origin. */
  readonly reference: (context: CanvasRenderingContext2D, origin: readonly [number, number]) => void
}

type PartFactory = (
  name: string,
  rect: Rect,
  rgb: Rgb,
  properties?: PuppetPartRenderProperties,
) => PuppetSceneNode

const group = (
  id: string,
  children: ReadonlyArray<PuppetSceneNode>,
  properties: PuppetGroupRenderProperties,
): PuppetSceneNode => ({
  children,
  id,
  kind: 'group',
  locked: false,
  name: id,
  properties,
  visible: true,
})

const fill = (
  context: CanvasRenderingContext2D,
  origin: readonly [number, number],
  rect: Rect,
  rgb: Rgb,
) => {
  context.fillStyle = `rgb(${rgb.join(',')})`
  context.fillRect(origin[0] + rect[0], origin[1] + rect[1], rect[2], rect[3])
}

/** Draws `content` into a transparent layer and composites it like `drawImage`. */
const layer = (
  context: CanvasRenderingContext2D,
  content: (layerContext: CanvasRenderingContext2D) => void,
  alpha: number,
  operation: GlobalCompositeOperation,
) => {
  const {canvas, context: layerContext} = canvas2d(context.canvas.width, context.canvas.height)
  content(layerContext)
  context.globalAlpha = alpha
  context.globalCompositeOperation = operation
  context.drawImage(canvas, 0, 0)
  context.globalAlpha = 1
  context.globalCompositeOperation = 'source-over'
}

const COLUMNS: ReadonlyArray<Column> = [
  {
    name: 'isolated opacity',
    reference: (context, origin) =>
      layer(
        context,
        (inner) => {
          fill(inner, origin, FIRST_RECT, FIRST)
          fill(inner, origin, SECOND_RECT, SECOND)
        },
        0.5,
        'source-over',
      ),
    scene: (part) => [
      group('isolated', [part('first', FIRST_RECT, FIRST), part('second', SECOND_RECT, SECOND)], {
        offscreen: true,
        opacity: 0.5,
      }),
    ],
  },
  {
    name: 'plain group opacity',
    reference: (context, origin) => {
      context.globalAlpha = 0.5
      fill(context, origin, FIRST_RECT, FIRST)
      fill(context, origin, SECOND_RECT, SECOND)
      context.globalAlpha = 1
    },
    scene: (part) => [
      group('plain', [part('first', FIRST_RECT, FIRST), part('second', SECOND_RECT, SECOND)], {
        opacity: 0.5,
      }),
    ],
  },
  {
    name: 'layer overlay',
    reference: (context, origin) =>
      layer(
        context,
        (inner) => {
          fill(inner, origin, FIRST_RECT, FIRST)
          fill(inner, origin, SECOND_RECT, SECOND)
        },
        0.8,
        'overlay',
      ),
    scene: (part) => [
      group('overlay', [part('first', FIRST_RECT, FIRST), part('second', SECOND_RECT, SECOND)], {
        blendMode: 'overlay',
        offscreen: true,
        opacity: 0.8,
      }),
    ],
  },
  {
    name: 'atop inside a layer',
    reference: (context, origin) =>
      layer(
        context,
        (inner) => {
          fill(inner, origin, FIRST_RECT, FIRST)
          inner.globalCompositeOperation = 'source-atop'
          fill(inner, origin, SECOND_RECT, SECOND)
        },
        1,
        'source-over',
      ),
    scene: (part) => [
      group(
        'atop',
        [
          part('first', FIRST_RECT, FIRST),
          part('second', SECOND_RECT, SECOND, {alphaBlendMode: 'atop'}),
        ],
        {offscreen: true},
      ),
    ],
  },
  {
    name: 'masked layer',
    reference: (context, origin) =>
      layer(
        context,
        (inner) => {
          fill(inner, origin, FIRST_RECT, FIRST)
          fill(inner, origin, SECOND_RECT, SECOND)
          inner.globalCompositeOperation = 'destination-in'
          fill(inner, origin, MASK_RECT, [0, 0, 0])
        },
        1,
        'source-over',
      ),
    scene: (part) => [
      part('mask', MASK_RECT, [0, 0, 0], {renderWhenUsedAsMask: false}),
      group('masked', [part('first', FIRST_RECT, FIRST), part('second', SECOND_RECT, SECOND)], {
        clippingMaskIds: [],
        offscreen: true,
      }),
    ],
  },
  {
    name: 'add glow',
    // Analytic: Add (Glow) keeps the unclamped sum, so the premultiplied color is cs·as + cb·ab.
    reference: (context, origin) => {
      const ab = context.getImageData(origin[0] + 1, origin[1] + 1, 1, 1).data[3]! / 255
      const as = GLOW_OPACITY
      const alpha = as + ab - as * ab
      const color = FIRST.map((cs, index) =>
        Math.min(255, (cs * as + BACKDROP[index]! * ab) / alpha),
      )
      const [x, y, width, height] = FIRST_RECT
      context.clearRect(origin[0] + x, origin[1] + y, width, height)
      context.fillStyle = `rgba(${color.join(',')},${alpha})`
      context.fillRect(origin[0] + x, origin[1] + y, width, height)
    },
    scene: (part) => [
      part('first', FIRST_RECT, FIRST, {blendMode: 'add-glow', opacity: GLOW_OPACITY}),
    ],
  },
]

const WIDTH = COLUMNS.length * (SWATCH + GAP) + GAP
const HEIGHT = BACKDROP_ALPHAS.length * (SWATCH + GAP) + GAP
const origin = (column: number, row: number) =>
  [GAP + column * (SWATCH + GAP), GAP + row * (SWATCH + GAP)] as const

const createPuppet = (): PuppetDocument => {
  const parts: Array<PuppetPart> = []
  const roots: Array<PuppetSceneNode> = []
  const addPart = (
    id: string,
    [x, y, width, height]: Rect,
    rgb: Rgb,
    properties?: PuppetPartRenderProperties,
  ): PuppetSceneNode => {
    parts.push({
      id,
      mesh: {
        indices: [0, 1, 2, 1, 3, 2],
        uvs: [0, 0, 1, 0, 0, 1, 1, 1],
        vertices: [x, y, x + width, y, x, y + height, x + width, y + height],
      },
      properties,
      texture: {height: 4, src: solidUrl(rgb), width: 4},
    })
    return {id, kind: 'part', locked: false, name: id, visible: true}
  }
  BACKDROP_ALPHAS.forEach((opacity, row) => {
    roots.push(
      addPart(`backdrop-${row}`, [0, origin(0, row)[1] - GAP / 2, WIDTH, SWATCH + GAP], BACKDROP, {
        opacity,
      }),
    )
  })
  COLUMNS.forEach((column, index) => {
    BACKDROP_ALPHAS.forEach((_, row) => {
      const [x, y] = origin(index, row)
      const prefix = `${index}-${row}`
      const nodes = column.scene((name, [left, top, width, height], rgb, properties) =>
        addPart(`${prefix}-${name}`, [x + left, y + top, width, height], rgb, properties),
      )
      // Group IDs are per swatch; masks refer to the swatch's own mask part.
      const scoped = (node: PuppetSceneNode): PuppetSceneNode =>
        node.kind === 'group'
          ? {
              ...node,
              children: node.children.map(scoped),
              id: `${prefix}-${node.id}`,
              properties:
                node.properties?.clippingMaskIds === undefined
                  ? node.properties
                  : {...node.properties, clippingMaskIds: [`${prefix}-mask`]},
            }
          : node
      roots.push(...nodes.map(scoped))
    })
  })
  return {
    format: PUPPET_DOCUMENT_FORMAT,
    motions: [],
    parts,
    scene: {roots},
    version: PUPPET_DOCUMENT_VERSION,
    viewport: {height: HEIGHT, width: WIDTH},
  }
}

const renderPuppet = async (puppet: PuppetDocument) => {
  const parsed = parseDocument(JSON.stringify(puppet))
  if (!parsed.ok) {
    throw new Error('invalid offscreen group fixture')
  }
  const canvas = document.createElement('canvas')
  player = await createPlayer({canvas, document: parsed.document, resolution: 1})
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => resolve())
  })
  player.redraw()
  const {context} = canvas2d(WIDTH, HEIGHT)
  context.drawImage(canvas, 0, 0)
  return context
}

const renderReference = () => {
  const {context} = canvas2d(WIDTH, HEIGHT)
  BACKDROP_ALPHAS.forEach((alpha, row) => {
    context.globalAlpha = alpha
    context.fillStyle = `rgb(${BACKDROP.join(',')})`
    context.fillRect(0, origin(0, row)[1] - GAP / 2, WIDTH, SWATCH + GAP)
  })
  context.globalAlpha = 1
  COLUMNS.forEach((column, index) => {
    BACKDROP_ALPHAS.forEach((_, row) => column.reference(context, origin(index, row)))
  })
  return context
}

const premultiplied = (context: CanvasRenderingContext2D, x: number, y: number) => {
  const [r = 0, g = 0, b = 0, a = 0] = context.getImageData(x, y, 1, 1).data
  return [(r * a) / 255, (g * a) / 255, (b * a) / 255, a]
}

describe('offscreen groups', () => {
  test('should composite isolated layers like Canvas 2D', async () => {
    const actual = await renderPuppet(createPuppet())
    const expected = renderReference()
    const mismatches = COLUMNS.flatMap((column, index) =>
      BACKDROP_ALPHAS.flatMap((alpha, row) =>
        PROBES.flatMap(([dx, dy]) => {
          const [x, y] = origin(index, row)
          const got = premultiplied(actual, x + dx, y + dy)
          const want = premultiplied(expected, x + dx, y + dy)
          const worst = Math.max(...got.map((value, channel) => Math.abs(value - want[channel]!)))
          const at = `${column.name} (backdrop α ${alpha}) at ${dx},${dy}`
          return worst > TOLERANCE
            ? [`${at}: ${got.map(Math.round)} vs ${want.map(Math.round)}`]
            : []
        }),
      ),
    )
    expect(mismatches).toEqual([])
  })
})
