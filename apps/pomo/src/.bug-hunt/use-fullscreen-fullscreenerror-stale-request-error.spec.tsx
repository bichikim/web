/** @vitest-environment jsdom */

import {render, waitFor} from '@solidjs/testing-library'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

import {useFullscreen} from 'src/hooks/use-fullscreen'

interface HarnessProps {
  readonly onController: (controller: ReturnType<typeof useFullscreen>) => void
}

const Harness = (props: HarnessProps) => {
  props.onController(useFullscreen())
  return null
}

describe('useFullscreen fullscreenerror handling', () => {
  let fullscreenElement: Element | null
  let requestFullscreen: ReturnType<typeof vi.fn>
  let exitFullscreen: ReturnType<typeof vi.fn>

  beforeEach(() => {
    fullscreenElement = null
    requestFullscreen = vi.fn(async () => {
      fullscreenElement = document.documentElement
      document.dispatchEvent(new Event('fullscreenchange'))
    })
    exitFullscreen = vi.fn(async () => {
      fullscreenElement = null
      document.dispatchEvent(new Event('fullscreenchange'))
    })
    Object.defineProperties(document, {
      exitFullscreen: {configurable: true, value: exitFullscreen},
      fullscreenElement: {configurable: true, get: () => fullscreenElement},
      fullscreenEnabled: {configurable: true, value: true},
    })
    Object.defineProperty(document.documentElement, 'requestFullscreen', {
      configurable: true,
      value: requestFullscreen,
    })
  })

  afterEach(() => {
    Reflect.deleteProperty(document, 'exitFullscreen')
    Reflect.deleteProperty(document, 'fullscreenElement')
    Reflect.deleteProperty(document, 'fullscreenEnabled')
    Reflect.deleteProperty(document.documentElement, 'requestFullscreen')
    vi.restoreAllMocks()
  })

  const renderController = async () => {
    let controller: ReturnType<typeof useFullscreen> | undefined
    render(() => <Harness onController={(next) => (controller = next)} />)
    await waitFor(() => expect(controller?.availability()).toBe('supported'))
    return () => controller
  }

  it('should not surface enter-failed before the user requests fullscreen', async () => {
    const getController = await renderController()
    expect(getController()?.error()).toBeNull()

    document.dispatchEvent(new Event('fullscreenerror'))

    expect(getController()?.error()).toBeNull()
  })

  it('should not surface exit-failed after a successful enter and exit cycle', async () => {
    const getController = await renderController()
    getController()?.onEnabledChange(true)
    await waitFor(() => expect(getController()?.isRequestPending()).toBe(false))
    getController()?.onEnabledChange(false)
    await waitFor(() => expect(getController()?.isRequestPending()).toBe(false))
    expect(getController()?.error()).toBeNull()

    document.dispatchEvent(new Event('fullscreenerror'))

    expect(getController()?.error()).toBeNull()
  })
})
