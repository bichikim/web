import {afterEach, describe, expect, test} from 'vitest'

import {createPlayer, type Player} from '../../src/player/create-player'
import {
  PUPPET_DOCUMENT_FORMAT,
  PUPPET_DOCUMENT_VERSION,
  type PuppetAlphaBlendMode,
  type PuppetDocument,
  type PuppetPart,
  type PuppetPartBlendMode,
} from '../../src/player/document'
import {parseDocument} from '../../src/player/parse-document'

/** Chromium's Canvas 2D implements these W3C blend modes; it is the independent reference. */
const CANVAS_MODES: ReadonlyArray<readonly [PuppetPartBlendMode, GlobalCompositeOperation]> = [
  ['normal', 'source-over'],
  ['multiply', 'multiply'],
  ['screen', 'screen'],
  ['darken', 'darken'],
  ['lighten', 'lighten'],
  ['color-burn', 'color-burn'],
  ['color-dodge', 'color-dodge'],
  ['overlay', 'overlay'],
  ['soft-light', 'soft-light'],
  ['hard-light', 'hard-light'],
  ['difference', 'difference'],
  ['exclusion', 'exclusion'],
  ['hue', 'hue'],
  ['saturation', 'saturation'],
  ['color', 'color'],
  ['luminosity', 'luminosity'],
]
/** PixiJS fixed-function modes only match W3C over an opaque backdrop. */
const FIXED_FUNCTION_MODES: ReadonlySet<PuppetPartBlendMode> = new Set([
  'normal',
  'multiply',
  'screen',
])
const SWATCH = 32
const GAP = 8
const WIDTH = CANVAS_MODES.length * (SWATCH + GAP) + GAP
const HEIGHT = 2 * (SWATCH + GAP) + GAP
const OPACITY = 0.8
const TOLERANCE = 4

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

/** Backdrop: hue gradient, opaque in the upper row and half transparent in the lower row. */
const createBackdrop = () => {
  const {canvas, context} = canvas2d(WIDTH, HEIGHT)
  const gradient = context.createLinearGradient(0, 0, WIDTH, 0)
  gradient.addColorStop(0, '#d23a1e')
  gradient.addColorStop(0.5, '#3fa86b')
  gradient.addColorStop(1, '#2a4fd0')
  context.fillStyle = gradient
  context.fillRect(0, 0, WIDTH, HEIGHT / 2)
  context.globalAlpha = 0.5
  context.fillRect(0, HEIGHT / 2, WIDTH, HEIGHT / 2)
  return canvas
}

/** Source: a two-axis color gradient so each swatch covers many backdrop/source pairs. */
const createSource = () => {
  const {canvas, context} = canvas2d(SWATCH, SWATCH)
  const horizontal = context.createLinearGradient(0, 0, SWATCH, 0)
  horizontal.addColorStop(0, '#f2d64b')
  horizontal.addColorStop(1, '#5a2bd8')
  context.fillStyle = horizontal
  context.fillRect(0, 0, SWATCH, SWATCH)
  const vertical = context.createLinearGradient(0, 0, 0, SWATCH)
  vertical.addColorStop(0, 'rgba(255, 255, 255, 0.6)')
  vertical.addColorStop(1, 'rgba(0, 0, 0, 0.6)')
  context.fillStyle = vertical
  context.fillRect(0, 0, SWATCH, SWATCH)
  return canvas
}

const quad = (
  id: string,
  x: number,
  y: number,
  width: number,
  height: number,
  src: string,
): PuppetPart => ({
  id,
  mesh: {
    indices: [0, 1, 2, 1, 3, 2],
    uvs: [0, 0, 1, 0, 0, 1, 1, 1],
    vertices: [x, y, x + width, y, x, y + height, x + width, y + height],
  },
  texture: {height, src, width},
})

const swatchOrigin = (column: number, row: number) => ({
  x: GAP + column * (SWATCH + GAP),
  y: GAP + row * (SWATCH + GAP),
})

interface Swatch {
  readonly alphaBlendMode: PuppetAlphaBlendMode
  readonly blendMode: PuppetPartBlendMode
}

const renderPuppet = async (
  backdrop: HTMLCanvasElement,
  source: HTMLCanvasElement,
  columns: ReadonlyArray<Swatch>,
) => {
  const sourceUrl = source.toDataURL('image/png')
  const parts = columns.flatMap(({alphaBlendMode, blendMode}, column) =>
    [0, 1].map((row): PuppetPart => {
      const {x, y} = swatchOrigin(column, row)
      return {
        ...quad(`${column}-${row}`, x, y, SWATCH, SWATCH, sourceUrl),
        properties: {alphaBlendMode, blendMode, opacity: OPACITY},
      }
    }),
  )
  const puppet: PuppetDocument = {
    format: PUPPET_DOCUMENT_FORMAT,
    motions: [],
    parts: [quad('backdrop', 0, 0, WIDTH, HEIGHT, backdrop.toDataURL('image/png')), ...parts],
    version: PUPPET_DOCUMENT_VERSION,
    viewport: {height: HEIGHT, width: WIDTH},
  }
  const parsed = parseDocument(JSON.stringify(puppet))
  if (!parsed.ok) {
    throw new Error('invalid blend mode fixture')
  }
  const canvas = document.createElement('canvas')
  player = await createPlayer({canvas, document: parsed.document, resolution: 1})
  // Let the initial frame present (which clears the drawing buffer) before rendering once more.
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => resolve())
  })
  player.redraw()
  // Read the WebGL canvas in the same task as the render, before the buffer is presented.
  const {context} = canvas2d(WIDTH, HEIGHT)
  context.drawImage(canvas, 0, 0)
  return context
}

const renderReference = (backdrop: HTMLCanvasElement, source: HTMLCanvasElement) => {
  const {context} = canvas2d(WIDTH, HEIGHT)
  context.drawImage(backdrop, 0, 0)
  CANVAS_MODES.forEach(([, operation], column) => {
    for (const row of [0, 1]) {
      const {x, y} = swatchOrigin(column, row)
      context.globalCompositeOperation = operation
      context.globalAlpha = OPACITY
      context.drawImage(source, x, y)
    }
  })
  return context
}

const pixel = (context: CanvasRenderingContext2D, x: number, y: number) =>
  Array.from(context.getImageData(x, y, 1, 1).data)

const solid = (width: number, height: number, rgba: readonly [number, number, number, number]) => {
  const {canvas, context} = canvas2d(width, height)
  context.fillStyle = `rgba(${rgba[0] * 255}, ${rgba[1] * 255}, ${rgba[2] * 255}, ${rgba[3]})`
  context.fillRect(0, 0, width, height)
  return canvas
}

type Rgb = readonly [number, number, number]

const LINEAR_MODES: ReadonlyArray<
  readonly [PuppetPartBlendMode, (cb: number, cs: number) => number]
> = [
  ['linear-dodge', (cb, cs) => Math.min(1, cb + cs)],
  ['linear-burn', (cb, cs) => Math.max(0, cb + cs - 1)],
  ['linear-light', (cb, cs) => Math.min(1, Math.max(0, cb + 2 * cs - 1))],
]

/** `KHR_blend_equation_advanced` coverage weights (p0, p1, p2) and color/alpha selectors (X, Y, Z). */
const ALPHA_MODES: ReadonlyArray<
  readonly [
    PuppetAlphaBlendMode,
    (as: number, ab: number) => readonly [number, number, number],
    Rgb,
  ]
> = [
  ['over', (as, ab) => [as * ab, as * (1 - ab), ab * (1 - as)], [1, 1, 1]],
  ['atop', (as, ab) => [as * ab, as * (1 - ab), ab * (1 - as)], [1, 0, 1]],
  ['out', (as, ab) => [as * ab, as * (1 - ab), ab * (1 - as)], [0, 0, 1]],
  [
    'conjoint-over',
    (as, ab) => [Math.min(as, ab), Math.max(as - ab, 0), Math.max(ab - as, 0)],
    [1, 1, 1],
  ],
  [
    'disjoint-over',
    (as, ab) => [Math.max(as + ab - 1, 0), Math.min(as, 1 - ab), Math.min(ab, 1 - as)],
    [1, 1, 1],
  ],
]

/** Straight 8-bit RGBA of the composite, as Canvas 2D reads it back. */
const expectedPixel = (
  cb: Rgb,
  ab: number,
  cs: Rgb,
  as: number,
  blend: (cb: number, cs: number) => number,
  alphaMode: (typeof ALPHA_MODES)[number],
) => {
  const [p0, p1, p2] = alphaMode[1](as, ab)
  const [x, y, z] = alphaMode[2]
  const alpha = x * p0 + y * p1 + z * p2
  const color = cb.map(
    (b, index) => x * blend(b, cs[index]!) * p0 + y * cs[index]! * p1 + z * b * p2,
  )
  return [
    ...color.map((value) => Math.round((alpha > 0 ? value / alpha : 0) * 255)),
    Math.round(alpha * 255),
  ]
}

/**
 * Largest channel difference after premultiplying, the precision the canvas stores; straight
 * colors read back from faint pixels carry a quantization error of up to 255 / alpha steps.
 */
const premultipliedError = (got: ReadonlyArray<number>, want: ReadonlyArray<number>) => {
  const premultiply = (rgba: ReadonlyArray<number>) =>
    rgba.map((value, index) => (index === 3 ? value : (value * rgba[3]!) / 255))
  const [a, b] = [premultiply(got), premultiply(want)]
  return Math.max(...a.map((value, index) => Math.abs(value - b[index]!)))
}

const BACKDROP_COLOR: Rgb = [0.2, 0.45, 0.7]
const SOURCE_COLOR: Rgb = [0.85, 0.3, 0.15]
const BACKDROP_ALPHAS = [1, 0.6] as const

describe('part blend modes', () => {
  test('should follow the linear modes and alpha compositing formulas', async () => {
    const {canvas: backdrop, context} = canvas2d(WIDTH, HEIGHT)
    BACKDROP_ALPHAS.forEach((alpha, row) => {
      context.drawImage(solid(WIDTH, HEIGHT / 2, [...BACKDROP_COLOR, alpha]), 0, (row * HEIGHT) / 2)
    })
    const columns: ReadonlyArray<
      Swatch & {
        readonly check: readonly [(cb: number, cs: number) => number, (typeof ALPHA_MODES)[number]]
      }
    > = [
      ...LINEAR_MODES.map(([blendMode, blend]) => ({
        alphaBlendMode: 'over' as const,
        blendMode,
        check: [blend, ALPHA_MODES[0]!] as const,
      })),
      ...ALPHA_MODES.map((alphaMode) => ({
        alphaBlendMode: alphaMode[0],
        blendMode: 'normal' as const,
        check: [(_cb: number, cs: number) => cs, alphaMode] as const,
      })),
    ]
    const actual = await renderPuppet(
      backdrop,
      solid(SWATCH, SWATCH, [...SOURCE_COLOR, 1]),
      columns,
    )
    const mismatches = columns.flatMap(({alphaBlendMode, blendMode, check}, column) =>
      BACKDROP_ALPHAS.flatMap((ab, row) => {
        const {x, y} = swatchOrigin(column, row)
        const got = pixel(actual, x + SWATCH / 2, y + SWATCH / 2)
        const want = expectedPixel(BACKDROP_COLOR, ab, SOURCE_COLOR, OPACITY, ...check)
        return premultipliedError(got, want) > TOLERANCE
          ? [`${blendMode}/${alphaBlendMode} backdrop α ${ab}: ${got} vs ${want}`]
          : []
      }),
    )
    expect(mismatches).toEqual([])
  })

  test('should keep the PixiJS premultiplied sum for add over', async () => {
    const {canvas: backdrop, context} = canvas2d(WIDTH, HEIGHT)
    BACKDROP_ALPHAS.forEach((alpha, row) => {
      context.drawImage(solid(WIDTH, HEIGHT / 2, [...BACKDROP_COLOR, alpha]), 0, (row * HEIGHT) / 2)
    })
    const actual = await renderPuppet(backdrop, solid(SWATCH, SWATCH, [...SOURCE_COLOR, 1]), [
      {alphaBlendMode: 'over', blendMode: 'add'},
    ])
    BACKDROP_ALPHAS.forEach((ab, row) => {
      const {x, y} = swatchOrigin(0, row)
      const alpha = Math.min(1, OPACITY + ab)
      const want = [
        ...SOURCE_COLOR.map((cs, index) =>
          Math.round((Math.min(1, cs * OPACITY + BACKDROP_COLOR[index]! * ab) / alpha) * 255),
        ),
        Math.round(alpha * 255),
      ]
      const got = pixel(actual, x + SWATCH / 2, y + SWATCH / 2)
      expect(
        Math.max(...got.map((value, index) => Math.abs(value - want[index]!))),
      ).toBeLessThanOrEqual(TOLERANCE)
    })
  })

  test('should match Canvas 2D W3C blending over opaque and translucent backdrops', async () => {
    const backdrop = createBackdrop()
    const source = createSource()
    const actual = await renderPuppet(
      backdrop,
      source,
      CANVAS_MODES.map(([blendMode]) => ({alphaBlendMode: 'over', blendMode})),
    )
    const expected = renderReference(backdrop, source)
    const samples = [4, 12, 20, 28]
    const mismatches = CANVAS_MODES.flatMap(([blendMode], column) =>
      [0, 1]
        .filter((row) => row === 0 || !FIXED_FUNCTION_MODES.has(blendMode))
        .flatMap((row) =>
          samples.flatMap((sx) =>
            samples.flatMap((sy) => {
              const {x, y} = swatchOrigin(column, row)
              const got = pixel(actual, x + sx, y + sy)
              const want = pixel(expected, x + sx, y + sy)
              const worst = Math.max(...got.map((value, index) => Math.abs(value - want[index]!)))
              return worst > TOLERANCE
                ? [`${blendMode} row ${row} (${sx},${sy}): ${got} vs ${want}`]
                : []
            }),
          ),
        ),
    )
    expect(mismatches).toEqual([])
  })
})
