/** @vitest-environment jsdom */
import '../components/language-learning/__tests__/editor.setup'
import {renderHook} from '@solidjs/testing-library'
import {expect, it} from 'vitest'

import {useLanguageLearningEditorState} from '../components/language-learning/use-editor-state'
import {candidate} from '../components/language-learning/__tests__/editor.setup'
import {PreferenceProvider} from 'src/hooks/use-preference'

it('should release the dialogue writer when changing the learning language', () => {
  const view = renderHook(() => useLanguageLearningEditorState(), {wrapper: PreferenceProvider})
  view.result.setSentences(['A useful sentence.'])
  view.result.setCandidates([candidate()])

  view.result.handleLanguageChange('ja')

  expect(view.result.writer.release).toHaveBeenCalledOnce()
  view.cleanup()
})
