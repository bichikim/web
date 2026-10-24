import {describe, expect, it, vi} from 'vitest'

import transformerCompileClass from '../transformer-class'

const createContext = () => ({
  invalidate: vi.fn(),
  tokens: new Set<string>(),
  uno: {
    config: {shortcuts: [] as unknown[]},
    parseToken: vi.fn((token: string) => Promise.resolve(token !== 'unknown')),
  },
})

const createSource = (original: string) => {
  let value = original

  return {
    original,
    overwrite: (start: number, end: number, replacement: string) => {
      value = `${value.slice(0, start)}${replacement}${value.slice(end)}`
    },
    toString: () => value,
  }
}

describe('transformerCompileClass', () => {
  it('should replace known utilities with a compiled class and retain unknown utilities', async () => {
    const source = createSource('<div class=":uno: text-white unknown p-2"></div>')
    const context = createContext()
    const transformer = transformerCompileClass({hashFn: () => 'hash'})

    await transformer.transform?.(source as never, 'component.tsx', context as never)

    expect(source.toString()).toBe('<div class="uno-hash unknown"></div>')
    expect(context.uno.config.shortcuts).toEqual([['uno-hash', 'p-2 text-white']])
    expect(context.tokens).toEqual(new Set(['uno-hash']))
    expect(context.invalidate).toHaveBeenCalledOnce()
  })

  it('should use an explicit class name and configured layer', async () => {
    const source = createSource('<div class=":uno-card: p-2"></div>')
    const context = createContext()
    const transformer = transformerCompileClass({layer: 'components'})

    await transformer.transform?.(source as never, 'component.tsx', context as never)

    expect(source.toString()).toBe('<div class="uno-card"></div>')
    expect(context.uno.config.shortcuts).toEqual([['uno-card', 'p-2', {layer: 'components'}]])
  })

  it('should leave source unchanged when the trigger is absent', async () => {
    const source = createSource('<div class="p-2"></div>')
    const context = createContext()
    const transformer = transformerCompileClass()

    await transformer.transform?.(source as never, 'component.tsx', context as never)

    expect(source.toString()).toBe('<div class="p-2"></div>')
    expect(context.invalidate).not.toHaveBeenCalled()
  })
})
