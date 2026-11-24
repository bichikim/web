import {createMemo, type JSX, Show} from 'solid-js'
import {text as uiText} from '../features/localization'
import type {WallpaperController} from '../features/settings'
import {HSettingsScope} from './HSettingsScope'
import {SMonitorIcon} from './SMonitorIcon'
import {SSegmentedControl} from './SSegmentedControl'

interface SMonitorNavigationProps {
  readonly controller: Pick<WallpaperController, 'monitors' | 'selectedId' | 'selectMonitor'>
  readonly placement?: 'header' | 'content'
  readonly children?: JSX.Element
}

export const SMonitorNavigation = (props: SMonitorNavigationProps) => {
  const options = createMemo(() =>
    props.controller.monitors().map((monitor, index) => ({
      icon: <SMonitorIcon />,
      get label() {
        return uiText('화면 {value0}', {value0: String(index + 1)})
      },
      title: monitor.name,
      value: monitor.id,
    })),
  )
  const segment = createMemo(() =>
    props.placement === 'content'
      ? null
      : {
          label: uiText('화면 선택'),
          onSelect: props.controller.selectMonitor,
          options: options(),
          value: props.controller.selectedId() ?? undefined,
        },
  )
  return (
    <HSettingsScope segment={segment()}>
      <div class="grid gap-4">
        <Show when={props.placement === 'content'}>
          <div class="mx-auto w-full max-w-96">
            <SSegmentedControl
              label={uiText('모니터')}
              options={options()}
              value={props.controller.selectedId() ?? undefined}
              onChange={props.controller.selectMonitor}
            />
          </div>
        </Show>
        {props.children}
      </div>
    </HSettingsScope>
  )
}
