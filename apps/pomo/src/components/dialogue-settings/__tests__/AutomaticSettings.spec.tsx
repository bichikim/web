/** @vitest-environment jsdom */

import {fireEvent, render, screen, waitFor} from '@solidjs/testing-library'
import {
  AUTOMATIC_DIALOGUE_SETTINGS_CHANGED_EVENT,
  type AutomaticDialogueSettingsRepository,
  type AutomaticDialogueSettings as AutomaticDialogueSettingsValue,
} from '../../../features/focus-room-dialogue'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {For} from 'solid-js'
import {AutomaticDialogueSettings} from '../AutomaticSettings'

const mocks = vi.hoisted(() => ({createRepository: vi.fn()}))

vi.mock('../../../features/focus-room-dialogue/automatic-dialogue-settings', () => ({
  createAutomaticDialogueSettingsRepository: mocks.createRepository,
}))
vi.mock('../../PSelect', () => ({
  PSelect: (props: {
    readonly accessibleLabel?: string
    readonly label: string
    readonly onChange: (value: string) => void
    readonly options: ReadonlyArray<{readonly label: string; readonly value: string}>
    readonly value: string
  }) => (
    <label>
      {props.label}
      <select
        aria-label={props.accessibleLabel}
        onChange={(event) => props.onChange(event.currentTarget.value)}
        value={props.value}
      >
        <For each={props.options}>
          {(option) => <option value={option.value}>{option.label}</option>}
        </For>
      </select>
    </label>
  ),
}))

const createRepository = (
  overrides: Partial<AutomaticDialogueSettingsRepository> = {},
): AutomaticDialogueSettingsRepository => ({
  load: vi.fn(
    () => ({modelId: 'full', version: 1, voiceId: 'Yuna'}) satisfies AutomaticDialogueSettingsValue,
  ),
  save: vi.fn(),
  ...overrides,
})

describe('AutomaticDialogueSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should load saved defaults and persist model and voice changes', async () => {
    const repository = createRepository()
    const changed = vi.fn()
    window.addEventListener(AUTOMATIC_DIALOGUE_SETTINGS_CHANGED_EVENT, changed)
    mocks.createRepository.mockReturnValue(repository)

    render(() => <AutomaticDialogueSettings />)

    expect(screen.getByText('설정 불러오는 중')).toBeInTheDocument()
    const model = await screen.findByRole('combobox', {name: '자동 음성 생성 모델'})
    const voice = screen.getByRole('combobox', {name: '자동 음성 생성 목소리'})
    expect(model).toHaveValue('full')
    expect(voice).toHaveValue('Yuna')

    fireEvent.change(model, {target: {value: 'int8'}})
    fireEvent.change(voice, {target: {value: 'Hana'}})

    expect(repository.save).toHaveBeenNthCalledWith(1, {
      modelId: 'int8',
      version: 1,
      voiceId: 'Yuna',
    })
    expect(repository.save).toHaveBeenNthCalledWith(2, {
      modelId: 'int8',
      version: 1,
      voiceId: 'Hana',
    })
    expect(changed).toHaveBeenCalledTimes(2)
    expect(screen.getByRole('status')).toHaveTextContent('자동 음성 생성 설정을 저장했어요.')
    window.removeEventListener(AUTOMATIC_DIALOGUE_SETTINGS_CHANGED_EVENT, changed)
  })

  it('should explain save failures after settings finish loading', async () => {
    const failure = new Error('storage unavailable')
    const repository = createRepository({
      save: vi.fn(() => {
        throw failure
      }),
    })
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    mocks.createRepository.mockReturnValue(repository)

    render(() => <AutomaticDialogueSettings />)
    const model = await screen.findByRole('combobox', {name: '자동 음성 생성 모델'})
    fireEvent.change(model, {target: {value: 'int8'}})

    expect(consoleError).toHaveBeenCalledWith(
      'Failed to save automatic dialogue settings.',
      failure,
    )
    expect(screen.getByRole('status')).toHaveTextContent('자동 음성 생성 설정을 저장하지 못했어요.')
  })

  it('should allow visible controls to explain a failed settings initialization', async () => {
    const failure = new Error('settings unavailable')
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    mocks.createRepository.mockImplementation(() => {
      throw failure
    })

    render(() => <AutomaticDialogueSettings />)
    const model = await screen.findByRole('combobox', {name: '자동 음성 생성 모델'})

    expect(consoleError).toHaveBeenCalledWith(
      'Failed to load automatic dialogue settings.',
      failure,
    )
    expect(screen.getByRole('status')).toHaveTextContent('자동 음성 생성 설정을 불러오지 못했어요.')
    fireEvent.change(model, {target: {value: 'full'}})
    expect(screen.getByRole('status')).toHaveTextContent(
      '자동 음성 생성 설정이 아직 준비되지 않았어요.',
    )
  })

  it('should not update state after the settings component is disposed during loading', async () => {
    const repository = createRepository()
    mocks.createRepository.mockReturnValue(repository)
    const view = render(() => <AutomaticDialogueSettings />)

    view.unmount()

    await waitFor(() => {
      expect(mocks.createRepository).toHaveBeenCalledOnce()
    })
    expect(repository.load).not.toHaveBeenCalled()
  })

  it('should ignore a loading failure after the settings component has been disposed', async () => {
    const failure = new Error('late settings failure')
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    mocks.createRepository.mockImplementation(() => {
      throw failure
    })
    const view = render(() => <AutomaticDialogueSettings />)

    view.unmount()

    await waitFor(() => {
      expect(mocks.createRepository).toHaveBeenCalledOnce()
    })
    expect(consoleError).toHaveBeenCalledWith(
      'Failed to load automatic dialogue settings.',
      failure,
    )
  })
})
