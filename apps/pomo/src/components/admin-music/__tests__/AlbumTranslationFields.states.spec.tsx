/** @vitest-environment jsdom */

import {fireEvent, render, screen} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, expect, it, vi} from 'vitest'

import {
  type AlbumDraftTranslation,
  type AlbumDraftTranslations,
  createEmptyAlbumTranslations,
} from '../../../features/admin-music'

const translate = vi.fn()
const [isBusy, setIsBusy] = createSignal(false)
const state = vi.fn<() => {readonly message?: string; readonly status: string}>(() => ({
  status: 'idle',
}))
let complete: ((values: Partial<AlbumDraftTranslations>) => void) | undefined

vi.mock('../../../features/album-translation/use-album-translation', () => ({
  useAlbumTranslation: (options: {
    readonly onComplete: (values: Partial<AlbumDraftTranslations>) => void
  }) => {
    complete = options.onComplete
    return {isBusy, state, translate}
  },
}))

import AlbumTranslationFields from '../AlbumTranslationFields'

const renderFields = (initial = createEmptyAlbumTranslations()) => {
  const [values, setValues] = createSignal(initial)
  const onValuesChange = vi.fn(setValues)
  render(() => <AlbumTranslationFields onValuesChange={onValuesChange} values={values()} />)
  return {onValuesChange, values}
}

afterEach(() => {
  vi.clearAllMocks()
  setIsBusy(false)
  state.mockReturnValue({status: 'idle'})
  complete = undefined
})

it('should edit localized fields, translate Korean input, and merge completed drafts', () => {
  const initial = createEmptyAlbumTranslations()
  initial.ko = {description: '설명', title: '밤'}
  state.mockReturnValue({status: 'complete'})
  const {onValuesChange} = renderFields(initial)

  fireEvent.input(screen.getAllByLabelText(/^앨범명/u)[1]!, {target: {value: 'Night'}})
  fireEvent.input(screen.getAllByLabelText(/^설명/u)[1]!, {target: {value: 'Description'}})
  fireEvent.click(screen.getByRole('button', {name: '한국어에서 자동 번역'}))
  expect(translate).toHaveBeenCalledWith(initial.ko)
  expect(onValuesChange).toHaveBeenCalledWith(
    expect.objectContaining({en: expect.objectContaining({description: 'Description'})}),
  )

  const japanese: AlbumDraftTranslation = {description: '説明', title: '夜'}
  complete?.({ja: japanese})
  expect(onValuesChange).toHaveBeenLastCalledWith(expect.objectContaining({ja: japanese}))
  expect(screen.getByText(/번역 초안을 채웠습니다/u)).toBeInTheDocument()
})

it.each([
  ['error', '실패'],
  ['generating', '생성 중'],
  ['loading', '불러오는 중'],
] as const)('should display the %s translation message', (status, message) => {
  state.mockReturnValue({message, status})
  renderFields()

  expect(screen.getByText(message)).toBeInTheDocument()
})

it('should display unsupported, busy, internally idle, and unexpected states safely', () => {
  state.mockReturnValue({status: 'unsupported'})
  const first = renderFields()
  expect(screen.getByText(/WebGPU/u)).toBeInTheDocument()
  first.onValuesChange.mockClear()

  setIsBusy(true)
  expect(screen.getByRole('button', {name: 'Gemma 4 번역 중…'})).toBeDisabled()

  state.mockReset()
  state.mockReturnValueOnce({status: 'complete'}).mockReturnValueOnce({status: 'idle'})
  const second = renderFields()
  expect(second.values().ko.title).toBe('')

  state.mockReset()
  state.mockReturnValueOnce({status: 'complete'}).mockReturnValue({status: 'unexpected'})
  renderFields()
  expect(screen.getAllByText('한국어 기본 정보')).toHaveLength(3)
})
