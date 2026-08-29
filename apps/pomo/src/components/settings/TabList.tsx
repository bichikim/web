import * as m from '@paraglide/message'
import {type PModalTabItem, PModalTabList} from '../PModalTabList'

const getItems = () =>
  [
    {
      icon: 'i-tabler-adjustments-horizontal',
      label: m.settings_tab_general(),
      value: 'general',
    },
    {icon: 'i-tabler-bolt', label: m.settings_tab_events(), value: 'events'},
    {icon: 'i-tabler-rss', label: m.settings_tab_feeds(), value: 'feeds'},
    {
      icon: 'i-tabler-message-circle',
      label: m.settings_tab_dialogue(),
      value: 'dialogue-library',
    },
    {icon: 'i-tabler-user-circle', label: m.settings_tab_user(), value: 'user'},
    {icon: 'i-tabler-help-circle', label: m.settings_tab_guide(), value: 'guide'},
    {icon: 'i-tabler-heart', label: m.settings_tab_credits(), value: 'credits'},
  ] satisfies ReadonlyArray<PModalTabItem>

export const PSettingsTabList = () => (
  <PModalTabList
    accessibleLabel={m.settings_category_label()}
    class="pomo-settings__tabs"
    items={getItems()}
    scrollControls={{
      nextLabel: m.settings_next_tab(),
      previousLabel: m.settings_previous_tab(),
    }}
  />
)
