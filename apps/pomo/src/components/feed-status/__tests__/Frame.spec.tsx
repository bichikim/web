/** @vitest-environment jsdom */

import {render} from '@solidjs/testing-library'
import {expect, it} from 'vitest'

import {FeedStatusFrame} from '../Frame'

it('should match the music player maximum width', () => {
  const {container} = render(() => (
    <FeedStatusFrame>
      <span>피드 상태</span>
    </FeedStatusFrame>
  ))
  const frame = container.querySelector('.pomo-feed-status-frame')

  expect(frame).toHaveClass('w-[min(29rem,_100%)]')
  expect(frame).not.toHaveClass('w-[min(36rem,_100%)]')
})
