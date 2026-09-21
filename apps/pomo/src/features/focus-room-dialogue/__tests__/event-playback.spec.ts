/** @vitest-environment node */
import {describe, expect, it, vi} from 'vitest'

import {selectDialogueIdsForEvents, selectEventDialogues} from '../event-playback'

const DIALOGUE_IDS = ['first', 'second', 'third'] as const
const FAREWELL_DIALOGUE_IDS = ['farewell-0', 'farewell-1', 'farewell-2'] as const
const BREAK_DIALOGUE_IDS = Array.from({length: 35}, (_, index) => `break-${index}`)

describe('selectEventDialogues', () => {
  it('should preserve the selected order in sequential-all mode', () => {
    expect(
      selectEventDialogues({dialogueIds: DIALOGUE_IDS, playbackMode: 'sequential-all'}),
    ).toEqual(DIALOGUE_IDS)
  })

  it('should keep only the latest dialogue IDs when a selection limit is provided', () => {
    expect(
      selectEventDialogues({
        dialogueIds: DIALOGUE_IDS,
        maxLatestDialogueIds: 2,
        playbackMode: 'sequential-all',
      }),
    ).toEqual(['second', 'third'])
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

  it('should choose random-one from the latest dialogue IDs when limited', () => {
    expect(
      selectEventDialogues({
        dialogueIds: DIALOGUE_IDS,
        maxLatestDialogueIds: 2,
        playbackMode: 'random-one',
        random: () => 0,
      }),
    ).toEqual(['second'])
  })

  it('should keep random-one mode empty when an event has no dialogues', () => {
    expect(
      selectEventDialogues({dialogueIds: [], playbackMode: 'random-one', random: () => 0}),
    ).toEqual([])
  })

  it('should use the platform random source when none is provided', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)

    expect(selectEventDialogues({dialogueIds: DIALOGUE_IDS, playbackMode: 'random-all'})).toEqual([
      'second',
      'third',
      'first',
    ])
    expect(selectEventDialogues({dialogueIds: DIALOGUE_IDS, playbackMode: 'random-one'})).toEqual([
      'first',
    ])
  })

  it('should preserve an unexpected playback mode at the exhaustive fallback', () => {
    expect(
      selectEventDialogues({
        dialogueIds: DIALOGUE_IDS,
        playbackMode: 'unexpected' as never,
      }),
    ).toBe('unexpected')
  })
})

describe('selectDialogueIdsForEvents', () => {
  it('should preserve earlier event dialogues when a later event exceeds the selection limit', () => {
    expect(
      selectDialogueIdsForEvents(
        ['focus-end', 'break-start'],
        {
          'break-start': BREAK_DIALOGUE_IDS,
          'focus-end': FAREWELL_DIALOGUE_IDS,
        },
        {'break-start': 'sequential-all', 'focus-end': 'sequential-all'},
        32,
      ),
    ).toEqual([...FAREWELL_DIALOGUE_IDS, ...BREAK_DIALOGUE_IDS.slice(-29)])
  })
})
