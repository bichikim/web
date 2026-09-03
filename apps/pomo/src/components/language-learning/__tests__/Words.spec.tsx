/** @vitest-environment jsdom */

import {fireEvent, render, screen, within} from '@solidjs/testing-library'
import {For} from 'solid-js'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'

import {readLanguageLearningWords} from '../../../features/language-learning'
import {
  type RunAfterModelResult,
  type RunAfterVoiceModelOptions,
  useModelAssetManager,
  useModelDownload,
} from '../../../features/model-download'
import {isSupertonicModelDownloaded} from '../../../features/supertonic'
import {getLocale, overwriteGetLocale} from '@paraglide/runtime'
import {PSelect} from '../../PSelect'
import {LanguageLearningWords} from '../Words'
import {generateLanguageLearningWordPronunciation} from '../word-pronunciation'

const audioRepositoryMocks = vi.hoisted(() => ({create: vi.fn()}))
const originalGetLocale = getLocale

vi.mock('../../PSelect', () => ({PSelect: vi.fn()}))
vi.mock('../../PModelDownloadConsent', () => ({PModelDownloadConsent: vi.fn(() => null)}))
vi.mock('../../settings/ActionLink', () => ({
  PSettingsActionLink: (props: {readonly children: string; readonly href: string}) => (
    <a href={props.href}>{props.children}</a>
  ),
}))
vi.mock('../../../features/language-learning', async () => {
  const actual = await vi.importActual<typeof import('../../../features/language-learning')>(
    '../../../features/language-learning',
  )
  return {...actual, createLanguageLearningWordAudioRepository: audioRepositoryMocks.create}
})
vi.mock('../../../features/model-download', () => ({
  useModelAssetManager: vi.fn(),
  useModelDownload: vi.fn(),
}))
vi.mock('../../../features/supertonic', () => ({
  getSupertonicModel: vi.fn(() => ({size: 1})),
  isSupertonicModelDownloaded: vi.fn(),
}))
vi.mock('../word-pronunciation', () => ({
  generateLanguageLearningWordPronunciation: vi.fn(),
}))

beforeEach(() => {
  overwriteGetLocale(() => 'ko')
  localStorage.clear()
  vi.clearAllMocks()
  audioRepositoryMocks.create.mockReturnValue({
    delete: vi.fn(async () => undefined),
    get: vi.fn(async () => null),
    save: vi.fn(async () => undefined),
  })
  vi.mocked(useModelDownload).mockReturnValue({
    cancel: vi.fn(),
    dismissError: vi.fn(),
    dispose: vi.fn(),
    startTextModel: vi.fn(),
    startVoiceModel: vi.fn(),
    state: () => ({status: 'idle'}),
  })
  vi.mocked(useModelAssetManager).mockReturnValue({
    runAfterModel: vi.fn(),
    runAfterVoiceModel: vi.fn(),
  })
  vi.mocked(isSupertonicModelDownloaded).mockResolvedValue(true)
  vi.mocked(PSelect).mockImplementation((props) => {
    if (props.multiple === true) {
      return null
    }

    return (
      <label>
        {props.label}
        <select onChange={(event) => props.onChange(event.currentTarget.value)} value={props.value}>
          <For each={props.options}>
            {(option) => <option value={option.value}>{option.label}</option>}
          </For>
        </select>
      </label>
    )
  })
})

afterEach(() => {
  overwriteGetLocale(originalGetLocale)
})

it('should localize the saved-word heading count in English', () => {
  overwriteGetLocale(() => 'en')
  render(() => <LanguageLearningWords />)
  const input = screen.getByRole('textbox', {name: 'Unknown words'})

  fireEvent.input(input, {target: {value: 'acknowledge,perspective,reluctant'}})
  fireEvent.click(screen.getByRole('button', {name: 'Save words'}))

  const heading = screen.getByRole('heading', {name: 'Saved words'})
  expect(within(heading.parentElement ?? document.body).getByText('3')).toBeDefined()
  expect(screen.queryByText('3개')).toBeNull()
})

it('should add several unknown words at once and filter them by language', () => {
  const result = render(() => <LanguageLearningWords />)
  const input = screen.getByRole('textbox', {name: '모르는 단어'})

  expect(input.parentElement?.className).toContain('bg-surface')
  expect(screen.getByRole('button', {name: '단어 저장'}).className).toContain('rounded-control')
  expect(vi.mocked(PSelect).mock.calls[0]?.[0].class).toBe('w-full')

  fireEvent.paste(input, {
    clipboardData: {getData: () => 'acknowledge, perspective\nreluctant'},
  })
  fireEvent.click(screen.getByRole('button', {name: '단어 저장'}))

  expect(readLanguageLearningWords().map((word) => word.value)).toEqual([
    'acknowledge',
    'perspective',
    'reluctant',
  ])
  expect(screen.getByText('3개')).toBeDefined()
  expect(screen.getByText('acknowledge')).toBeDefined()
  expect(screen.getByRole('link', {name: '단어 세트에서 가져오기'})).toHaveAttribute(
    'href',
    '/language-learning/word-sets',
  )

  fireEvent.change(screen.getByRole('combobox', {name: '학습 언어'}), {
    target: {value: 'ja'},
  })
  expect(screen.getByText('저장한 단어가 없어요.').className).toContain('border-dashed')

  result.unmount()
})

it('should save the current input, deduplicate words, and delete a saved word', () => {
  render(() => <LanguageLearningWords />)
  const input = screen.getByRole('textbox', {name: '모르는 단어'})

  fireEvent.input(input, {target: {value: 'Home,home,wave'}})
  fireEvent.click(screen.getByRole('button', {name: '단어 저장'}))

  expect(readLanguageLearningWords().map((word) => word.value)).toEqual(['Home', 'wave'])
  expect(screen.queryByRole('button', {name: '선택한 2개 단어 삭제'})).toBeNull()
  fireEvent.click(screen.getByRole('button', {name: 'Home'}))
  fireEvent.click(screen.getByRole('button', {name: 'wave'}))
  fireEvent.click(screen.getByRole('button', {name: '선택한 2개 단어 삭제'}))
  expect(readLanguageLearningWords()).toEqual([])
})

it('should add and remove word selections and change all selected memorized states', () => {
  render(() => <LanguageLearningWords />)
  const input = screen.getByRole('textbox', {name: '모르는 단어'})

  fireEvent.input(input, {target: {value: 'Home,wave'}})
  fireEvent.click(screen.getByRole('button', {name: '단어 저장'}))

  const selectButton = screen.getByRole('button', {name: 'Home'})
  const waveButton = screen.getByRole('button', {name: 'wave'})
  const pronounceButton = screen.getByRole('button', {name: 'Home 발음 듣기'})
  const wordItem = selectButton.closest('li')
  const wordList = wordItem?.parentElement

  expect(selectButton).toHaveAttribute('aria-pressed', 'false')
  expect(wordItem?.children[0]).toBe(selectButton)
  expect(wordItem?.children[1]).toHaveAttribute('aria-label', 'Home 발음 듣기')
  expect(wordItem?.children[2]).toHaveAttribute('aria-hidden', 'true')
  expect(wordItem?.querySelectorAll('button')).toHaveLength(2)
  expect(wordItem).toHaveClass('inline-flex', 'max-w-full', 'min-h-7')
  expect(wordItem).not.toHaveClass('w-full')
  expect(selectButton).toHaveClass('flex', 'items-center', 'py-1', 'text-sm')
  expect(selectButton).not.toHaveClass('py-2')
  expect(selectButton).not.toHaveClass('text-xs')
  expect(pronounceButton).toHaveClass('min-h-7', 'w-9', 'self-stretch')
  expect(pronounceButton).toHaveClass('border-l')
  expect(wordList).toHaveClass('max-h-[19rem]', 'overflow-y-auto', 'flex-wrap')
  expect(wordList).not.toHaveClass('overscroll-contain')
  expect(screen.queryByRole('button', {name: '선택한 1개 단어를 외운 단어로 이동'})).toBeNull()

  fireEvent.click(selectButton)
  fireEvent.click(waveButton)
  expect(selectButton).toHaveAttribute('aria-pressed', 'true')
  expect(waveButton).toHaveAttribute('aria-pressed', 'true')
  expect(wordItem).toHaveClass('border-primary', 'bg-primary-soft')
  expect(screen.getByText('2개 선택')).toBeDefined()

  fireEvent.click(selectButton)
  expect(selectButton).toHaveAttribute('aria-pressed', 'false')
  expect(waveButton).toHaveAttribute('aria-pressed', 'true')
  expect(screen.getByText('1개 선택')).toBeDefined()

  fireEvent.click(selectButton)
  fireEvent.click(screen.getByRole('button', {name: '선택한 2개 단어를 외운 단어로 이동'}))

  expect(readLanguageLearningWords()).toMatchObject([
    {memorized: true, value: 'Home'},
    {memorized: true, value: 'wave'},
  ])
  expect(screen.queryByRole('button', {name: '선택한 2개 단어를 외울 단어로 이동'})).toBeNull()
  fireEvent.click(screen.getByRole('button', {name: 'Home'}))
  fireEvent.click(screen.getByRole('button', {name: 'wave'}))
  fireEvent.click(screen.getByRole('button', {name: '선택한 2개 단어를 외울 단어로 이동'}))

  expect(readLanguageLearningWords()).toMatchObject([
    {memorized: false, value: 'Home'},
    {memorized: false, value: 'wave'},
  ])
})

it('should keep selection actions visible and disabled while no words are selected', () => {
  render(() => <LanguageLearningWords />)
  const input = screen.getByRole('textbox', {name: '모르는 단어'})

  fireEvent.input(input, {target: {value: 'Home'}})
  fireEvent.click(screen.getByRole('button', {name: '단어 저장'}))

  const selectionActions = screen.getByText('0개 선택').parentElement
  const moveButton = screen.getByRole('button', {
    name: '선택한 0개 단어를 외운 단어로 이동',
  })
  const deleteButton = screen.getByRole('button', {name: '선택한 0개 단어 삭제'})

  expect(selectionActions).toHaveAttribute('role', 'group')
  expect(moveButton).toBeDisabled()
  expect(deleteButton).toBeDisabled()

  const wordButton = screen.getByRole('button', {name: 'Home'})
  fireEvent.click(wordButton)

  expect(screen.getByText('1개 선택').parentElement).toBe(selectionActions)
  expect(moveButton).toBeEnabled()
  expect(deleteButton).toBeEnabled()

  fireEvent.click(wordButton)

  expect(screen.getByText('0개 선택').parentElement).toBe(selectionActions)
  expect(moveButton).toBeDisabled()
  expect(deleteButton).toBeDisabled()
})

it('should filter all, unmemorized, and memorized words in one tab panel', () => {
  render(() => <LanguageLearningWords />)
  const input = screen.getByRole('textbox', {name: '모르는 단어'})

  fireEvent.input(input, {target: {value: 'words,asset'}})
  fireEvent.click(screen.getByRole('button', {name: '단어 저장'}))
  fireEvent.click(screen.getByRole('button', {name: 'asset'}))
  fireEvent.click(screen.getByRole('button', {name: '선택한 1개 단어를 외운 단어로 이동'}))

  const allTab = screen.getByRole('tab', {name: '전체 2'})
  const unmemorizedTab = screen.getByRole('tab', {name: '외울 단어 1'})
  const memorizedTab = screen.getByRole('tab', {name: '외운 단어 1'})
  expect(screen.getByRole('tablist', {name: '단어 상태'})).toBeDefined()
  expect(allTab).toHaveAttribute('aria-selected', 'true')
  expect(screen.getAllByRole('tabpanel')).toHaveLength(1)
  expect(screen.getByText('words')).toBeDefined()
  expect(screen.getByText('asset')).toBeDefined()

  fireEvent.click(unmemorizedTab)
  expect(unmemorizedTab).toHaveAttribute('aria-selected', 'true')
  expect(unmemorizedTab).toHaveAttribute('aria-controls', screen.getByRole('tabpanel').id)
  expect(screen.getByRole('tabpanel')).toHaveAttribute('aria-labelledby', unmemorizedTab.id)
  expect(screen.getByText('words')).toBeDefined()
  expect(screen.queryByText('asset')).toBeNull()

  fireEvent.click(memorizedTab)
  expect(memorizedTab).toHaveAttribute('aria-selected', 'true')
  expect(screen.queryByText('words')).toBeNull()
  expect(screen.getByText('asset')).toBeDefined()

  fireEvent.click(screen.getByRole('button', {name: 'asset'}))
  fireEvent.click(screen.getByRole('button', {name: '선택한 1개 단어를 외울 단어로 이동'}))
  expect(screen.queryByText('asset')).toBeNull()
  expect(screen.getByText('외운 단어가 없어요.')).toBeDefined()
  expect(screen.getByRole('tab', {name: '외운 단어 0'})).toHaveAttribute('aria-selected', 'true')
})

it('should show only a speaker after the selectable word and request pronunciation', async () => {
  render(() => <LanguageLearningWords />)
  const input = screen.getByRole('textbox', {name: '모르는 단어'})

  fireEvent.input(input, {target: {value: 'Home'}})
  fireEvent.click(screen.getByRole('button', {name: '단어 저장'}))

  const wordItem = screen.getByText('Home').closest('li')
  const buttons = wordItem?.querySelectorAll('button')
  expect(buttons).toHaveLength(2)
  expect(buttons?.[0]).toBe(screen.getByRole('button', {name: 'Home'}))
  expect(buttons?.[1]).toBe(screen.getByRole('button', {name: 'Home 발음 듣기'}))
  fireEvent.click(screen.getByRole('button', {name: 'Home 발음 듣기'}))
  await vi.waitFor(() =>
    expect(isSupertonicModelDownloaded).toHaveBeenCalledWith({modelId: 'int8'}),
  )
})

it('should play only the requested word when saved and memorized words share the page', async () => {
  const playedSources: string[] = []
  function recordPlay(this: HTMLMediaElement) {
    playedSources.push(this.getAttribute('src') ?? '')
    return Promise.resolve()
  }
  const play = vi.spyOn(HTMLMediaElement.prototype, 'play').mockImplementation(recordPlay)
  let audioIndex = 0
  vi.spyOn(URL, 'createObjectURL').mockImplementation(() => {
    const url = `blob:word-audio-${audioIndex}`
    audioIndex += 1
    return url
  })
  vi.mocked(generateLanguageLearningWordPronunciation).mockResolvedValue({
    audio: new Blob(['audio'], {type: 'audio/ogg; codecs=opus'}),
    status: 'complete',
  })
  async function runAfterVoiceModel<Value>(
    options: RunAfterVoiceModelOptions<Value>,
  ): Promise<RunAfterModelResult<Value>> {
    return {status: 'complete', value: await options.task()}
  }
  vi.mocked(useModelAssetManager).mockReturnValue({
    runAfterModel: vi.fn(),
    runAfterVoiceModel,
  })

  render(() => <LanguageLearningWords />)
  const input = screen.getByRole('textbox', {name: '모르는 단어'})
  fireEvent.input(input, {target: {value: 'words,asset'}})
  fireEvent.click(screen.getByRole('button', {name: '단어 저장'}))
  fireEvent.click(screen.getByRole('button', {name: 'asset'}))
  fireEvent.click(screen.getByRole('button', {name: '선택한 1개 단어를 외운 단어로 이동'}))

  fireEvent.click(screen.getByRole('button', {name: 'words 발음 듣기'}))
  await vi.waitFor(() => expect(play).toHaveBeenCalledOnce())
  expect(playedSources).toEqual(['blob:word-audio-0'])

  fireEvent.click(screen.getByRole('button', {name: 'asset 발음 듣기'}))
  await vi.waitFor(() => expect(play).toHaveBeenCalledTimes(2))
  expect(playedSources).toEqual(['blob:word-audio-0', 'blob:word-audio-1'])

  fireEvent.click(screen.getByRole('button', {name: 'words 발음 듣기'}))
  await vi.waitFor(() => expect(play).toHaveBeenCalledTimes(3))
  fireEvent.click(screen.getByRole('tab', {name: '외운 단어 1'}))
  fireEvent.click(screen.getByRole('tab', {name: '외울 단어 1'}))

  expect(play).toHaveBeenCalledTimes(3)
  expect(playedSources).toEqual(['blob:word-audio-0', 'blob:word-audio-1', 'blob:word-audio-0'])
})

it('should report storage failures while saving and deleting words', () => {
  const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)
  const result = render(() => <LanguageLearningWords />)
  const input = screen.getByRole('textbox', {name: '모르는 단어'})
  const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('storage unavailable')
  })

  fireEvent.input(input, {target: {value: 'unavailable'}})
  fireEvent.click(screen.getByRole('button', {name: '단어 저장'}))
  expect(screen.getByRole('status')).toHaveTextContent('학습 단어를 저장하지 못했어요.')

  setItem.mockRestore()
  result.unmount()

  const deleteResult = render(() => <LanguageLearningWords />)
  const deleteInput = screen.getByRole('textbox', {name: '모르는 단어'})
  fireEvent.input(deleteInput, {target: {value: 'removable'}})
  fireEvent.click(screen.getByRole('button', {name: '단어 저장'}))
  const failingSetItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('storage unavailable')
  })

  fireEvent.click(screen.getByRole('button', {name: 'removable'}))
  fireEvent.click(screen.getByRole('button', {name: '선택한 1개 단어 삭제'}))
  expect(screen.getByRole('status')).toHaveTextContent('학습 단어를 삭제하지 못했어요.')
  expect(error).toHaveBeenCalledTimes(2)

  failingSetItem.mockRestore()
  deleteResult.unmount()
})

it('should report storage failures while changing the memorized state', () => {
  const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)
  render(() => <LanguageLearningWords />)
  const input = screen.getByRole('textbox', {name: '모르는 단어'})

  fireEvent.input(input, {target: {value: 'unavailable'}})
  fireEvent.click(screen.getByRole('button', {name: '단어 저장'}))
  const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('storage unavailable')
  })

  fireEvent.click(screen.getByRole('button', {name: 'unavailable'}))
  fireEvent.click(screen.getByRole('button', {name: '선택한 1개 단어를 외운 단어로 이동'}))
  expect(screen.getByRole('status')).toHaveTextContent('학습 단어의 외움 상태를 바꾸지 못했어요.')
  expect(error).toHaveBeenCalledOnce()

  setItem.mockRestore()
})
