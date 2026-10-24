/**
 * @vitest-environment jsdom
 */
import {render, screen} from '@solidjs/testing-library'
import {beforeEach, describe, expect, it, vi} from 'vitest'
import {LottieFile} from '../LottieFile'

const dotLottieMocks = vi.hoisted(() => ({
  addEventListener: vi.fn(),
  destroy: vi.fn(),
  pause: vi.fn(),
  play: vi.fn(),
  removeEventListener: vi.fn(),
  setLoop: vi.fn(),
  setSpeed: vi.fn(),
}))

vi.mock('@lottiefiles/dotlottie-web', () => ({
  DotLottie: class {
    static setWasmUrl = vi.fn()
    addEventListener = dotLottieMocks.addEventListener
    destroy = dotLottieMocks.destroy
    pause = dotLottieMocks.pause
    play = dotLottieMocks.play
    removeEventListener = dotLottieMocks.removeEventListener
    setLoop = dotLottieMocks.setLoop
    setSpeed = dotLottieMocks.setSpeed
  },
}))

describe('LottieFile', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should mount its canvas before the animation is ready', () => {
    const {container, unmount} = render(() => (
      <LottieFile src="/animation.lottie" fallback="Loading" />
    ))

    expect(container.querySelector('canvas')).not.toBeNull()
    expect(screen.getByText('Loading')).toBeInTheDocument()
    unmount()
  })

  it('should hide the fallback on ready and destroy the animation on cleanup', () => {
    const onDataReady = vi.fn()
    const {unmount} = render(() => (
      <LottieFile src="/animation.lottie" fallback="Loading" onDataReady={onDataReady} />
    ))
    const readyCall = dotLottieMocks.addEventListener.mock.calls.find(
      ([event]) => event === 'ready',
    )

    const readyListener = readyCall?.[1] as (() => void) | undefined
    readyListener?.()

    expect(screen.queryByText('Loading')).not.toBeInTheDocument()
    expect(onDataReady).toHaveBeenCalledTimes(1)

    unmount()
    expect(dotLottieMocks.destroy).toHaveBeenCalled()
  })
})
