/**
 * @vitest-environment jsdom
 */
import {render, waitFor} from '@solidjs/testing-library'
import {beforeEach, describe, expect, it, vi} from 'vitest'
import {LottieJson} from '../LottieJson'

const lottieMocks = vi.hoisted(() => ({
  addEventListener: vi.fn(),
  destroy: vi.fn(),
  loadAnimation: vi.fn(),
  pause: vi.fn(),
  play: vi.fn(),
  removeEventListener: vi.fn(),
  setLoop: vi.fn(),
  setSpeed: vi.fn(),
}))

vi.mock('lottie-web/build/player/esm/lottie_light.min.js', () => ({
  default: {
    loadAnimation: lottieMocks.loadAnimation,
  },
}))

describe('LottieJson', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    lottieMocks.loadAnimation.mockReturnValue(lottieMocks)
  })

  it('should load animations through the expression-free light player', async () => {
    const {unmount} = render(() => <LottieJson src="/animation.json" />)

    await waitFor(() => {
      expect(lottieMocks.loadAnimation).toHaveBeenCalledWith(
        expect.objectContaining({renderer: 'svg'}),
      )
    })

    unmount()
    expect(lottieMocks.destroy).toHaveBeenCalled()
  })
})
