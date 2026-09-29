/** @vitest-environment node */
import {describe, expect, it} from 'vitest'

import {selectEventDialogues} from '../features/focus-room-dialogue/event-playback'

describe('selectEventDialogues random-one index overflow', () => {
  it('should not return undefined when random() is 1', () => {
    const result = selectEventDialogues({
      dialogueIds: ['first', 'second', 'third'],
      playbackMode: 'random-one',
      random: () => 1,
    })

    expect(result).toHaveLength(1)
    expect(result[0]).toBeTypeOf('string')
    expect(['first', 'second', 'third']).toContain(result[0])
  })
})
