/** @vitest-environment node */
import {describe, expect, it} from 'vitest'

import {selectEventDialogues} from '../features/focus-room-dialogue/event-playback'

describe('selectEventDialogues random-all', () => {
  it('should not insert undefined dialogue ids when random() returns 1', () => {
    const dialogueIds = ['first', 'second', 'third']

    expect(
      selectEventDialogues({
        dialogueIds,
        playbackMode: 'random-all',
        random: () => 1,
      }),
    ).toEqual(dialogueIds)
  })
})
