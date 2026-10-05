import {describe, expect, it} from 'vitest'
import {getContainedRect} from '../'

const container = {height: 300, width: 400}

describe('getContainedRect', () => {
  it.each([
    {
      content: {height: 400, width: 800},
      expected: {height: 200, scale: 0.5, width: 400, x: 0, y: 50},
    },
    {
      content: {height: 600, width: 200},
      expected: {height: 300, scale: 0.5, width: 100, x: 150, y: 0},
    },
    {
      content: {height: 600, width: 600},
      expected: {height: 300, scale: 0.5, width: 300, x: 50, y: 0},
    },
    {
      content: {height: 20, width: 40},
      expected: {height: 200, scale: 10, width: 400, x: 0, y: 50},
    },
    {
      content: container,
      expected: {height: 300, scale: 1, width: 400, x: 0, y: 0},
    },
  ])(
    'should center and contain $content.width by $content.height without changing its ratio',
    (sample) => {
      expect(getContainedRect({container, content: sample.content})).toEqual(sample.expected)
    },
  )

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])(
    'should return null for a non-positive or non-finite dimension %s',
    (dimension) => {
      const invalidWidth = {height: 100, width: dimension}
      const invalidHeight = {height: dimension, width: 100}
      expect(getContainedRect({container, content: invalidWidth})).toBeNull()
      expect(getContainedRect({container, content: invalidHeight})).toBeNull()
      expect(getContainedRect({container: invalidWidth, content: container})).toBeNull()
      expect(getContainedRect({container: invalidHeight, content: container})).toBeNull()
    },
  )

  it('should leave caller-owned dimensions unchanged', () => {
    const content = Object.freeze({height: 20, width: 40})
    const bounds = Object.freeze(container)

    expect(getContainedRect({container: bounds, content})).toEqual({
      height: 200,
      scale: 10,
      width: 400,
      x: 0,
      y: 50,
    })
  })
})
