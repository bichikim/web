import * as m from '@paraglide/message'
import {type PModalTabItem, PModalTabList} from '../PModalTabList'

const getItems = () =>
  [
    {icon: 'i-tabler-book-2', label: m.learning_tab_sentences(), value: 'sentences'},
    {icon: 'i-tabler-vocabulary', label: m.learning_tab_words(), value: 'words'},
    {icon: 'i-tabler-note', label: m.memory_memo_tab(), value: 'memos'},
    {icon: 'i-tabler-notebook', label: m.picture_diary_tab(), value: 'picture-diary'},
    {icon: 'i-tabler-calendar', label: m.calendar_tab(), value: 'calendar'},
  ] satisfies ReadonlyArray<PModalTabItem>

export const PMemoryAssistTabList = () => (
  <PModalTabList
    accessibleLabel={m.memory_assist_category_label()}
    class="pomo-memory-assist__tabs"
    items={getItems()}
  />
)
