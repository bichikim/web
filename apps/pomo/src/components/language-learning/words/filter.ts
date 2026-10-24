import {type LanguageLearningWord} from '../../../features/language-learning'

export type LanguageLearningWordFilter = 'all' | 'memorized' | 'unmemorized'

export interface LanguageLearningWordFilterView {
  readonly emptyMessage: string
  readonly words: ReadonlyArray<LanguageLearningWord>
}
