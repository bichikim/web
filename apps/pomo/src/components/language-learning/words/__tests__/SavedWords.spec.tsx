/** @vitest-environment jsdom */
import {Route, Router} from '@solidjs/router'
import {cleanup, fireEvent, render, screen} from '@solidjs/testing-library'
import {afterEach, expect, it, vi} from 'vitest'
import {LanguageLearningSavedWords} from '../SavedWords'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

it('should show filter counts and forward the selected filter', () => {
  const onFilterChange = vi.fn()
  render(() => (
    <Router>
      <Route
        path="*"
        component={() => (
          <>
            <LanguageLearningSavedWords
              autoplayKey={() => null}
              pronunciationBusy={false}
              getAudioUrl={() => null}
              isPronunciationLoading={() => false}
              onDelete={vi.fn()}
              onPronounce={vi.fn()}
              onToggleMemorized={vi.fn()}
              onSelect={vi.fn()}
              selectedWords={() => []}
              allWords={[]}
              memorizedWords={[]}
              unmemorizedWords={[]}
              filter="all"
              filterView={{emptyMessage: '단어 없음', words: []}}
              onFilterChange={onFilterChange}
            />
          </>
        )}
      />
    </Router>
  ))
  expect(screen.getAllByRole('tab')).toHaveLength(3)
  fireEvent.click(screen.getAllByRole('tab')[1]!)
  expect(onFilterChange).toHaveBeenCalledWith('unmemorized')
})
