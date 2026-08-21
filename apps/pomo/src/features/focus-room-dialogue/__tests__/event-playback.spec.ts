import {describe, expect, it} from 'vitest'

import {selectEventDialogues} from '../event-playback'

const DIALOGUE_IDS = ['first', 'second', 'third'] as const

describe('selectEventDialogues', () => {
  it('should preserve the selected order in sequential-all mode', () => {
    expect(
      selectEventDialogues({dialogueIds: DIALOGUE_IDS, playbackMode: 'sequential-all'}),
    ).toEqual(DIALOGUE_IDS)
  })

  it('should play every dialogue in a randomized order in random-all mode', () => {
    const randomValues = [0, 0.5]

    expect(
      selectEventDialogues({
        dialogueIds: DIALOGUE_IDS,
        playbackMode: 'random-all',
        random: () => randomValues.shift() ?? 0,
      }),
    ).toEqual(['third', 'second', 'first'])
  })

  it('should select one dialogue in random-one mode', () => {
    expect(
      selectEventDialogues({
        dialogueIds: DIALOGUE_IDS,
        playbackMode: 'random-one',
        random: () => 0.5,
      }),
    ).toEqual(['second'])
  })

  it('should keep random-one mode empty when an event has no dialogues', () => {
    expect(
      selectEventDialogues({dialogueIds: [], playbackMode: 'random-one', random: () => 0}),
    ).toEqual([])
  })
})
