/** @vitest-environment jsdom */

import {cleanup, fireEvent, render, screen} from '@solidjs/testing-library'
import {createSignal, getOwner, type Owner, runWithOwner} from 'solid-js'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

import type {EventBindingItem, PDialogue} from '../../../features/focus-room-dialogue'
import {PSelect, type PSelectOption} from '../../p-select/PSelect'
import {DialogueConnectionMenu} from '../ConnectionMenu'
import type {DialogueEventActionDefinition} from '../event-definitions'

vi.mock('../../p-select/PSelect', () => ({
  PSelect: vi.fn(),
}))

const {PSelect: ActualSelect} =
  await vi.importActual<typeof import('../../p-select/PSelect')>('../../p-select/PSelect')
let selectOwner: Owner | null = null

const ACTIONS = [
  {
    description: '현재 음악을 일시 정지해요.',
    icon: 'i-tabler-player-stop',
    id: 'music-stop',
    label: '음악 종료',
  },
  {
    description: '모든 효과음을 멈춰요.',
    icon: 'i-tabler-volume-off',
    id: 'sound-effects-stop',
    label: '효과음 모두 끄기',
  },
] satisfies ReadonlyArray<DialogueEventActionDefinition>

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

  return new Proxy(props, {
    get: (target, key, receiver) =>
      runWithOwner(selectOwner, () => Reflect.get(target, key, receiver)),
  })
}

beforeEach(() => {
  vi.mocked(PSelect).mockImplementation(() => {
    selectOwner = getOwner()
    return null
  })
})

afterEach(() => {
  cleanup()
  selectOwner = null
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

  it('should include music and sound-effect actions in the same selection as dialogues', () => {
    const onChange = vi.fn<(items: ReadonlyArray<EventBindingItem>) => void>()

    render(() => (
      <DialogueConnectionMenu
        actions={ACTIONS}
        dialogues={DIALOGUES}
        disabled={false}
        getMetadata={() => 'metadata'}
        onChange={onChange}
        selectedItems={[{id: 'music-stop', type: 'action'}]}
      />
    ))

    const props = latestSelectProps()
    expect(props.options.map((option) => option.value)).toEqual([
      'dialogue:dialogue-one',
      'dialogue:dialogue-two',
      'action:music-stop',
      'action:sound-effects-stop',
    ])
    expect(props.options).toContainEqual({
      description: '현재 음악을 일시 정지해요.',
      icon: 'i-tabler-player-stop',
      label: '음악 종료',
      value: 'action:music-stop',
    })
    expect(props.options).toContainEqual({
      description: '모든 효과음을 멈춰요.',
      icon: 'i-tabler-volume-off',
      label: '효과음 모두 끄기',
      value: 'action:sound-effects-stop',
    })
    expect(props.value).toContain('action:music-stop')

    props.onChange(['action:music-stop'])
    expect(onChange).toHaveBeenCalledWith([{id: 'music-stop', type: 'action'}])
  })

  it.each([
    {actions: undefined, name: 'absent'},
    {actions: [], name: 'empty'},
    {actions: ACTIONS, name: 'available'},
  ])('should choose the placeholder with empty dialogues and $name actions', ({actions}) => {
    const getMetadata = vi.fn()
    render(() => (
      <DialogueConnectionMenu
        actions={actions}
        dialogues={[]}
        disabled={false}
        getMetadata={getMetadata}
        onChange={vi.fn()}
      />
    ))

    const props = latestSelectProps()
    expect(props.placeholder).toBe(
      actions?.length ? '대화 또는 행동 선택' : '연결할 대화 또는 행동 없음',
    )
    expect(props.options).toEqual(
      (actions ?? []).map((action) => ({
        description: action.description,
        icon: action.icon,
        label: action.label,
        value: `action:${action.id}`,
      })),
    )
    expect(getMetadata).not.toHaveBeenCalled()
  })

  it.each([1, 2, 64])(
    'should read the placeholder without building metadata for %i dialogues',
    (count) => {
      const getMetadata = vi.fn(() => 'metadata')
      const dialogues = Array.from({length: count}, (_, index) => ({
        ...DIALOGUES[0],
        id: `dialogue-${index}`,
      }))
      vi.mocked(PSelect).mockImplementationOnce((props) => {
        expect(props.placeholder).toBe('대화 또는 행동 선택')
        expect(props.placeholder).toBe('대화 또는 행동 선택')
        expect(getMetadata.mock.calls.length).toBe(0)
        expect(props.options).toHaveLength(count)
        expect(getMetadata).toHaveBeenCalledTimes(count)
        return null
      })
      render(() => (
        <DialogueConnectionMenu
          dialogues={dialogues}
          disabled={false}
          getMetadata={getMetadata}
          onChange={vi.fn()}
        />
      ))
    },
  )

  it('should retain legacy selection fallback and filter invalid decoded values in order', () => {
    const onChange = vi.fn()
    const [selected, setSelected] = createSignal<ReadonlyArray<EventBindingItem>>()
    render(() => (
      <DialogueConnectionMenu
        actions={ACTIONS}
        dialogues={DIALOGUES}
        disabled={false}
        getMetadata={() => 'metadata'}
        onChange={onChange}
        selectedDialogueIds={['dialogue-two']}
        selectedItems={selected()}
      />
    ))

    const props = latestSelectProps()
    expect(props.value).toEqual(['dialogue:dialogue-two'])
    setSelected([{id: 'music-stop', type: 'action'}])
    expect(props.value).toEqual(['action:music-stop'])
    setSelected([])
    expect(props.value).toEqual([])
    props.onChange([
      'action:music-stop',
      'unknown',
      'dialogue:',
      'action:unknown',
      'action:',
      'dialogue:dialogue-one',
    ])
    expect(onChange).toHaveBeenLastCalledWith([
      {id: 'music-stop', type: 'action'},
      {id: 'dialogue-one', type: 'dialogue'},
    ])
    props.onChange([])
    expect(onChange).toHaveBeenLastCalledWith([])
  })

  it('should read updated option contents, metadata and change callbacks from props', () => {
    const [dialogues, setDialogues] = createSignal<ReadonlyArray<PDialogue>>(DIALOGUES)
    const [actions, setActions] =
      createSignal<ReadonlyArray<DialogueEventActionDefinition>>(ACTIONS)
    const [getMetadata, setMetadata] = createSignal<(dialogue: PDialogue) => string>(
      (dialogue) => dialogue.voiceId,
    )
    const firstChange = vi.fn()
    const nextChange = vi.fn()
    const [onChange, setChange] = createSignal(firstChange)
    render(() => (
      <DialogueConnectionMenu
        actions={actions()}
        dialogues={dialogues()}
        disabled={false}
        getMetadata={getMetadata()}
        onChange={onChange()}
      />
    ))

    const props = latestSelectProps()
    setDialogues([{...DIALOGUES[1], text: '수정한 대화'}])
    setActions([{...ACTIONS[1], label: '수정한 행동'}])
    setMetadata(() => (dialogue: PDialogue) => `updated ${dialogue.durationMs}`)
    expect(props.options).toEqual([
      {description: 'updated 32400', label: '수정한 대화', value: 'dialogue:dialogue-two'},
      {
        description: '모든 효과음을 멈춰요.',
        icon: 'i-tabler-volume-off',
        label: '수정한 행동',
        value: 'action:sound-effects-stop',
      },
    ])
    setChange(() => nextChange)
    props.onChange(['action:sound-effects-stop'])
    expect(firstChange).not.toHaveBeenCalled()
    expect(nextChange).toHaveBeenCalledWith([{id: 'sound-effects-stop', type: 'action'}])
  })

  it('should update the real select placeholder and disabled state as lists change', () => {
    vi.mocked(PSelect).mockImplementationOnce(ActualSelect)
    const [dialogues, setDialogues] = createSignal<ReadonlyArray<PDialogue>>([])
    const [actions, setActions] = createSignal<ReadonlyArray<DialogueEventActionDefinition>>()
    const [disabled, setDisabled] = createSignal(true)
    render(() => (
      <DialogueConnectionMenu
        actions={actions()}
        dialogues={dialogues()}
        disabled={disabled()}
        getMetadata={() => 'metadata'}
        onChange={vi.fn()}
      />
    ))

    const trigger = screen.getByRole('button', {
      name: '대화 및 행동 연결 연결할 대화 또는 행동 없음',
    })
    expect(trigger).toBeDisabled()
    expect(trigger).toHaveTextContent('연결할 대화 또는 행동 없음')
    setDialogues(DIALOGUES)
    setDisabled(false)
    expect(trigger).toBeEnabled()
    expect(trigger).toHaveTextContent('대화 또는 행동 선택')
    setDialogues([])
    expect(trigger).toHaveTextContent('연결할 대화 또는 행동 없음')
    setActions(ACTIONS)
    expect(trigger).toHaveTextContent('대화 또는 행동 선택')
    expect(trigger).toHaveAccessibleName('대화 및 행동 연결 대화 또는 행동 선택')
    setDialogues(DIALOGUES)
    setActions([])
    expect(trigger).toHaveTextContent('대화 또는 행동 선택')
    setDialogues([])
    expect(trigger).toHaveTextContent('연결할 대화 또는 행동 없음')
  })

  it('should preserve real select option order, metadata, keyboard selection and clearing', () => {
    vi.mocked(PSelect).mockImplementationOnce(ActualSelect)
    const [selected, setSelected] = createSignal<ReadonlyArray<EventBindingItem>>([])
    const onChange = vi.fn((items: ReadonlyArray<EventBindingItem>) => setSelected(items))
    render(() => (
      <DialogueConnectionMenu
        accessibleLabel="집중 시작 대화 연결"
        actions={ACTIONS}
        dialogues={DIALOGUES}
        disabled={false}
        getMetadata={(dialogue) => `${dialogue.voiceId} · ${dialogue.durationMs}`}
        onChange={onChange}
        selectedItems={selected()}
      />
    ))

    const trigger = screen.getByRole('button', {name: '집중 시작 대화 연결 대화 또는 행동 선택'})
    trigger.focus()
    fireEvent.keyDown(trigger, {key: 'ArrowDown'})
    const options = screen.getAllByRole('option')
    expect(options.map((option) => option.textContent)).toEqual([
      '첫 번째 대화Yuna · 61200',
      '두 번째 대화Hana · 32400',
      '음악 종료현재 음악을 일시 정지해요.',
      '효과음 모두 끄기모든 효과음을 멈춰요.',
    ])
    expect(options[0]).toHaveFocus()
    fireEvent.keyDown(options[0]!, {key: 'Enter'})
    expect(onChange).toHaveBeenLastCalledWith([{id: 'dialogue-one', type: 'dialogue'}])
    expect(trigger).toHaveTextContent('첫 번째 대화')
    fireEvent.keyDown(options[0]!, {key: 'End'})
    expect(options[3]).toHaveFocus()
    fireEvent.keyDown(options[3]!, {key: 'Enter'})
    expect(onChange).toHaveBeenLastCalledWith([
      {id: 'dialogue-one', type: 'dialogue'},
      {id: 'sound-effects-stop', type: 'action'},
    ])
    expect(trigger).toHaveTextContent('2개 대화/행동 연결됨')
    fireEvent.click(screen.getByRole('button', {name: '모두 연결 해제'}))
    expect(onChange).toHaveBeenLastCalledWith([])
    expect(trigger).toHaveTextContent('대화 또는 행동 선택')
    fireEvent.keyDown(options[3]!, {key: 'Escape'})
  })
})
