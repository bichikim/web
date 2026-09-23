/** @vitest-environment jsdom */

import {render, screen} from '@solidjs/testing-library'
import {describe, expect, test} from 'vitest'

import {TimelineDopesheet} from '../TimelineDopesheet'

describe('TimelineDopesheet', () => {
  test('should expose the complete frame count for fixed-width timeline cells', () => {
    render(() => (
      <TimelineDopesheet
        currentTime={0}
        duration={9}
        framesPerSecond={24}
        selection={null}
        tracks={[]}
        values={{}}
      />
    ))

    expect(
      screen
        .getByRole('group', {name: '키프레임 타임라인'})
        .style.getPropertyValue('--timeline-frame-count'),
    ).toBe('216')
  })
})
