/** @vitest-environment jsdom */
import {Route, Router} from '@solidjs/router'
import {cleanup, fireEvent, render, screen} from '@solidjs/testing-library'
import {createMemo, createSignal} from 'solid-js'
import {afterEach, expect, it, vi} from 'vitest'
import type {LanguageLearningWord} from '../../../../features/language-learning/word-schema'
import type {LanguageLearningWordFilter} from '../filter'
import {LanguageLearningSavedWords} from '../SavedWords'

afterEach(cleanup)

it('should compose selection, bulk actions and filtered rows without replacing focused controls', () => {
  const apple: LanguageLearningWord = {
    createdAt: '2026-09-06T00:00:00Z',
    language: 'en',
    memorized: false,
    value: 'apple',
    version: 1,
  }
  const pear = {...apple, memorized: true, value: 'pear'}
  const words = [apple, pear]
  const [filter, setFilter] = createSignal<LanguageLearningWordFilter>('all')
  const [selected, setSelected] = createSignal<ReadonlyArray<LanguageLearningWord>>([])
  const onDelete = vi.fn()
  render(() => {
    const view = createMemo(() => ({
      emptyMessage: '단어 없음',
      words: words.filter(
        (word) => filter() === 'all' || word.memorized === (filter() === 'memorized'),
      ),
    }))
    return (
      <Router>
        <Route
          path="*"
          component={() => (
            <LanguageLearningSavedWords
              allWords={words}
              autoplayKey={() => null}
              filter={filter()}
              filterView={view()}
              getAudioUrl={() => null}
              isPronunciationLoading={() => false}
              memorizedWords={[pear]}
              unmemorizedWords={[apple]}
              onDelete={onDelete}
              onFilterChange={(value) => {
                setSelected([])
                setFilter(value as LanguageLearningWordFilter)
              }}
              onPronounce={vi.fn()}
              onToggleMemorized={vi.fn()}
              selectedWords={selected}
              onSelect={(word) =>
                setSelected((current) =>
                  current.includes(word)
                    ? current.filter((item) => item !== word)
                    : [...current, word],
                )
              }
            />
          )}
        />
      </Router>
    )
  })
  const appleButton = screen.getByRole('button', {name: 'apple'})
  appleButton.focus()
  fireEvent.click(appleButton)
  expect(appleButton).toHaveAttribute('aria-pressed', 'true')
  fireEvent.click(screen.getByRole('button', {name: 'pear'}))
  expect(screen.getByRole('button', {name: 'apple'})).toBe(appleButton)
  expect(appleButton).toHaveFocus()
  fireEvent.click(screen.getByRole('button', {name: '선택한 2개 단어 삭제'}))
  expect(onDelete).toHaveBeenCalledExactlyOnceWith([apple, pear])

  fireEvent.click(screen.getByRole('tab', {name: /^외운 단어/u}))

  expect(screen.queryByRole('button', {name: 'apple'})).toBeNull()
  expect(screen.getByRole('button', {name: 'pear'})).toHaveAttribute('aria-pressed', 'false')
  expect(screen.getByRole('button', {name: '선택한 0개 단어 삭제'})).toBeDisabled()
  fireEvent.click(screen.getByRole('button', {name: 'pear'}))
  expect(screen.getByRole('button', {name: '선택한 1개 단어 삭제'})).toBeEnabled()
})
