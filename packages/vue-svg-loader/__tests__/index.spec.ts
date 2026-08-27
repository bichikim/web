import {createRequire} from 'node:module'
import {describe, expect, it, vi} from 'vitest'

const require = createRequire(import.meta.url)
const vueSvgLoader = require('../src/index.js') as (this: LoaderContext, svg: string) => string

interface LoaderContext {
  getOptions: () => {svgo?: false | Record<string, unknown>} | undefined
  resourcePath: string
}

const svg = '<svg xmlns="http://www.w3.org/2000/svg"><rect width="10" height="10"/></svg>'

describe('vueSvgLoader', () => {
  it('should read loader options from the webpack context and optimize SVG by default', () => {
    const getOptions = vi.fn().mockReturnValue(undefined)

    const result = vueSvgLoader.call({getOptions, resourcePath: '/assets/icon.svg'}, svg)

    expect(getOptions).toHaveBeenCalledOnce()
    expect(result).toMatch(/^<template><svg/u)
    expect(result).toMatch(/<\/svg><\/template>$/u)
  })

  it('should preserve SVG when optimization is disabled', () => {
    const getOptions = vi.fn().mockReturnValue({svgo: false})

    const result = vueSvgLoader.call({getOptions, resourcePath: '/assets/icon.svg'}, svg)

    expect(result).toBe(`<template>${svg}</template>`)
  })

  it('should pass an explicit SVGO configuration', () => {
    let receivedPath: string | undefined
    const capturePath = {
      fn: (_root: unknown, _params: unknown, info: {path?: string}) => {
        receivedPath = info.path
      },
      name: 'capture-path',
    }
    const getOptions = vi.fn().mockReturnValue({svgo: {plugins: [capturePath]}})

    const result = vueSvgLoader.call({getOptions, resourcePath: '/assets/icon.svg'}, svg)

    expect(result).toBe(`<template>${svg}</template>`)
    expect(receivedPath).toBe('/assets/icon.svg')
  })
})
