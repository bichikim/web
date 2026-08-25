/** @vitest-environment jsdom */

import {render} from '@solidjs/testing-library'
import {afterEach, describe, expect, it, vi} from 'vitest'

import type {PDialogue} from '../../../features/focus-room-dialogue/schema'
import {PSelect, type PSelectOption} from '../../PSelect'
import {DialogueConnectionMenu} from '../ConnectionMenu'

vi.mock('../../PSelect', () => ({
  PSelect: vi.fn((props: Parameters<typeof PSelect>[0]) => {
    Object.values(props)
    return null
  }),
}))

const DIALOGUES = [
  {
    audioKey: 'audio-one',
    createdAt: '2026-08-15T00:00:00.000Z',
    durationMs: 61_200,
    id: 'dialogue-one',
    language: 'ko',
    modelId: 'full',
    segments: [{durationMs: 61_200, index: 0, startMs: 0, text: '첫 번째 대화'}],
    text: '첫 번째 대화',
    updatedAt: '2026-08-15T00:00:00.000Z',
    version: 1,
    voiceId: 'Yuna',
  },
  {
    audioKey: 'audio-two',
    createdAt: '2026-08-16T00:00:00.000Z',
    durationMs: 32_400,
    id: 'dialogue-two',
    language: 'ko',
    modelId: 'int8',
    segments: [{durationMs: 32_400, index: 0, startMs: 0, text: '두 번째 대화'}],
    text: '두 번째 대화',
    updatedAt: '2026-08-16T00:00:00.000Z',
    version: 1,
    voiceId: 'Hana',
  },
] satisfies ReadonlyArray<PDialogue>

const latestSelectProps = () => {
  const props = vi.mocked(PSelect).mock.calls.at(-1)?.[0]

  if (props === undefined || !props.multiple) {
    throw new TypeError('Expected the dialogue connection menu to configure a multiple PSelect')
  }

  return props
}

afterEach(() => {
  vi.clearAllMocks()
})

describe('DialogueConnectionMenu', () => {
  it('should expose an empty disabled dialogue connection menu', () => {
    const getMetadata = vi.fn()
    const onChange = vi.fn()

    render(() => (
      <DialogueConnectionMenu
        dialogues={[]}
        disabled
        getMetadata={getMetadata}
        onChange={onChange}
        selectedDialogueIds={[]}
      />
    ))
    const props = latestSelectProps()

    expect(props).toMatchObject({
      accessibleLabel: '대화 연결',
      appearance: 'detailed',
      clearLabel: '모두 연결 해제',
      disabled: true,
      hideLabel: true,
      label: '대화 연결',
      multiple: true,
      options: [],
      placeholder: '대화 없음',
      value: [],
    })
    expect(props.selectionLabel?.([])).toBe('0개 대화 연결됨')
    expect(getMetadata).not.toHaveBeenCalled()
  })

  it('should map selectable dialogues and forward selected ids', () => {
    const getMetadata = vi.fn(
      (dialogue: PDialogue) => `${dialogue.voiceId} · ${dialogue.durationMs}`,
    )
    const onChange = vi.fn()

    render(() => (
      <DialogueConnectionMenu
        accessibleLabel="집중 시작 대화 연결"
        dialogues={DIALOGUES}
        disabled={false}
        getMetadata={getMetadata}
        onChange={onChange}
        selectedDialogueIds={[DIALOGUES[0].id]}
      />
    ))
    const props = latestSelectProps()

    expect(props).toMatchObject({
      accessibleLabel: '집중 시작 대화 연결',
      disabled: false,
      options: [
        {
          description: 'Yuna · 61200',
          label: '첫 번째 대화',
          value: 'dialogue-one',
        },
        {
          description: 'Hana · 32400',
          label: '두 번째 대화',
          value: 'dialogue-two',
        },
      ],
      placeholder: '대화 선택',
      value: ['dialogue-one'],
    })
    expect(getMetadata).toHaveBeenNthCalledWith(1, DIALOGUES[0])
    expect(getMetadata).toHaveBeenNthCalledWith(2, DIALOGUES[1])
    expect(props.selectionLabel?.([props.options[0]!])).toBe('첫 번째 대화')
    expect(props.selectionLabel?.(props.options)).toBe('2개 대화 연결됨')

    props.onChange(['dialogue-two'])

    expect(onChange).toHaveBeenCalledWith(['dialogue-two'])
  })
})
