/** @vitest-environment node */
import {afterEach, describe, expect, it, vi} from 'vitest'

import {selectDialogueIdsForEvents, selectEventDialogues} from '../event-playback'

const DIALOGUE_IDS = ['first', 'second', 'third'] as const
const FAREWELL_DIALOGUE_IDS = ['farewell-0', 'farewell-1', 'farewell-2'] as const
const BREAK_DIALOGUE_IDS = Array.from({length: 35}, (_, index) => `break-${index}`)

afterEach(() => {
  vi.restoreAllMocks()
})

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

  it('should keep dialogue IDs in range when random-all receives the upper boundary', () => {
    expect(
      selectEventDialogues({
        dialogueIds: DIALOGUE_IDS,
        playbackMode: 'random-all',
        random: () => 1,
      }),
    ).toEqual(DIALOGUE_IDS)
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

  it('should select the last dialogue when the random value is 1', () => {
    expect(
      selectEventDialogues({
        dialogueIds: DIALOGUE_IDS,
        playbackMode: 'random-one',
        random: () => 1,
      }),
    ).toEqual(['third'])
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
  it('should preserve repeated events, duplicate IDs and input ownership without a limit', () => {
    const eventIds = Object.freeze(['focus-end', 'break-start', 'focus-end'] as const)
    const dialogues = Object.freeze(['same', 'same', 'last'])
    const bindings = Object.freeze({'focus-end': dialogues})
    const modes = Object.freeze({})

    expect(selectDialogueIdsForEvents(eventIds, bindings, modes)).toEqual([
      'same',
      'same',
      'last',
      'same',
      'same',
      'last',
    ])
    expect(eventIds).toEqual(['focus-end', 'break-start', 'focus-end'])
    expect(bindings).toEqual({'focus-end': ['same', 'same', 'last']})
    expect(modes).toEqual({})
  })

  it('should return an empty selection for no events or no bound dialogues', () => {
    expect(selectDialogueIdsForEvents([], {'focus-end': DIALOGUE_IDS}, {})).toEqual([])
    expect(selectDialogueIdsForEvents(['focus-end', 'break-start'], {}, {})).toEqual([])
  })

  it.each([
    {expected: [], limit: 0},
    {expected: [], limit: -1},
    {expected: [...DIALOGUE_IDS, ...FAREWELL_DIALOGUE_IDS], limit: Number.NaN},
    {expected: [...DIALOGUE_IDS, ...FAREWELL_DIALOGUE_IDS], limit: Number.POSITIVE_INFINITY},
    {expected: [], limit: Number.NEGATIVE_INFINITY},
    {expected: [...DIALOGUE_IDS], limit: 0.5},
    {expected: ['third', 'farewell-2'], limit: 1.5},
    {expected: [...DIALOGUE_IDS, 'farewell-2'], limit: 4},
  ])('should retain numeric limit semantics for $limit', ({limit, expected}) => {
    expect(
      selectDialogueIdsForEvents(
        ['focus-end', 'break-start'],
        {'break-start': FAREWELL_DIALOGUE_IDS, 'focus-end': DIALOGUE_IDS},
        {},
        limit,
      ),
    ).toEqual(expected)
  })

  it('should skip sparse event slots and preserve sparse dialogue slots when capped', () => {
    const eventIds: Array<'focus-end'> = Array.from({length: 3}, () => 'focus-end')
    delete eventIds[1]
    const dialogues: string[] = ['first', 'missing', 'last']
    delete dialogues[1]

    expect(selectDialogueIdsForEvents(eventIds, {'focus-end': dialogues}, {}, 4)).toEqual([
      'first',
      undefined,
      'last',
      'last',
    ])
    expect(1 in eventIds).toBe(false)
    expect(1 in dialogues).toBe(false)
  })

  it('should consume random values in event order even after the cap is filled', () => {
    const random = vi
      .spyOn(Math, 'random')
      .mockReturnValueOnce(0.5)
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(1)
    const bindings = Object.freeze({
      'break-start': Object.freeze(['later-0', 'later-1']),
      'focus-end': Object.freeze(['first-0', 'first-1']),
    })

    expect(
      selectDialogueIdsForEvents(
        ['focus-end', 'break-start', 'focus-end'],
        bindings,
        {'break-start': 'random-all', 'focus-end': 'random-one'},
        2,
      ),
    ).toEqual(['first-1', 'later-0'])
    expect(random).toHaveBeenCalledTimes(3)
    expect(bindings).toEqual({
      'break-start': ['later-0', 'later-1'],
      'focus-end': ['first-0', 'first-1'],
    })
  })

  it('should propagate random errors from later events after the cap is filled', () => {
    const error = new Error('random failed')
    const random = vi
      .spyOn(Math, 'random')
      .mockReturnValueOnce(0)
      .mockImplementationOnce(() => {
        throw error
      })

    expect(() =>
      selectDialogueIdsForEvents(
        ['focus-end', 'break-start'],
        {'break-start': FAREWELL_DIALOGUE_IDS, 'focus-end': DIALOGUE_IDS},
        {'break-start': 'random-one', 'focus-end': 'random-one'},
        1,
      ),
    ).toThrow(error)
    expect(random).toHaveBeenCalledTimes(2)
  })

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
