/** @vitest-environment jsdom */

import {render, screen, waitFor} from '@solidjs/testing-library'
import type {JSX} from 'solid-js'
import {afterEach, expect, it, vi} from 'vitest'
import {getLocale} from '@paraglide/runtime'

import {
  appendLanguageLearningWords,
  loadLanguageLearningWordSets,
} from '../../../features/language-learning'
import {LanguageLearningWordSets} from '../../../components/language-learning/WordSets'
import LanguageLearningWordSetsPage from '../word-sets'

vi.mock('@solidjs/meta', () => ({
  Title: (props: {children: JSX.Element}) => <span data-testid="page-title">{props.children}</span>,
}))
vi.mock('@paraglide/runtime', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@paraglide/runtime')>()),
  getLocale: vi.fn(),
}))
vi.mock('../../../components/language-learning/WordSets', () => ({
  LanguageLearningWordSets: vi.fn(),
}))
vi.mock('../../../features/language-learning', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../features/language-learning')>()),
  appendLanguageLearningWords: vi.fn(),
  loadLanguageLearningWordSets: vi.fn(),
}))

afterEach(() => {
  vi.clearAllMocks()
})

it('should load and render the language learning word sets page', async () => {
  vi.mocked(getLocale).mockReturnValue('ko')
  vi.mocked(loadLanguageLearningWordSets).mockResolvedValue([
    {
      description: {en: 'B1 words', ko: 'B1 단어'},
      id: 'english-b1',
      language: 'en',
      level: 'B1',
      title: {en: 'English B1', ko: '영어 B1'},
      version: 1,
      words: ['achieve'],
    },
    {
      description: {en: 'B2 words', ko: 'B2 단어'},
      id: 'english-b2',
      language: 'en',
      level: 'B2',
      title: {en: 'English B2', ko: '영어 B2'},
      version: 1,
      words: ['acknowledge'],
    },
  ])
  vi.mocked(LanguageLearningWordSets).mockImplementation((props) => (
    <div>{props.sets?.map((set) => set.title).join(', ')}</div>
  ))
  vi.mocked(appendLanguageLearningWords).mockReturnValue({addedCount: 1, skippedCount: 0})

  render(() => <LanguageLearningWordSetsPage />)

  expect(screen.getByTestId('page-title')).toHaveTextContent('Pomofi — 단어 세트 가져오기')
  await waitFor(() => {
    expect(screen.getByText('영어 B1, 영어 B2')).toBeInTheDocument()
  })
  expect(loadLanguageLearningWordSets).toHaveBeenCalledOnce()

  const componentProps = vi.mocked(LanguageLearningWordSets).mock.lastCall?.[0]
  expect(componentProps?.onAddSet?.('english-b1')).toEqual({addedCount: 1, skippedCount: 0})
  expect(appendLanguageLearningWords).toHaveBeenCalledWith('en', ['achieve'])
})
