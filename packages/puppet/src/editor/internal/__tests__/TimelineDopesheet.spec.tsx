/** @vitest-environment jsdom */

import {fireEvent, render, screen} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, describe, expect, test, vi} from 'vitest'

import {TimelineDopesheet} from '../TimelineDopesheet'
import {createDemoDocument} from '../../../player'
import {getParameterTracks} from '../timeline-keyframe-selection'

afterEach(() => vi.restoreAllMocks())

describe('TimelineDopesheet', () => {
  test('should leave room before the final ruler label when fitting an uneven frame count', () => {
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(1060)
    const document = createDemoDocument()
    const motion = document.motions[0]!
    render(() => (
      <TimelineDopesheet
        currentTime={0}
        duration={8.625}
        framesPerSecond={24}
        motion={motion}
        tracks={getParameterTracks(document, motion)}
        selection={null}
        values={{}}
        zoom="fit"
      />
    ))
    expect(screen.getByText('207f')).toBeVisible()
    expect(screen.getByText('192f')).toBeVisible()
    expect(screen.queryByText('204f')).not.toBeInTheDocument()
  })

  test('should align the final ruler label to durations between frame boundaries', () => {
    const document = createDemoDocument()
    const motion = document.motions[1]!
    render(() => (
      <TimelineDopesheet
        currentTime={0}
        duration={motion.duration}
        framesPerSecond={24}
        motion={motion}
        tracks={getParameterTracks(document, motion)}
        selection={null}
        values={{}}
        zoom="fit"
      />
    ))
    const end = screen.getByText('10f')
    expect(end.style.left).toBe('100%')
    expect(end).toHaveAttribute('data-end', 'true')
  })

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

  test('should scale the timeline without changing its keyframe times or selection', () => {
    const document = createDemoDocument()
    const motion = document.motions[0]!
    const tracks = getParameterTracks(document, motion)
    const track = tracks[0]!
    const keyframe = track.keyframes[1]!
    const onSelect = vi.fn()
    const [zoom, setZoom] = createSignal<number | 'fit'>(100)
    render(() => (
      <TimelineDopesheet
        currentTime={0}
        duration={motion.duration}
        framesPerSecond={24}
        motion={motion}
        selection={{parameterId: track.parameter.id, time: keyframe.time, times: [keyframe.time]}}
        tracks={tracks}
        onKeyframeSelect={onSelect}
        values={{}}
        zoom={zoom()}
      />
    ))
    const timeline = screen.getByRole('group', {name: '키프레임 타임라인'})
    const label = `${track.parameter.name} ${keyframe.time.toFixed(2)}초 키프레임`
    const marker = screen.getByRole('button', {name: label})
    marker.focus()
    expect(timeline.style.getPropertyValue('--timeline-zoom')).toBe('1')
    setZoom(200)
    expect(timeline.style.getPropertyValue('--timeline-zoom')).toBe('2')
    expect(screen.getByRole('button', {name: label, pressed: true})).toBe(marker)
    expect(marker).toHaveFocus()
    setZoom('fit')
    expect(timeline).toHaveAttribute('data-fit', 'true')
    expect(screen.getByRole('button', {name: label, pressed: true})).toBe(marker)
    fireEvent.click(marker)
    expect(onSelect).toHaveBeenCalledWith(track, keyframe, false)
  })
})
