/**
 * Vitest setupFiles 엔트리.
 * 각 테스트 파일 실행 전에 한 번 로드되며, jest-dom matcher 확장과
 * Solid Testing Library DOM cleanup을 전역으로 적용한다.
 */
import '@testing-library/jest-dom/vitest'
import {cleanup} from '@solidjs/testing-library'
import {afterEach, beforeEach, vi} from 'vitest'

const RGBA_CHANNEL_COUNT = 4

const installBrowserMocks = () => {
  const canvasContext = {
    drawImage: vi.fn(),
    fillRect: vi.fn(),
    getImageData: vi.fn(() => ({data: new Uint8ClampedArray(RGBA_CHANNEL_COUNT)})),
  }

  if (typeof HTMLCanvasElement !== 'undefined') {
    Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
      configurable: true,
      value: vi.fn((contextId: string) =>
        contextId === '2d' ? (canvasContext as unknown as CanvasRenderingContext2D) : null,
      ),
      writable: true,
    })
  }

  if (typeof HTMLMediaElement !== 'undefined') {
    Object.defineProperty(HTMLMediaElement.prototype, 'pause', {
      configurable: true,
      value: vi.fn(() => undefined),
      writable: true,
    })
    Object.defineProperty(HTMLMediaElement.prototype, 'load', {
      configurable: true,
      value: vi.fn(() => undefined),
      writable: true,
    })
  }

  if (typeof window !== 'undefined') {
    Object.defineProperty(window, 'scrollTo', {
      configurable: true,
      value: vi.fn(() => undefined),
      writable: true,
    })
  }
}

installBrowserMocks()

beforeEach(() => {
  installBrowserMocks()
})

if (typeof document !== 'undefined') {
  document.cookie = 'PARAGLIDE_LOCALE=ko; path=/'
}

// render()로 남은 컴포넌트·DOM이 다음 테스트로 새지 않게 한다.
afterEach(() => {
  cleanup()
})
