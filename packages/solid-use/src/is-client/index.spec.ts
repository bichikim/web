/**
 * @vitest-environment jsdom
 */
import {useIsClient} from './'
import {describe, expect, it} from 'vitest'
import {createRoot, createSignal, onMount} from 'solid-js'

describe('useIsClient', () => {
  it('should return true in browser environment', () => {
    const {dispose, isClient, isMounted} = createRoot((dispose) => {
      const isClient = useIsClient()
      const [isMounted, setIsMounted] = createSignal(false)

      expect(isClient()).toBe(true)

      onMount(() => {
        setIsMounted(true)
      })

      return {dispose, isClient, isMounted}
    })

    expect(isClient()).toBe(true)
    expect(isMounted()).toBe(true)
    dispose()
  })
})
