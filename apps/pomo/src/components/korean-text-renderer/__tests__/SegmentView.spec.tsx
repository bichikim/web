/** @vitest-environment jsdom */

import {render, screen} from '@solidjs/testing-library'
import {afterEach, expect, it, vi} from 'vitest'

import {KoreanTextSegmentView} from '../SegmentView'

afterEach(() => {
  vi.useRealTimers()
})

it('should render visible Korean text directly', () => {
  render(() => <KoreanTextSegmentView segment={{kind: 'text', text: '완성된 답변'}} />)

  expect(screen.getByText('완성된 답변')).toBeDefined()
  expect(screen.queryByRole('status')).toBeNull()
})

it('should animate and dispose the concealed refinement indicator', () => {
  vi.useFakeTimers()
  const clearInterval = vi.spyOn(window, 'clearInterval')
  const result = render(() => (
    <KoreanTextSegmentView segment={{kind: 'refining', text: '숨겨진 답변'}} />
  ))

  expect(screen.getByRole('status', {name: '답변을 수정하는 중'}).textContent).toBe('뷁뚱')
  vi.advanceTimersByTime(120)
  expect(screen.getByRole('status').textContent).toBe('휵쟝')

  result.unmount()
  expect(clearInterval).toHaveBeenCalledOnce()
})
