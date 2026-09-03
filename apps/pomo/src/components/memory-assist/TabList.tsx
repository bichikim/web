import * as m from '@paraglide/message'
import {type PModalTabItem, PModalTabList} from '../PModalTabList'

const getItems = () =>
  [
    {icon: 'i-tabler-book-2', label: m.learning_tab_sentences(), value: 'sentences'},
    {icon: 'i-tabler-vocabulary', label: m.learning_tab_words(), value: 'words'},
  ] satisfies ReadonlyArray<PModalTabItem>

export const PMemoryAssistTabList = () => (
  <PModalTabList
    accessibleLabel={m.memory_assist_category_label()}
    class="pomo-memory-assist__tabs"
    items={getItems()}
  />
)
