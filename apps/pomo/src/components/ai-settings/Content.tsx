import {Tabs} from '@kobalte/core/tabs'
import {PAutomaticVoiceSettings} from './PAutomaticVoiceSettings'
import {PDefaultTextGenerationSettings} from './PDefaultTextGenerationSettings'

export const PAiSettingsContent = () => (
  <Tabs.Content value="ai">
    <div class="grid gap-4.5 settings-compact:gap-4">
      <PDefaultTextGenerationSettings />
      <PAutomaticVoiceSettings />
    </div>
  </Tabs.Content>
)
