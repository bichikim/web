import {createRoot, createSignal} from 'solid-js'
import {describe, expect, it} from 'vitest'
import {TREE_ROW_HEIGHT, useVirtualTree} from '../use-virtual-tree'

describe('useVirtualTree', () => {
  it('should keep rendering bounded and expose keyboard destinations beyond 10000 entries', () => {
    createRoot((dispose) => {
      const paths = Array.from({length: 20000}, (_, index) => `file-${index}.ts`)
      const element = document.createElement('div')
      const viewport = useVirtualTree({
        current: () => '',
        element: () => element,
        paths: () => paths,
      })
      expect(viewport.paths().length).toBeLessThan(50)
      expect(viewport.paths()).not.toContain('file-19999.ts')
      viewport.reveal('file-19999.ts')
      expect(element.scrollTop).toBeGreaterThan(10000 * TREE_ROW_HEIGHT)
      expect(viewport.paths()).toContain('file-19999.ts')
      expect(viewport.paths().length).toBeLessThan(50)
      viewport.reveal('file-0.ts')
      expect(viewport.paths()).toContain('file-0.ts')
      dispose()
    })
  })
  it('should retain the active row while scrolling without rendering the intervening rows', () => {
    createRoot((dispose) => {
      const paths = Array.from({length: 20000}, (_, index) => `${index}`)
      const element = document.createElement('div')
      const viewport = useVirtualTree({
        active: () => '0',
        current: () => '',
        element: () => element,
        paths: () => paths,
      })
      viewport.reveal('19999')
      expect(viewport.paths()).toContain('0')
      expect(viewport.paths()).toContain('19999')
      expect(viewport.paths().length).toBeLessThan(50)
      expect(viewport.gap(viewport.paths()[1])).toBeGreaterThan(10000 * TREE_ROW_HEIGHT)
      dispose()
    })
  })
  it('should remove blank space when a scrolled subtree collapses', () => {
    createRoot((dispose) => {
      const [paths, setPaths] = createSignal(Array.from({length: 1000}, (_, index) => `${index}`))
      const viewport = useVirtualTree({
        current: () => '',
        element: () => document.createElement('div'),
        paths,
      })
      viewport.reveal('999')
      setPaths(['root'])
      expect(viewport.paths()).toEqual(['root'])
      expect(viewport.top()).toBe(0)
      expect(viewport.bottom()).toBe(0)
      dispose()
    })
  })
})
