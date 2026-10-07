import {createRoot, createSignal} from 'solid-js'
import {describe, expect, it} from 'vitest'
import {useDocumentSearch} from '../use-document-search'

describe('useDocumentSearch', () => {
  it('should request scrolling for search actions while preserving navigation on source changes', () => {
    createRoot((dispose) => {
      const [source, setSource] = createSignal('a a a')
      const search = useDocumentSearch({source})
      search.open('a')
      expect(search.scrollRequest()).toBe(1)
      search.move(1)
      expect(search.scrollRequest()).toBe(2)
      setSource('b a')
      expect(search.scrollRequest()).toBe(2)
      expect(search.active()).toBe(0)
      search.change('missing')
      expect(search.scrollRequest()).toBe(3)
      search.change('missing')
      search.move(1)
      expect(search.scrollRequest()).toBe(3)
      search.open()
      expect(search.scrollRequest()).toBe(4)
      dispose()
    })
  })

  it('should wrap in both directions and clear highlighting on dismissal while retaining the query', () => {
    createRoot((dispose) => {
      const search = useDocumentSearch({source: () => 'one ONE one'})
      search.open('one')
      expect(search.matches()).toHaveLength(3)
      expect(search.active()).toBe(0)
      search.move(-1)
      expect(search.active()).toBe(2)
      search.move(1)
      expect(search.active()).toBe(0)
      search.close()
      expect(search.visible()).toBe(false)
      expect(search.matches()).toEqual([])
      search.open()
      expect(search.query()).toBe('one')
      expect(search.matches()).toHaveLength(3)
      dispose()
    })
  })

  it('should recompute results and reset the active match when the source or query changes', () => {
    createRoot((dispose) => {
      const [source, setSource] = createSignal('a a a')
      const search = useDocumentSearch({source})
      search.open('a')
      search.move(1)
      setSource('b a')
      expect(search.matches()).toEqual([{end: 3, start: 2}])
      expect(search.active()).toBe(0)
      search.change('missing')
      expect(search.active()).toBe(-1)
      search.move(1)
      expect(search.active()).toBe(-1)
      dispose()
    })
  })
})
