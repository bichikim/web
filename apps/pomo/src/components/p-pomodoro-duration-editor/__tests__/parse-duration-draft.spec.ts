import {describe, expect, it} from 'vitest'
import {type DurationDraft, parseDurationDraft} from '../parse-duration-draft'

const DRAFT: DurationDraft = {
  focus: '25',
  longBreak: '15',
  sessions: '4',
  shortBreak: '5',
}

describe('parseDurationDraft', () => {
  it('should convert minutes and sessions without changing the draft', () => {
    const draft = Object.freeze({...DRAFT})
    const config = parseDurationDraft(draft)

    expect(config).toEqual({
      focusSeconds: 1500,
      focusSessionsPerCycle: 4,
      longBreakSeconds: 900,
      shortBreakSeconds: 300,
    })
    expect(parseDurationDraft(draft)).not.toBe(config)
    expect(draft).toEqual(DRAFT)
  })

  it('should normalize fullwidth digits at the inclusive bounds', () => {
    expect(
      parseDurationDraft({focus: '１', longBreak: '１２０', sessions: '１２', shortBreak: '１'}),
    ).toEqual({
      focusSeconds: 60,
      focusSessionsPerCycle: 12,
      longBreakSeconds: 7200,
      shortBreakSeconds: 60,
    })
  })

  it('should preserve the existing Number syntax for valid integer values', () => {
    expect(
      parseDurationDraft({focus: '1e1', longBreak: '0xF', sessions: '0x5', shortBreak: ' ＋５ '}),
    ).toEqual({
      focusSeconds: 600,
      focusSessionsPerCycle: 5,
      longBreakSeconds: 900,
      shortBreakSeconds: 300,
    })
  })

  it.each([
    {field: 'focus', value: ''},
    {field: 'focus', value: '1.5'},
    {field: 'focus', value: '０'},
    {field: 'longBreak', value: '121'},
    {field: 'longBreak', value: 'NaN'},
    {field: 'longBreak', value: 'Infinity'},
    {field: 'shortBreak', value: '−１'},
    {field: 'shortBreak', value: '1,000'},
    {field: 'sessions', value: ' '},
    {field: 'sessions', value: '1.5'},
    {field: 'sessions', value: '１３'},
    {field: 'sessions', value: 'Infinity'},
  ] as const)('should reject $field=$value without a partial config', ({field, value}) => {
    expect(parseDurationDraft({...DRAFT, [field]: value})).toBeNull()
  })

  it.each(['25', '0'])('should read every field in order when focus is %s', (focus) => {
    const reads: string[] = []
    const draft: DurationDraft = {
      get focus() {
        reads.push('focus')
        return focus
      },
      get longBreak() {
        reads.push('longBreak')
        return '15'
      },
      get sessions() {
        reads.push('sessions')
        return '4'
      },
      get shortBreak() {
        reads.push('shortBreak')
        return '5'
      },
    }

    expect(parseDurationDraft(draft) === null).toBe(focus === '0')
    expect(reads).toEqual(['focus', 'longBreak', 'sessions', 'shortBreak'])
  })

  it('should propagate the original read error after an invalid earlier field', () => {
    const cause = new Error('draft read failed')
    const reads: string[] = []
    const draft: DurationDraft = {
      get focus() {
        reads.push('focus')
        return '0'
      },
      get longBreak(): string {
        reads.push('longBreak')
        throw cause
      },
      get sessions() {
        reads.push('sessions')
        return '4'
      },
      get shortBreak() {
        reads.push('shortBreak')
        return '5'
      },
    }

    let thrown: unknown
    try {
      parseDurationDraft(draft)
    } catch (error) {
      thrown = error
    }
    expect(thrown).toBe(cause)
    expect(reads).toEqual(['focus', 'longBreak'])
  })
})
