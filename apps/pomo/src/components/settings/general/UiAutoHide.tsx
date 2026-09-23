import * as m from '@paraglide/message'
import {Show} from 'solid-js'
import type {useUiAutoHide} from 'src/features/ui-auto-hide'
import {PSelect} from '../../p-select/PSelect'
import {PSwitch} from '../../p-switch/PSwitch'

interface PUiAutoHideSettingsProps {
  readonly controller?: ReturnType<typeof useUiAutoHide>
}
export const PUiAutoHideSettings = (props: PUiAutoHideSettingsProps) => {
  const handleSecondsChange = (value: string) => props.controller?.onSecondsChange(Number(value))
  return (
    <Show when={props.controller}>
      {(controller) => (
        <>
          <PSwitch
            checked={controller().enabled()}
            onChange={controller().onEnabledChange}
            label={m.settings_ui_auto_hide()}
            description={m.settings_ui_auto_hide_description()}
          />
          <PSelect
            label={m.settings_ui_auto_hide_delay()}
            value={String(controller().seconds())}
            disabled={!controller().enabled()}
            onChange={handleSecondsChange}
            options={[
              {label: m.settings_ui_auto_hide_five_seconds(), value: '5'},
              {label: m.settings_ui_auto_hide_fifteen_seconds(), value: '15'},
              {label: m.settings_ui_auto_hide_thirty_seconds(), value: '30'},
              {label: m.settings_ui_auto_hide_one_minute(), value: '60'},
              {label: m.settings_ui_auto_hide_five_minutes(), value: '300'},
            ]}
          />
        </>
      )}
    </Show>
  )
}
