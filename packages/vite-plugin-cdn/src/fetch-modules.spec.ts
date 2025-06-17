import {describe, expect, it, vi} from 'vitest'
import {fetchModules} from './fetch-modules'
import type {Module} from './types'

describe('fetchModules', () => {
  it('should fetch modules and return valid results', async () => {
    const moduleMap = {
      module1: 'https://example.com/module1',
      module2: 'https://example.com/module2',
    }

    const mockModule: Module = {
      headers: {},
      text: 'module content',
    }

    const getModule = vi.fn().mockResolvedValue(mockModule)

    const result = await fetchModules(moduleMap, getModule)

    expect(getModule).toHaveBeenCalledTimes(2)
    expect(getModule).toHaveBeenNthCalledWith(1, 'https://example.com/module1')
    expect(getModule).toHaveBeenNthCalledWith(2, 'https://example.com/module2')

    expect(result).toEqual([
      ['module1', 'module content'],
      ['module2', 'module content'],
    ])
  })

  it('should filter out null results', async () => {
    const moduleMap = {
      module1: 'https://example.com/module1',
      module2: 'https://example.com/module2',
    }

    const getModule = vi.fn().mockImplementation((url: string) => {
      return url.includes('module1') ? Promise.resolve({text: 'content'}) : Promise.resolve(null)
    })

    const result = await fetchModules(moduleMap, getModule)

    expect(getModule).toHaveBeenCalledTimes(2)
    expect(result).toEqual([['module1', 'content']])
  })
})
