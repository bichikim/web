import {createSignal} from 'solid-js'
import {describe, expect, test, vi} from 'vitest'

import {createDemoDocument} from '../../../player'
import {createTimelineMotionActions} from '../create-timeline-motion-actions'

describe('createTimelineMotionActions', () => {
  test('should preserve the active motion scrub time under its renamed ID', () => {
    const document = createDemoDocument()
    const [motionTimes, setMotionTimes] = createSignal<Readonly<Record<string, number>>>({
      blink: 0.75,
    })
    const applyEdit = vi.fn()
    const actions = createTimelineMotionActions({
      activeMotion: () => document.motions.find((motion) => motion.id === 'blink'),
      applyEdit,
      document: () => document,
      setMotionTimes,
    })

    actions.rename('blink-fast')

    expect(motionTimes()).toEqual({'blink-fast': 0.75})
    expect(applyEdit).toHaveBeenCalledWith(
      expect.objectContaining({selectedMotionId: 'blink-fast'}),
      'single',
    )
  })

  test('should preserve the all-motions scrub time when renaming by ID', () => {
    const document = createDemoDocument()
    const [motionTimes, setMotionTimes] = createSignal<Readonly<Record<string, number>>>({
      blink: 0.75,
      nod: 0.25,
    })
    const applyEdit = vi.fn()
    const actions = createTimelineMotionActions({
      activeMotion: () => document.motions.find((motion) => motion.id === 'blink'),
      applyEdit,
      document: () => document,
      setMotionTimes,
    })

    actions.renameById('blink', 'blink-fast')

    expect(motionTimes()).toEqual({'blink-fast': 0.75, nod: 0.25})
    expect(applyEdit).toHaveBeenCalledWith(
      expect.objectContaining({selectedMotionId: 'blink-fast'}),
      'all',
    )
  })
})
