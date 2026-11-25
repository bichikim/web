import type {PoffoWidget} from '@winter-love/wallpaper/settings/library-model'
import type {PoffoTouch} from '@winter-love/wallpaper/settings/touch'
import type {PoffoTracking} from '@winter-love/wallpaper/settings/tracking'
import {text as uiText} from '../features/localization'
import type {ParameterSource} from '../features/tracking/use-parameters'
import {HSettingsScope} from './HSettingsScope'
import {SPoffoMotionSettings} from './SPoffoMotionSettings'
import {SPoffoTouchSettings} from './SPoffoTouchSettings'
import {SPoffoTrackingSettings} from './SPoffoTrackingSettings'
import {SPoffoWidgetPlacement} from './SPoffoWidgetPlacement'

interface SPoffoWidgetControlsProps {
  readonly widget?: PoffoWidget | null
  readonly section?: string
  readonly motions?: readonly string[]
  readonly source: ParameterSource
  readonly onTracking?: (mode: PoffoTracking) => void | Promise<void>
  readonly onMotion?: (motion: string | null | undefined) => void | Promise<void>
  readonly onTouch?: (touch: PoffoTouch) => void | Promise<void>
}

export const SPoffoWidgetControls = (props: SPoffoWidgetControlsProps) => (
  <>
    <div hidden={props.section !== 'gaze'}>
      <section aria-label={uiText('시선 입력')} class="grid gap-3">
        <div class="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3 text-[13px]">
          <span>{uiText('트래킹 입력')}</span>
          <SPoffoTrackingSettings
            label={uiText('트래킹 입력')}
            value={props.widget?.tracking}
            onChange={props.onTracking}
          />
        </div>
      </section>
    </div>
    <div hidden={props.section !== 'basic'}>
      <section aria-label={uiText('위젯 기본 설정')} class="grid gap-3">
        <SPoffoWidgetPlacement widgetId={props.widget?.id} />
        <SPoffoMotionSettings
          motions={props.motions}
          value={props.widget?.motionId}
          onChange={props.onMotion}
        />
      </section>
    </div>
    <div hidden={props.section !== 'touch'}>
      <HSettingsScope active={props.section === 'touch'}>
        <SPoffoTouchSettings
          source={props.source}
          value={props.widget?.speech?.touch}
          onChange={props.onTouch}
        />
      </HSettingsScope>
    </div>
  </>
)
