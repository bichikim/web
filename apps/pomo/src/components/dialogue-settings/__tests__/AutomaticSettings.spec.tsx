/** @vitest-environment jsdom */

import {PreferenceProvider} from 'src/hooks/use-preference'
import {fireEvent, render, screen, waitFor} from '@solidjs/testing-library'
import {For} from 'solid-js'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

import {
  AUTOMATIC_DIALOGUE_SETTINGS_STORAGE_KEY,
  type AutomaticDialogueSettings as AutomaticDialogueSettingsValue,
  DEFAULT_AUTOMATIC_DIALOGUE_SETTINGS,
} from '../../../features/focus-room-dialogue'
import {AutomaticDialogueSettings} from '../AutomaticSettings'

const mocks = vi.hoisted(() => ({
  read: vi.fn(),
  write: vi.fn(),
}))

vi.mock('../../../features/focus-room-dialogue', async () => {
  const actual: typeof import('../../../features/focus-room-dialogue') = await vi.importActual(
    '../../../features/focus-room-dialogue',
  )

  return {
    ...actual,
    createAutomaticDialoguePreferenceOptions: (options = {}) => ({
      ...actual.createAutomaticDialoguePreferenceOptions(options),
      storage: {
        read: () => mocks.read(),
        write: (key: string, value: unknown) => mocks.write(key, value),
      },
    }),
  }
})

vi.mock('../../p-select/PSelect', () => ({
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

function createDeferred<T>() {
  let reject: (reason?: unknown) => void = () => undefined
  let resolve: (value: T) => void = () => undefined
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })

  return {promise, reject, resolve}
}

describe('AutomaticDialogueSettings', () => {
  beforeEach(() => {
    mocks.read.mockResolvedValue(DEFAULT_AUTOMATIC_DIALOGUE_SETTINGS)
    mocks.write.mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.clearAllMocks()
    vi.restoreAllMocks()
  })

  it('should load saved defaults and persist model and voice changes', async () => {
    const storedSettings = {
      modelId: 'full',
      version: 1,
      voiceId: 'Yuna',
    } satisfies AutomaticDialogueSettingsValue
    mocks.read.mockResolvedValue(storedSettings)

    render(() => <AutomaticDialogueSettings />, {wrapper: PreferenceProvider})

    expect(screen.getByText('설정 불러오는 중')).toBeInTheDocument()
    const model = await screen.findByRole('combobox', {name: '자동 음성 생성 모델'})
    const voice = screen.getByRole('combobox', {name: '자동 음성 생성 목소리'})
    expect(model).toHaveValue('full')
    expect(voice).toHaveValue('Yuna')

    fireEvent.change(model, {target: {value: 'int8'}})
    fireEvent.change(voice, {target: {value: 'Hana'}})

    await waitFor(() => expect(mocks.write).toHaveBeenCalledTimes(2))
    expect(mocks.write).toHaveBeenNthCalledWith(1, AUTOMATIC_DIALOGUE_SETTINGS_STORAGE_KEY, {
      modelId: 'int8',
      version: 1,
      voiceId: 'Yuna',
    })
    expect(mocks.write).toHaveBeenNthCalledWith(2, AUTOMATIC_DIALOGUE_SETTINGS_STORAGE_KEY, {
      modelId: 'int8',
      version: 1,
      voiceId: 'Hana',
    })
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('자동 음성 생성 설정을 저장했어요.'),
    )
  })

  it('should expose the stable preference key used by storage writes', async () => {
    render(() => <AutomaticDialogueSettings />, {wrapper: PreferenceProvider})
    const model = await screen.findByRole('combobox', {name: '자동 음성 생성 모델'})

    fireEvent.change(model, {target: {value: 'full'}})

    expect(AUTOMATIC_DIALOGUE_SETTINGS_STORAGE_KEY).toBe('pomo:automatic-dialogue-settings:v1')
    expect(mocks.write).toHaveBeenCalledWith(AUTOMATIC_DIALOGUE_SETTINGS_STORAGE_KEY, {
      modelId: 'full',
      version: 1,
      voiceId: 'Yuna',
    })
  })

  it('should restore the saved settings after a save failure', async () => {
    const failure = new Error('storage unavailable')
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    mocks.write.mockReturnValueOnce(failure)

    render(() => <AutomaticDialogueSettings />, {wrapper: PreferenceProvider})
    const model = await screen.findByRole('combobox', {name: '자동 음성 생성 모델'})
    fireEvent.change(model, {target: {value: 'full'}})

    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent(
        '자동 음성 생성 설정을 저장하지 못했어요.',
      ),
    )
    expect(model).toHaveValue('int8')
    expect(consoleError).toHaveBeenCalledWith(
      'Failed to save automatic dialogue settings.',
      failure,
    )
  })

  it('should allow visible controls to explain a failed settings initialization', async () => {
    const failure = new Error('settings unavailable')
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    mocks.read.mockRejectedValueOnce(failure)

    render(() => <AutomaticDialogueSettings />, {wrapper: PreferenceProvider})
    const model = await screen.findByRole('combobox', {name: '자동 음성 생성 모델'})

    expect(consoleError).toHaveBeenCalledWith(
      'Failed to load automatic dialogue settings.',
      failure,
    )
    expect(screen.getByRole('status')).toHaveTextContent('자동 음성 생성 설정을 불러오지 못했어요.')
    expect(model).toHaveValue('int8')
  })

  it('should not update state after the settings component is disposed during loading', async () => {
    const deferred = createDeferred<AutomaticDialogueSettingsValue>()
    mocks.read.mockReturnValue(deferred.promise)
    const view = render(() => <AutomaticDialogueSettings />, {wrapper: PreferenceProvider})

    await waitFor(() => expect(mocks.read).toHaveBeenCalledOnce())
    view.unmount()
    deferred.resolve({...DEFAULT_AUTOMATIC_DIALOGUE_SETTINGS, modelId: 'full'})
    await Promise.resolve()

    expect(mocks.write).not.toHaveBeenCalled()
  })

  it('should ignore a loading failure after the settings component has been disposed', async () => {
    const deferred = createDeferred<AutomaticDialogueSettingsValue>()
    const failure = new Error('late settings failure')
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    mocks.read.mockReturnValue(deferred.promise)
    const view = render(() => <AutomaticDialogueSettings />, {wrapper: PreferenceProvider})

    await waitFor(() => expect(mocks.read).toHaveBeenCalledOnce())
    view.unmount()
    deferred.reject(failure)
    await Promise.resolve()

    expect(consoleError).not.toHaveBeenCalled()
  })
})
