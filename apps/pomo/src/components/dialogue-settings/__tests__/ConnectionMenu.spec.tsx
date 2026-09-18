/** @vitest-environment jsdom */

import {render} from '@solidjs/testing-library'
import {afterEach, describe, expect, it, vi} from 'vitest'

import type {EventBindingItem, PDialogue} from '../../../features/focus-room-dialogue'
import {PSelect, type PSelectOption} from '../../p-select/PSelect'
import {DialogueConnectionMenu} from '../ConnectionMenu'

vi.mock('../../p-select/PSelect', () => ({
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
        selectedItems={[]}
      />
    ))
    const props = latestSelectProps()

    expect(props).toMatchObject({
      accessibleLabel: '대화 및 행동 연결',
      appearance: 'detailed',
      clearLabel: '모두 연결 해제',
      disabled: true,
      hideLabel: true,
      label: '대화 및 행동 연결',
      multiple: true,
      options: [],
      placeholder: '연결할 대화 또는 행동 없음',
      value: [],
    })
    expect(props.selectionLabel?.([])).toBe('0개 대화/행동 연결됨')
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
        selectedItems={[{id: DIALOGUES[0].id, type: 'dialogue'}]}
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
          value: 'dialogue:dialogue-one',
        },
        {
          description: 'Hana · 32400',
          label: '두 번째 대화',
          value: 'dialogue:dialogue-two',
        },
      ],
      placeholder: '대화 또는 행동 선택',
      value: ['dialogue:dialogue-one'],
    })
    expect(getMetadata).toHaveBeenNthCalledWith(1, DIALOGUES[0])
    expect(getMetadata).toHaveBeenNthCalledWith(2, DIALOGUES[1])
    expect(props.selectionLabel?.([props.options[0]!])).toBe('첫 번째 대화')
    expect(props.selectionLabel?.([undefined as unknown as PSelectOption<string>])).toBe(
      '대화 또는 행동 선택',
    )
    expect(props.selectionLabel?.(props.options)).toBe('2개 대화/행동 연결됨')

    props.onChange(['dialogue:dialogue-two'])

    expect(onChange).toHaveBeenCalledWith([{id: 'dialogue-two', type: 'dialogue'}])
  })

  it('should include music actions in the same selection as dialogues', () => {
    const onChange = vi.fn<(items: ReadonlyArray<EventBindingItem>) => void>()

    render(() => (
      <DialogueConnectionMenu
        actions={[
          {
            description: '현재 음악을 일시 정지해요.',
            icon: 'i-tabler-player-stop',
            id: 'music-stop',
            label: '음악 종료',
          },
        ]}
        dialogues={DIALOGUES}
        disabled={false}
        getMetadata={() => 'metadata'}
        onChange={onChange}
        selectedItems={[{id: 'music-stop', type: 'action'}]}
      />
    ))

    const props = latestSelectProps()
    expect(props.options).toContainEqual({
      description: '현재 음악을 일시 정지해요.',
      icon: 'i-tabler-player-stop',
      label: '음악 종료',
      value: 'action:music-stop',
    })
    expect(props.value).toContain('action:music-stop')

    props.onChange(['action:music-stop'])
    expect(onChange).toHaveBeenCalledWith([{id: 'music-stop', type: 'action'}])
  })
})
