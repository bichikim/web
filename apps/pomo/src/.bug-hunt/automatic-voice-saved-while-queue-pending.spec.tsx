/** @vitest-environment jsdom */
import {createDeferred} from 'src/test-utils/create-deferred'
import {PreferenceProvider} from 'src/hooks/use-preference'
import {fireEvent, render, screen, waitFor} from '@solidjs/testing-library'
import {For} from 'solid-js'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'
import {
  AUTOMATIC_DIALOGUE_SETTINGS_STORAGE_KEY,
  DEFAULT_AUTOMATIC_DIALOGUE_SETTINGS,
  createAutomaticDialoguePreferenceOptions,
} from '../features/focus-room-dialogue'
import {PAutomaticVoiceSettings} from '../components/ai-settings/PAutomaticVoiceSettings'

const mocks = vi.hoisted(() => ({
  read: vi.fn(),
  write: vi.fn(),
}))

vi.mock('../features/focus-room-dialogue', async () => {
  const actual = await vi.importActual<typeof import('../features/focus-room-dialogue')>(
    '../features/focus-room-dialogue',
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

vi.mock('../components/p-select/PSelect', () => ({
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

beforeEach(() => {
  mocks.read.mockResolvedValue(DEFAULT_AUTOMATIC_DIALOGUE_SETTINGS)
  mocks.write.mockResolvedValue(undefined)
})

afterEach(() => {
  vi.clearAllMocks()
})

it('should not show the saved message until every queued preference write finishes', async () => {
  const firstWrite = createDeferred<void>()
  const secondWrite = createDeferred<void>()
  mocks.write.mockReturnValueOnce(firstWrite.promise).mockReturnValueOnce(secondWrite.promise)

  render(() => <PAutomaticVoiceSettings />, {wrapper: PreferenceProvider})
  const model = await screen.findByRole('combobox', {name: '자동 음성 생성 모델'})
  const voice = screen.getByRole('combobox', {name: '자동 음성 생성 목소리'})

  fireEvent.change(model, {target: {value: 'full'}})
  await waitFor(() => expect(mocks.write).toHaveBeenCalledOnce())
  fireEvent.change(voice, {target: {value: 'Hana'}})
  expect(voice).toHaveValue('Hana')
  expect(mocks.write).toHaveBeenCalledOnce()

  firstWrite.resolve()
  await waitFor(() => expect(mocks.write).toHaveBeenCalledTimes(2))
  expect(screen.queryByRole('status')).not.toHaveTextContent('자동 음성 생성 설정을 저장했어요.')

  secondWrite.resolve()
  await waitFor(() =>
    expect(screen.getByRole('status')).toHaveTextContent('자동 음성 생성 설정을 저장했어요.'),
  )
})
