import {afterEach, describe, expect, test} from 'vitest'
import {commands} from 'vitest/browser'

import developmentModel from '../../examples/development-model.json'
import {packTextureAtlas} from '../../src/editor/internal/texture-atlas-canvas'
import {createPlayer, type Player} from '../../src/player/create-player'
import {
  PUPPET_ALPHA_BLEND_MODES,
  PUPPET_PART_BLEND_MODES,
  type PuppetDocument,
  type PuppetSceneNode,
} from '../../src/player/document'
import {parseDocument} from '../../src/player/parse-document'
import {compactDocumentTextures} from '../../src/player/texture-assets'
import {
  canvas2d,
  cell,
  createBuilder,
  GAP,
  gradient,
  quad,
  type Rect,
  type Rgba,
  solid,
  SWATCH,
} from './support/experiment-builder'

/**
 * Rendering experiment: writes each document below with the web player's rendering to
 * `<web repository>/node_modules/.cache/rendering-experiment/<name>.json` and `<name>.web.png`
 * (paths resolve from the Vitest root). The Rust
 * renderer draws the same documents and compares the pixels
 * (`tnm-puppet-sdk/packages/puppet-sdk/tests/experiment.rs`).
 *
 *   VITE_PUPPET_RENDERING_EXPERIMENT=1 pnpm exec vitest run --config vitest.browser.config.ts \
 *     visual/__tests__/rendering-experiment.integration.tsx
 */

const OUTPUT = '../../node_modules/.cache/rendering-experiment'
let player: Player | undefined

afterEach(() => {
  player?.destroy()
  player = undefined
  document.body.replaceChildren()
})

const BACKDROP = gradient('#d23a1e', '#2a4fd0', 'rgba(0, 120, 40, 0.5)')
const SOURCE = gradient('#f2d64b', '#5a2bd8', 'rgba(0, 0, 0, 0.6)')
const BACKDROP_OPACITIES = [1, 0.5] as const

/** Every color blend mode over an opaque and a translucent backdrop. */
const blendModes = () => {
  const {document, part} = createBuilder()
  const roots = BACKDROP_OPACITIES.flatMap((opacity, row) =>
    PUPPET_PART_BLEND_MODES.flatMap((blendMode, column) => [
      part(`backdrop-${column}-${row}`, cell(column, row), BACKDROP, {opacity}),
      part(`source-${column}-${row}`, cell(column, row), SOURCE, {blendMode, opacity: 0.8}),
    ]),
  )
  const width = GAP + PUPPET_PART_BLEND_MODES.length * (SWATCH + GAP)
  return document(roots, width, GAP + 2 * (SWATCH + GAP))
}

/** Every alpha blend mode with normal and overlay colors, offset to show partial overlap. */
const alphaModes = () => {
  const {document, part} = createBuilder()
  const roots = (['normal', 'overlay'] as const).flatMap((blendMode, row) =>
    PUPPET_ALPHA_BLEND_MODES.flatMap((alphaBlendMode, column) => {
      const [x, y] = cell(column, row)
      return [
        part(`backdrop-${column}-${row}`, [x, y, 24, 24], BACKDROP, {opacity: 0.7}),
        part(`source-${column}-${row}`, [x + 8, y + 8, 24, 24], SOURCE, {
          alphaBlendMode,
          blendMode,
          opacity: 0.8,
        }),
      ]
    }),
  )
  return document(
    roots,
    GAP + PUPPET_ALPHA_BLEND_MODES.length * (SWATCH + GAP),
    GAP + 2 * (SWATCH + GAP),
  )
}

/** Offscreen and plain groups: isolation, nesting, layer blends, atop and masks. */
const offscreenGroups = () => {
  const {document, group, part} = createBuilder()
  const red = solid([210, 60, 40, 1])
  const blue = solid([40, 90, 200, 1])
  const pair = (prefix: string, column: number, row: number) => {
    const [x, y] = cell(column, row)
    return [
      part(`${prefix}-a`, [x, y, 20, 20], red),
      part(`${prefix}-b`, [x + 12, y + 12, 20, 20], blue, {opacity: 0.9}),
    ]
  }
  const columns: ReadonlyArray<(row: number) => ReadonlyArray<PuppetSceneNode>> = [
    (row) => [
      group(`isolated-${row}`, pair(`isolated-${row}`, 0, row), {offscreen: true, opacity: 0.5}),
    ],
    (row) => [
      group(`plain-${row}`, pair(`plain-${row}`, 1, row), {
        multiplyColor: [1, 0.6, 0.6],
        opacity: 0.5,
        screenColor: [0, 0, 0.3],
      }),
    ],
    (row) => [
      group(`overlay-${row}`, pair(`overlay-${row}`, 2, row), {
        blendMode: 'overlay',
        multiplyColor: [0.8, 1, 0.8],
        offscreen: true,
        opacity: 0.8,
      }),
    ],
    (row) => {
      const [x, y] = cell(3, row)
      return [
        group(
          `atop-${row}`,
          [
            part(`atop-${row}-a`, [x, y, 20, 20], red),
            part(`atop-${row}-b`, [x + 8, y + 8, 24, 24], SOURCE, {alphaBlendMode: 'atop'}),
          ],
          {offscreen: true},
        ),
      ]
    },
    (row) => {
      const [x, y] = cell(4, row)
      return [
        part(`mask-${row}`, [x + 6, y + 6, 20, 20], solid([0, 0, 0, 1]), {
          renderWhenUsedAsMask: false,
        }),
        group(`masked-${row}`, pair(`masked-${row}`, 4, row), {
          clippingMaskIds: [`mask-${row}`],
          invertedMask: row === 1,
          offscreen: true,
        }),
      ]
    },
    (row) => {
      const [x, y] = cell(5, row)
      return [
        group(
          `outer-${row}`,
          [
            part(`outer-${row}-a`, [x, y, 20, 20], red),
            group(`inner-${row}`, [part(`inner-${row}-b`, [x + 12, y + 12, 20, 20], SOURCE)], {
              blendMode: 'multiply',
              offscreen: true,
              opacity: 0.7,
            }),
          ],
          {offscreen: true, opacity: 0.8},
        ),
      ]
    },
    (row) => {
      const [x, y] = cell(6, row)
      return [
        part(`glow-${row}`, [x, y, SWATCH, SWATCH], SOURCE, {blendMode: 'add-glow', opacity: 0.6}),
      ]
    },
  ]
  const roots = BACKDROP_OPACITIES.flatMap((opacity, row) => [
    part(
      `backdrop-${row}`,
      [0, cell(0, row)[1] - GAP / 2, GAP + columns.length * (SWATCH + GAP), SWATCH + GAP],
      BACKDROP,
      {opacity},
    ),
    ...columns.flatMap((column) => column(row)),
  ])
  return document(roots, GAP + columns.length * (SWATCH + GAP), GAP + 2 * (SWATCH + GAP))
}

/** Plain and offscreen groups whose opacity and colors are keyed, seen between two keyforms. */
const keyedGroups = () => {
  const {document, group, part} = createBuilder()
  const red = solid([210, 60, 40, 1])
  const blue = solid([40, 90, 200, 1])
  const [x, y] = cell(0, 0)
  const roots = [
    part('backdrop', [0, 0, GAP + 3 * (SWATCH + GAP), GAP + SWATCH + GAP], BACKDROP),
    group('plain', [
      part('plain-a', [x, y, 20, 20], red),
      part('plain-b', [x + 12, y + 12, 20, 20], blue),
    ]),
    group(
      'layer',
      [
        part('layer-a', [x + SWATCH + GAP, y, 20, 20], red),
        part('layer-b', [x + SWATCH + GAP + 12, y + 12, 20, 20], blue),
      ],
      {blendMode: 'hard-light', offscreen: true},
    ),
  ]
  return {
    ...document(roots, GAP + 3 * (SWATCH + GAP), GAP + SWATCH + GAP),
    parameterBindings: [
      {
        id: 'fade',
        keyforms: [
          {
            groups: [
              {groupId: 'plain', properties: {opacity: 1}},
              {groupId: 'layer', properties: {multiplyColor: [1, 1, 1], opacity: 1}},
            ],
            parts: [],
            values: [0] as const,
          },
          {
            groups: [
              {groupId: 'plain', properties: {opacity: 0.2, screenColor: [0, 0.4, 0]}},
              {groupId: 'layer', properties: {multiplyColor: [0.3, 0.6, 1], opacity: 0.5}},
            ],
            parts: [],
            values: [1] as const,
          },
        ],
        parameterIds: ['fade'] as const,
        targetGroupIds: ['plain', 'layer'],
        targetPartIds: [],
      },
    ],
    parameters: [{defaultValue: 0.4, id: 'fade', maximum: 1, minimum: 0, name: 'Fade'}],
  }
}

/**
 * Deformation: a quad mirrored by its keyform with and without culling (past halfway the
 * mirrored triangles face away), and a quad keyed over three parameters, the third repeating,
 * seen between keyforms.
 */
const deformation = () => {
  const {document, part} = createBuilder()
  const culled = cell(0, 0)
  const kept = cell(1, 0)
  const volume = cell(2, 0)
  const mirror = ([x, y, width, height]: Rect) => [
    x + width,
    y,
    x,
    y,
    x + width,
    y + height,
    x,
    y + height,
  ]
  const flip = (id: string, rect: Rect) => ({
    id: `flip-${id}`,
    keyforms: [
      {parts: [{partId: id, vertices: quad(rect)}], values: [0] as const},
      {parts: [{partId: id, vertices: mirror(rect)}], values: [1] as const},
    ],
    parameterIds: ['flip'] as const,
    targetPartIds: [id],
  })
  const planes = [0, 0.5]
  const points = [
    [0, 0],
    [1, 0],
    [0, 1],
    [1, 1],
  ] as const
  return {
    ...document(
      [
        part('culled', culled, SOURCE, {culling: true}),
        part('kept', kept, SOURCE),
        part('volume', volume, SOURCE),
      ],
      GAP + 3 * (SWATCH + GAP),
      GAP + SWATCH + GAP,
    ),
    parameterBindings: [
      flip('culled', culled),
      flip('kept', kept),
      {
        id: 'volume',
        keyforms: planes.flatMap((c) =>
          points.map(([a, b]) => ({
            parts: [{partId: 'volume', vertices: quad(volume, 6 * a - 3 + 8 * c, 6 * b - 3)}],
            values: [a, b, c] as const,
          })),
        ),
        parameterIds: ['a', 'b', 'c'] as const,
        targetPartIds: ['volume'],
      },
    ],
    parameters: [
      {defaultValue: 0.8, id: 'flip', maximum: 1, minimum: 0, name: 'Flip'},
      {defaultValue: 0.3, id: 'a', maximum: 1, minimum: 0, name: 'A'},
      {defaultValue: 0.6, id: 'b', maximum: 1, minimum: 0, name: 'B'},
      {defaultValue: 0.9, id: 'c', maximum: 1, minimum: 0, name: 'C', repeat: true},
    ],
  }
}

/**
 * Draw order: overlapping squares reordered by static and keyed draw orders, two of them in a
 * draw order group sitting between the others, seen between keyforms.
 */
const drawOrder = () => {
  const {document, group, part} = createBuilder()
  const colors: ReadonlyArray<readonly [string, Rgba]> = [
    ['red', [210, 60, 40, 1]],
    ['green', [40, 170, 80, 1]],
    ['blue', [40, 90, 200, 1]],
    ['gold', [230, 190, 40, 1]],
    ['violet', [150, 70, 200, 1]],
  ]
  const square = (index: number): Rect => [GAP + index * 14, GAP + (index % 2) * 10, 30, 30]
  const nodes = colors.map(([id, rgba], index) => part(id, square(index), solid(rgba)))
  const roots = [
    nodes[0]!,
    group('pair', [nodes[1]!, nodes[2]!], {drawOrder: 450}),
    nodes[3]!,
    nodes[4]!,
  ]
  const base = document(roots, GAP * 2 + 4 * 14 + 30, GAP * 2 + 10 + 30)
  return {
    ...base,
    parameterBindings: [
      {
        id: 'order',
        keyforms: [0, 1].map((value) => ({
          parts: [
            {
              partId: 'red',
              properties: {drawOrder: value === 0 ? 100 : 900},
              vertices: base.parts[0]!.mesh.vertices,
            },
          ],
          values: [value] as const,
        })),
        parameterIds: ['order'] as const,
        targetPartIds: ['red'],
      },
    ],
    parameters: [{defaultValue: 0.7, id: 'order', maximum: 1, minimum: 0, name: 'Order'}],
    parts: base.parts.map((candidate) =>
      candidate.id === 'gold'
        ? {...candidate, properties: {drawOrder: 300}}
        : candidate.id === 'blue'
          ? {...candidate, properties: {drawOrder: 100}}
          : candidate,
    ),
  }
}

/**
 * Deformer properties: a rotation deformer between keyforms of angle and scale, and a warp
 * deformer whose keyed opacity and colors reach a part and an offscreen group inside it.
 */
const deformerProperties = () => {
  const {document, group, part} = createBuilder()
  const [x, y] = cell(0, 0)
  const pivot = [x + SWATCH / 2, y + SWATCH / 2] as const
  const tip = (degrees: number) => [
    pivot[0] + 10 * Math.cos((degrees * Math.PI) / 180),
    pivot[1] + 10 * Math.sin((degrees * Math.PI) / 180),
  ]
  const [wx, wy] = cell(1, 0)
  const warp: Rect = [wx, wy, 2 * SWATCH + GAP, SWATCH]
  const corners = quad(warp)
  const node = (id: string, children: ReadonlyArray<PuppetSceneNode>, shape: object) =>
    ({
      children,
      columns: 1,
      id,
      kind: 'deformer',
      locked: false,
      name: id,
      rows: 1,
      visible: true,
      ...shape,
    }) as PuppetSceneNode
  const keyform = (value: number, rotation: object, warped: object) => ({
    deformers: [
      {controlPoints: [...pivot, ...tip(0)], kind: 'deformer' as const, nodeId: 'rot', ...rotation},
      {controlPoints: corners, kind: 'deformer' as const, nodeId: 'warp', ...warped},
    ],
    parts: [],
    values: [value] as const,
  })
  return {
    ...document(
      [
        part('backdrop', warp, BACKDROP),
        node('rot', [part('spun', [pivot[0] - 8, pivot[1] - 8, 16, 16], SOURCE)], {
          boneRestPoints: [...pivot, ...tip(0)],
          bounds: {height: SWATCH, width: SWATCH, x, y},
          controlPoints: [...pivot, ...tip(0)],
          deformerType: 'rotation',
        }),
        node(
          'warp',
          [
            part('tinted', cell(1, 0), SOURCE),
            group('layer', [part('layered', cell(2, 0), SOURCE)], {offscreen: true}),
          ],
          {
            bounds: {height: SWATCH, width: warp[2], x: wx, y: wy},
            controlPoints: corners,
            properties: {opacity: 0.9},
          },
        ),
      ],
      GAP + 3 * (SWATCH + GAP),
      GAP + SWATCH + GAP,
    ),
    parameterBindings: [
      {
        id: 'k',
        keyforms: [
          keyform(0, {}, {}),
          keyform(
            1,
            {controlPoints: [...pivot, ...tip(40)], rotationScale: 1.6},
            {properties: {multiplyColor: [1, 0.4, 0.4], opacity: 0.4, screenColor: [0, 0, 0.5]}},
          ),
        ],
        parameterIds: ['k'] as const,
        targetDeformerIds: ['rot', 'warp'],
        targetPartIds: [],
      },
    ],
    parameters: [{defaultValue: 0.7, id: 'k', maximum: 1, minimum: 0, name: 'K'}],
  }
}

interface Experiment {
  readonly create: () => unknown
  readonly name: string
  /** Canvas size; the viewport size when omitted. */
  readonly size?: readonly [number, number]
}

/** The development model with its part images packed into texture atlas pages. */
const developmentModelAtlas = () => {
  const parsed = parseDocument(JSON.stringify(developmentModel))
  if (!parsed.ok) {
    throw new Error(`invalid development model: ${parsed.error.code}`)
  }
  return packTextureAtlas(parsed.document)
}

const EXPERIMENTS: ReadonlyArray<Experiment> = [
  {create: blendModes, name: 'blend-modes'},
  {create: alphaModes, name: 'alpha-modes'},
  {create: offscreenGroups, name: 'offscreen-groups'},
  {create: keyedGroups, name: 'keyed-groups'},
  {create: deformation, name: 'deformation'},
  {create: drawOrder, name: 'draw-order'},
  {create: deformerProperties, name: 'deformer-properties'},
  // A corner of the draw order scene, framed on a wider screen and aligned to its bottom left.
  {
    create: () => ({...drawOrder(), layout: {align: [0, 1], height: 30, width: 40, x: 20, y: 10}}),
    name: 'layout',
    size: [200, 80],
  },
  {create: () => developmentModel, name: 'development-model', size: [450, 800]},
  {create: developmentModelAtlas, name: 'development-model-atlas', size: [450, 800]},
  // Twice the scale: minification aliasing, which amplifies tiny sampling differences, halves.
  {create: () => developmentModel, name: 'development-model-2x', size: [900, 1600]},
]

const render = async (source: unknown, size?: readonly [number, number]) => {
  const parsed = parseDocument(JSON.stringify(source))
  if (!parsed.ok) {
    throw new Error(`invalid experiment document: ${parsed.error.code}`)
  }
  const canvas = document.createElement('canvas')
  const [width, height] = size ?? [parsed.document.viewport.width, parsed.document.viewport.height]
  // The player fits the document into its host, as `render_snapshot` fits it into the image.
  const host = document.createElement('div')
  host.style.width = `${width}px`
  host.style.height = `${height}px`
  host.append(canvas)
  document.body.append(host)
  // Hold the first frame, as `render_snapshot` draws it before any `update`: the selected motion
  // at 0 s with physics at rest. Pausing without physics preview stops the ticker, so no frame
  // time reaches motions or physics before the capture.
  player = await createPlayer({
    canvas,
    document: parsed.document,
    physicsPreview: false,
    resolution: 1,
  })
  player.pause()
  player.seek(0)
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => resolve())
  })
  player.redraw()
  // Read the WebGL canvas in the same task as the render, before the buffer is presented.
  const {canvas: copy, context} = canvas2d(canvas.width, canvas.height)
  context.drawImage(canvas, 0, 0)
  return copy.toDataURL('image/png').replace(/^data:image\/png;base64,/u, '')
}

describe.runIf(import.meta.env.VITE_PUPPET_RENDERING_EXPERIMENT === '1')(
  'rendering experiment',
  () => {
    test.each(EXPERIMENTS)(
      'should write $name',
      async ({create, name, size}) => {
        const source = await create()
        const png = await render(source, size)
        // Repeated images, such as atlas pages, are written once (`textureAssets`).
        const text = JSON.stringify(compactDocumentTextures(source as PuppetDocument))
        await commands.writeFile(`${OUTPUT}/${name}.json`, text)
        await commands.writeFile(`${OUTPUT}/${name}.web.png`, png, 'base64')
        expect(png.length).toBeGreaterThan(0)
      },
      120_000,
    )
  },
)
