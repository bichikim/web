/** @vitest-environment jsdom */
import {fireEvent, render, screen, waitFor} from '@solidjs/testing-library'
import {createSignal, For, Show} from 'solid-js'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {PreferenceProvider} from 'src/hooks/use-preference'
import {createDeferred} from 'src/test-utils/create-deferred'
import {PSelect} from '../../p-select/PSelect'
import {
  DEFAULT_TEXT_GENERATION_SETTINGS,
  TEXT_GENERATION_SETTINGS_KEY,
} from 'src/features/text-generation/settings'
import {PDefaultTextGenerationSettings} from '../PDefaultTextGenerationSettings'
import {useDefaultTextModel} from 'src/features/text-generation/use-default-text-model'

const mocks = vi.hoisted(() => ({read: vi.fn(), write: vi.fn()}))
vi.mock('src/features/text-generation/settings', async () => {
  const actual = await vi.importActual<typeof import('src/features/text-generation/settings')>(
    'src/features/text-generation/settings',
  )
  return {
    ...actual,
    createTextGenerationPreferenceOptions: (options = {}) => ({
      ...actual.createTextGenerationPreferenceOptions(options),
      storage: {read: mocks.read, write: mocks.write},
    }),
  }
})
vi.mock('../../p-select/PSelect', () => ({PSelect: vi.fn()}))

const DefaultModel = () => {
  const modelId = useDefaultTextModel()
  return <output aria-label="현재 문장 생성 모델">{modelId()}</output>
}

beforeEach(() => {
  mocks.read.mockResolvedValue(DEFAULT_TEXT_GENERATION_SETTINGS)
  mocks.write.mockResolvedValue(undefined)
  vi.mocked(PSelect).mockImplementation((props) => {
    if (props.multiple === true) {
      throw new Error('Expected a single model selection')
    }
    return (
      <select
        aria-label={props.accessibleLabel}
        value={props.value}
        onChange={(event) => props.onChange?.(event.currentTarget.value)}
      >
        <For each={props.options}>
          {(option) => <option value={option.value}>{option.label}</option>}
        </For>
      </select>
    )
  })
})
afterEach(() => {
  vi.clearAllMocks()
  vi.restoreAllMocks()
})

describe('PDefaultTextGenerationSettings', () => {
  it('should offer only Gemma and LFM, persist a selection, and restore it after remount', async () => {
    const first = render(() => <PDefaultTextGenerationSettings />, {wrapper: PreferenceProvider})
    const model = await screen.findByRole('combobox', {name: '기본 문장 생성 모델'})
    expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual([
      'Gemma 4 E2B · 약 3.7GB',
      'LFM2.5-2.6B QAD Q4_0 · 약 1.6GB',
    ])
    fireEvent.change(model, {target: {value: 'lfm-2.6b-qad'}})
    await waitFor(() =>
      expect(mocks.write).toHaveBeenCalledWith(TEXT_GENERATION_SETTINGS_KEY, {
        modelId: 'lfm-2.6b-qad',
        version: 1,
      }),
    )
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    first.unmount()
    mocks.read.mockResolvedValue({modelId: 'lfm-2.6b-qad', version: 1})
    render(() => <PDefaultTextGenerationSettings />, {wrapper: PreferenceProvider})
    expect(await screen.findByRole('combobox', {name: '기본 문장 생성 모델'})).toHaveValue(
      'lfm-2.6b-qad',
    )
  })

  it('should show a write failure and restore the last saved model', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    mocks.write.mockRejectedValue(new Error('Quota exceeded'))
    render(
      () => (
        <>
          <PDefaultTextGenerationSettings />
          <DefaultModel />
        </>
      ),
      {wrapper: PreferenceProvider},
    )
    const model = await screen.findByRole('combobox', {name: '기본 문장 생성 모델'})
    fireEvent.change(model, {target: {value: 'lfm-2.6b-qad'}})
    await waitFor(() =>
      expect(screen.getByText(/기본 문장 생성 설정을 저장하지 못했어요/)).toBeInTheDocument(),
    )
    expect(model).toHaveValue('gemma-4-e2b')
    expect(screen.getByRole('status', {name: '현재 문장 생성 모델'})).toHaveTextContent(
      'gemma-4-e2b',
    )
  })

  it('should restore the consumer model when a save fails after the settings panel closes', async () => {
    const save = createDeferred<unknown>()
    mocks.write.mockReturnValueOnce(save.promise)
    let closePanel: VoidFunction = () => undefined
    const error = vi.fn()
    render(() => {
      const [open, setOpen] = createSignal(true)
      closePanel = () => setOpen(false)
      return (
        <PreferenceProvider onError={error}>
          <Show when={open()}>
            <PDefaultTextGenerationSettings />
          </Show>
          <DefaultModel />
        </PreferenceProvider>
      )
    })
    const model = await screen.findByRole('combobox', {name: '기본 문장 생성 모델'})
    fireEvent.change(model, {target: {value: 'lfm-2.6b-qad'}})
    closePanel()
    save.reject(new Error('Quota exceeded'))
    await waitFor(() => expect(error).toHaveBeenCalledOnce())
    expect(screen.getByRole('status', {name: '현재 문장 생성 모델'})).toHaveTextContent(
      'gemma-4-e2b',
    )
  })

  it('should preserve a later successful selection when an earlier write fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const earlier = createDeferred<unknown>()
    mocks.write.mockReturnValueOnce(earlier.promise)
    render(() => <PDefaultTextGenerationSettings />, {wrapper: PreferenceProvider})
    const model = await screen.findByRole('combobox', {name: '기본 문장 생성 모델'})
    fireEvent.change(model, {target: {value: 'lfm-2.6b-qad'}})
    fireEvent.change(model, {target: {value: 'gemma-4-e2b'}})
    earlier.reject(new Error('Quota exceeded'))
    await waitFor(() => expect(mocks.write).toHaveBeenCalledTimes(2))
    await waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument())
    expect(model).toHaveValue('gemma-4-e2b')
  })
})
