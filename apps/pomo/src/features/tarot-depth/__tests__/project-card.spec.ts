import {afterEach, describe, expect, it, vi} from 'vitest'
import {projectCard} from '../project-card'

const READ_ORDER = [
  'x',
  'y',
  'height',
  'width',
  'height',
  'width',
  'height',
  'width',
  'height',
  'width',
  'height',
  'width',
  'height',
  'width',
  'width',
  'height',
  'height',
  'width',
  'width',
  'height',
  'height',
  'width',
  'width',
  'height',
  'height',
  'width',
  'width',
  'height',
  'height',
  'reversed',
] as const

describe('projectCard', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should fill the original two-to-three frame at rest', () => {
    expect(projectCard({height: 600, width: 400, x: 0, y: 0})).toEqual([
      0, 0, 400, 0, 400, 600, 0, 600,
    ])
  })

  it.each([-1, 1])(
    'should tilt with perspective while retaining all four corners in the viewport at %s',
    (x) => {
      const corners = projectCard({height: 600, width: 400, x, y: 1})
      expect(corners[1]).not.toBe(corners[3])
      for (let index = 0; index < corners.length; index += 2) {
        expect(corners[index]).toBeGreaterThanOrEqual(0)
        expect(corners[index]).toBeLessThanOrEqual(400)
        expect(corners[index + 1]).toBeGreaterThanOrEqual(0)
        expect(corners[index + 1]).toBeLessThanOrEqual(600)
      }
    },
  )

  it('should constrain input and preserve the reversed orientation', () => {
    expect(projectCard({height: 600, width: 400, x: 10, y: -10})).toEqual(
      projectCard({height: 600, width: 400, x: 1, y: -1}),
    )
    expect(projectCard({height: 600, reversed: true, width: 400, x: 0, y: 0})).toEqual([
      400, 600, 0, 600, 0, 0, 400, 0,
    ])
  })

  it.each([
    {
      expected: [
        0, 4.836297160160768, 400, 5.699281421936064, 393.8327607228166, 593.3025451537239,
        6.224901059604662, 595.1637028398393,
      ],
      input: {height: 600, width: 400, x: 0.125, y: -0.875},
      name: 'fractional upright tilt',
    },
    {
      expected: [
        17.201464937438114, 29.7, 0.09853506256188638, 29.393405395674854, 0.18614243600244862,
        0.39136583416205006, 17.10958720182505, 0,
      ],
      input: {height: 29.7, reversed: true, width: 17.3, x: -0.731, y: 0.293},
      name: 'fractional reversed tilt',
    },
    {
      expected: [
        7.510197170802963e247, 0, 9.92489802829197e249, 1.5565225155013472e248,
        9.760382557666924e249, 9.618719116600863e249, 2.589761902591052e248, 1e250,
      ],
      input: {height: 1e250, width: 1e250, x: 1, y: -1},
      name: 'large finite dimensions',
    },
    {
      expected: [0, 0, 0, 0, 0, 0, 0, 0],
      input: {height: Number.MIN_VALUE, width: Number.MIN_VALUE, x: 0.5, y: -0.5},
      name: 'subnormal dimensions',
    },
  ])('should retain exact original coordinates for $name', ({expected, input}) => {
    const frozen = Object.freeze(input)
    const actual = projectCard(frozen)
    for (const [index, value] of expected.entries()) {
      expect(actual[index]).toBe(value)
    }
    expect(projectCard(frozen)).not.toBe(actual)
  })

  it.each([
    {height: -0, width: 0, x: -0, y: 0},
    {height: 600, width: Infinity, x: 0.125, y: -0.875},
    {height: -Infinity, width: 400, x: 0.125, y: -0.875},
    {height: 600, width: 400, x: NaN, y: Infinity},
  ])('should retain original NaN coordinates for invalid numeric bounds %#', (input) => {
    expect(projectCard(Object.freeze(input))).toEqual([NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN])
  })

  it('should clamp infinite offsets to the same finite endpoints', () => {
    expect(projectCard({height: 600, width: 400, x: Infinity, y: -Infinity})).toEqual(
      projectCard({height: 600, width: 400, x: 1, y: -1}),
    )
  })

  it('should retain signed zero in rotation inputs', () => {
    const sine = vi.spyOn(Math, 'sin')
    const cosine = vi.spyOn(Math, 'cos')
    projectCard({height: 600, width: 400, x: -0, y: -0})
    expect(sine.mock.calls[0]?.[0]).toBe(-0)
    expect(cosine.mock.calls[0]?.[0]).toBe(-0)
  })

  it('should retain changing getters and their original read order', () => {
    const reads: string[] = []
    const readNumber = (property: string, value: number): number => {
      reads.push(property)
      return value + reads.length / 100
    }
    const actual = projectCard({
      get height() {
        return readNumber('height', 600)
      },
      get reversed() {
        reads.push('reversed')
        return false
      },
      get width() {
        return readNumber('width', 400)
      },
      get x() {
        return readNumber('x', 0)
      },
      get y() {
        return readNumber('y', 0)
      },
    })
    expect(reads).toEqual(READ_ORDER)
    expect(actual).toEqual([
      0.18405251035616743, 0.06968404461804312, 399.99606425690695, 0.19260835450359082, 400.17,
      600.009233176513, 0.06999999999999318, 600.150315955382,
    ])
  })

  it.each(READ_ORDER.map((property, index) => ({index, property})))(
    'should preserve the same getter failure at read $index ($property)',
    ({index}) => {
      const failure = new Error('projection input failed')
      let readCount = 0
      const readProperty = <Value>(value: Value): Value => {
        const currentRead = readCount
        readCount += 1
        if (currentRead === index) {
          throw failure
        }
        return value
      }
      const options = {
        get height() {
          return readProperty(600)
        },
        get reversed() {
          return readProperty(false)
        },
        get width() {
          return readProperty(400)
        },
        get x() {
          return readProperty(0)
        },
        get y() {
          return readProperty(0)
        },
      }
      const readResult = () => {
        try {
          return projectCard(options)
        } catch (error: unknown) {
          return error
        }
      }
      expect(readResult()).toBe(failure)
      expect(readCount).toBe(index + 1)
    },
  )

  it('should calculate each rotation sine and cosine once for all four corners', () => {
    const sine = vi.spyOn(Math, 'sin')
    const cosine = vi.spyOn(Math, 'cos')
    projectCard({height: 600, width: 400, x: 0.125, y: -0.875})
    expect(sine).toHaveBeenCalledTimes(2)
    expect(cosine).toHaveBeenCalledTimes(2)
  })
})
