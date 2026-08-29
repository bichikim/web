/** @vitest-environment jsdom */

import {cleanup, fireEvent, render, screen, waitFor} from '@solidjs/testing-library'
import {afterEach, describe, expect, it, vi} from 'vitest'

import {PLayerReview} from '../PLayerReview'

vi.mock('@solidjs/router', () => ({A: vi.fn()}))
vi.mock('../layer-review/Viewport', () => ({PLayerReviewViewport: vi.fn()}))

describe('PLayerReview mouth time mode', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it.each([
    {
      expectedScene: '낮 · 책 읽기 · 사용자 보기',
      scene: '낮 · 책 읽기 · 작업에 집중',
    },
    {
      expectedScene: '밤 · 책 읽기 · 사용자 보기',
      scene: '밤 · 책 읽기 · 작업에 집중',
    },
  ])('should keep the $scene time when selecting an individual mouth frame', async (testCase) => {
    render(() => <PLayerReview />)

    fireEvent.click(screen.getByRole('button', {name: new RegExp(testCase.scene, 'u')}))
    fireEvent.change(screen.getByRole('combobox', {name: /개별 입 이미지/u}), {
      target: {value: 'closed-wide-early'},
    })

    await waitFor(() => {
      expect(screen.getByRole('heading', {level: 1}).textContent).toBe(testCase.expectedScene)
    })
  })
})
