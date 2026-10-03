/** @vitest-environment jsdom */

import {configureStudio, renderStudio, setupStudio} from '../components/__tests__/p-studio/setup'
import {fireEvent, screen} from '@solidjs/testing-library'
import {afterEach, describe, expect, it, vi} from 'vitest'

describe('PStudio motion input after remount', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.useRealTimers()
  })

  it('should keep drag motion input after the studio unmounts and remounts', () => {
    setupStudio()
    configureStudio({entrySession: true, gyroscope: true, isReady: true, styleReady: true})

    const firstMount = renderStudio()

    fireEvent.click(screen.getByRole('button', {name: '장면 로드 완료'}))
    fireEvent.click(screen.getByRole('button', {name: '드래그'}))
    expect(screen.getByText('장면 로드 완료').parentElement).toHaveAttribute(
      'data-motion-input',
      'drag',
    )

    firstMount.unmount()
    renderStudio()

    fireEvent.click(screen.getByRole('button', {name: '장면 로드 완료'}))
    expect(screen.getByText('장면 로드 완료').parentElement).toHaveAttribute(
      'data-motion-input',
      'drag',
    )
  })
})
