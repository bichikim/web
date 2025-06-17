import {describe, expect, it} from 'vitest'
import {createWriteModuleMap} from './create-write-module-map'
import {DEFAULT_PREFIX} from './share'

describe('createWriteModuleMap', () => {
  it('should create module map with default prefix', () => {
    const destinationPath = '/dist'

    const sourceMap = {
      'module1.js': 'https://example.com/module1.js',
      'module2.js': 'https://example.com/module2.js',
    }

    const result = createWriteModuleMap(destinationPath, sourceMap)

    expect(result).toEqual({
      [`${destinationPath}${DEFAULT_PREFIX}module1.js`]: 'https://example.com/module1.js',
      [`${destinationPath}${DEFAULT_PREFIX}module2.js`]: 'https://example.com/module2.js',
    })
  })

  it('should create module map with custom prefix', () => {
    const destinationPath = '/dist'

    const sourceMap = {
      'module1.js': 'https://example.com/module1.js',
      'module2.js': 'https://example.com/module2.js',
    }
    const customPrefix = '/custom/'

    const result = createWriteModuleMap(destinationPath, sourceMap, customPrefix)

    expect(result).toEqual({
      '/dist/custom/module1.js': 'https://example.com/module1.js',
      '/dist/custom/module2.js': 'https://example.com/module2.js',
    })
  })

  it('should handle empty source map', () => {
    const destinationPath = '/dist'
    const sourceMap = {}

    const result = createWriteModuleMap(destinationPath, sourceMap)

    expect(result).toEqual({})
  })
})
