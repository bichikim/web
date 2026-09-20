/** @vitest-environment jsdom */

import {
  candidate,
  getLatestProps,
  LanguageLearningEditorWithPreferences,
  renderGeneratedReview,
  setWriterState,
} from './editor.setup'
import {render, renderHook, screen} from '@solidjs/testing-library'
import {type ComponentProps, createSignal, onMount} from 'solid-js'
import {expect, it, vi} from 'vitest'
import {PreferenceProvider} from '../../../hooks/use-preference'
import {
  getUnmemorizedLanguageLearningWordValues,
  useLanguageLearningWords,
} from '../../../features/language-learning'
import {LanguageLearningSettings} from '../Settings'
import {LanguageLearningWordSourceControl} from '../WordSource'
import {LanguageLearningReview} from '../Review'
import {useLanguageLearningEditorState} from '../use-editor-state'

it('should clear generated review state when changing the learning language', async () => {
  const view = await renderGeneratedReview()
  const reviewProps = getLatestProps<ComponentProps<typeof LanguageLearningReview>>(
    vi.mocked(LanguageLearningReview),
  )
  expect(reviewProps.candidates).toHaveLength(1)

  const settingsProps = getLatestProps<ComponentProps<typeof LanguageLearningSettings>>(
    vi.mocked(LanguageLearningSettings),
  )
  settingsProps.onLanguageChange('ko')

  expect(reviewProps.candidates).toEqual([])
  expect(screen.queryByRole('button', {name: 'save'})).toBeNull()
  view.unmount()
})

it('should clear generated sentences and candidates when changing the word source', () => {
  const view = renderHook(() => useLanguageLearningEditorState(), {wrapper: PreferenceProvider})
  view.result.setSentences(['A useful sentence.'])
  view.result.setCandidates([candidate()])

  view.result.handleWordSourceChange('saved')

  expect(view.result.sentences()).toEqual([])
  expect(view.result.candidates()).toEqual([])
  expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:generated')
  view.cleanup()
})

it('should keep the editor busy while the writer is generating after changing the word source', () => {
  render(() => <LanguageLearningEditorWithPreferences />)
  setWriterState({status: 'generating'})

  getLatestProps<ComponentProps<typeof LanguageLearningWordSourceControl>>(
    vi.mocked(LanguageLearningWordSourceControl),
  ).onSourceChange('saved')

  expect(screen.getByRole('button', {name: 'generate'})).toBeDisabled()
  expect(
    getLatestProps<ComponentProps<typeof LanguageLearningWordSourceControl>>(
      vi.mocked(LanguageLearningWordSourceControl),
    ).disabled,
  ).toBe(true)
})

it('should change source and language while keeping saved words available only when eligible', () => {
  render(() => <LanguageLearningEditorWithPreferences />)
  const sourceProps = getLatestProps<ComponentProps<typeof LanguageLearningWordSourceControl>>(
    vi.mocked(LanguageLearningWordSourceControl),
  )
  const settingsProps = getLatestProps<ComponentProps<typeof LanguageLearningSettings>>(
    vi.mocked(LanguageLearningSettings),
  )

  sourceProps.onInputChange('pending')
  sourceProps.onWordsChange(['word'])
  sourceProps.onSourceChange('saved')
  settingsProps.onCountChange(2)
  settingsProps.onModelChange('int8')
  settingsProps.onVoiceChange('Hana')
  settingsProps.onLanguageChange('ko')
  vi.mocked(getUnmemorizedLanguageLearningWordValues).mockReturnValue([])
  settingsProps.onLanguageChange('ja')

  expect(
    getLatestProps<ComponentProps<typeof LanguageLearningWordSourceControl>>(
      vi.mocked(LanguageLearningWordSourceControl),
    ).source,
  ).toBe('direct')
})

it('should keep direct word entry when changing the learning language', () => {
  render(() => <LanguageLearningEditorWithPreferences />)
  const settingsProps = getLatestProps<ComponentProps<typeof LanguageLearningSettings>>(
    vi.mocked(LanguageLearningSettings),
  )

  settingsProps.onLanguageChange('ko')

  expect(
    getLatestProps<ComponentProps<typeof LanguageLearningWordSourceControl>>(
      vi.mocked(LanguageLearningWordSourceControl),
    ).source,
  ).toBe('direct')
})

it('should restore the last selected word source after reopening the editor', () => {
  localStorage.setItem(
    'pomo:language-learning:word-source:v1',
    JSON.stringify({source: 'saved', version: 1}),
  )
  let view = render(() => <LanguageLearningEditorWithPreferences />)

  const sourceProps = getLatestProps<ComponentProps<typeof LanguageLearningWordSourceControl>>(
    vi.mocked(LanguageLearningWordSourceControl),
  )
  expect(sourceProps.source).toBe('saved')

  sourceProps.onSourceChange('direct')
  expect(JSON.parse(localStorage.getItem('pomo:language-learning:word-source:v1') ?? '')).toEqual({
    source: 'direct',
    version: 1,
  })

  view.unmount()
  vi.mocked(LanguageLearningWordSourceControl).mockClear()
  view = render(() => <LanguageLearningEditorWithPreferences />)

  expect(
    getLatestProps<ComponentProps<typeof LanguageLearningWordSourceControl>>(
      vi.mocked(LanguageLearningWordSourceControl),
    ).source,
  ).toBe('direct')
  view.unmount()
})

it('should validate a saved-word preference after persisted words load on mount', () => {
  localStorage.setItem(
    'pomo:language-learning:word-source:v1',
    JSON.stringify({source: 'saved', version: 1}),
  )
  vi.mocked(useLanguageLearningWords).mockImplementation(() => {
    const [words, setWords] = createSignal<ReadonlyArray<{readonly value: string}>>([])
    onMount(() => setWords([{value: 'one'}, {value: 'two'}, {value: 'three'}]))
    return words as ReturnType<typeof useLanguageLearningWords>
  })
  vi.mocked(getUnmemorizedLanguageLearningWordValues).mockImplementation(({words}) =>
    words.map((word) => word.value),
  )

  render(() => <LanguageLearningEditorWithPreferences />)

  expect(
    getLatestProps<ComponentProps<typeof LanguageLearningWordSourceControl>>(
      vi.mocked(LanguageLearningWordSourceControl),
    ).source,
  ).toBe('saved')
  expect(JSON.parse(localStorage.getItem('pomo:language-learning:word-source:v1') ?? '')).toEqual({
    source: 'saved',
    version: 1,
  })
})

it('should replace an unavailable saved-word preference with direct entry', () => {
  localStorage.setItem(
    'pomo:language-learning:word-source:v1',
    JSON.stringify({source: 'saved', version: 1}),
  )
  vi.mocked(getUnmemorizedLanguageLearningWordValues).mockReturnValue([])

  render(() => <LanguageLearningEditorWithPreferences />)

  expect(
    getLatestProps<ComponentProps<typeof LanguageLearningWordSourceControl>>(
      vi.mocked(LanguageLearningWordSourceControl),
    ).source,
  ).toBe('direct')
  expect(JSON.parse(localStorage.getItem('pomo:language-learning:word-source:v1') ?? '')).toEqual({
    source: 'direct',
    version: 1,
  })
})
