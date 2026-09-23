import {describe, expect, it} from 'vitest'

import {createTimelineMotionActions} from '../../../../packages/puppet/src/editor/internal/create-timeline-motion-actions.ts'
import type {editMotion} from '../../../../packages/puppet/src/editor/internal/edit-motion.ts'
import {createDemoDocument} from '../../../../packages/puppet/src/player/index.ts'
import type {PuppetDocument} from '../../../../packages/puppet/src/player/document.ts'

describe('Puppet editor motionTimes', () => {
  it('should migrate per-motion scrub times when renaming from the single-motion timeline', () => {
    let document: PuppetDocument = createDemoDocument()
    let motionTimes: Readonly<Record<string, number>> = {blink: 0.75}

    const applyEdit = (result: ReturnType<typeof editMotion> | undefined) => {
      if (result !== undefined) {
        document = result.document
      }
    }

    const actions = createTimelineMotionActions({
      activeMotion: () => document.motions.find((motion) => motion.id === 'blink'),
      applyEdit,
      document: () => document,
      motionTimes: () => motionTimes,
      setMotionTimes: (updater) => {
        motionTimes = typeof updater === 'function' ? updater(motionTimes) : updater
      },
    })

    actions.rename('blink-fast')

    expect(motionTimes).toEqual({'blink-fast': 0.75})
  })
})
