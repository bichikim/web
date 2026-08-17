import {describe, expect, it} from 'vitest'

import {createUnoCssInlineResolver} from './vite'

describe('createUnoCssInlineResolver', () => {
  it('should mark UnoCSS inline requests as virtual modules', () => {
    const plugin = createUnoCssInlineResolver()
    const resolveId = plugin.resolveId as (source: string) => string | undefined

    expect(resolveId('/__uno.css?inline')).toBe('\0/__uno.css?inline')
    expect(resolveId('/__uno_hash.css?inline&direct')).toBe('\0/__uno_hash.css?inline&direct')
    expect(resolveId('/src/app.css?inline')).toBeUndefined()
  })
})
