import {Show} from 'solid-js'
import type {useUiAutoHide} from 'src/features/ui-auto-hide'
import {PSelect} from '../../PSelect'
import {PSwitch} from '../../PSwitch'

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
            label="UI 자동 숨김"
            description="조작하지 않으면 배경만 남깁니다. 마우스를 움직이거나 화면을 터치하면 UI가 다시 나타납니다."
          />
          <PSelect
            label="숨기기까지 대기 시간"
            value={String(controller().seconds())}
            disabled={!controller().enabled()}
            onChange={handleSecondsChange}
            options={[
              {label: '5초', value: '5'},
              {label: '15초', value: '15'},
              {label: '30초', value: '30'},
              {label: '1분', value: '60'},
              {label: '5분', value: '300'},
            ]}
          />
        </>
      )}
    </Show>
  )
}
