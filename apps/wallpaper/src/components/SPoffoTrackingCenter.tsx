import {localizeMessage, text as uiText} from '../features/localization'

import {Show} from 'solid-js'
import type {PoffoTrackingOptions} from '@winter-love/wallpaper/settings/tracking'
import {useFacePosition} from '../features/tracking/use-face-position'

interface SPoffoTrackingCenterProps {
  readonly value?: PoffoTrackingOptions
  readonly onChange?: (options: PoffoTrackingOptions) => void | Promise<void>
}

export const SPoffoTrackingCenter = (props: SPoffoTrackingCenterProps) => {
  const face = useFacePosition(() => true)
  const update = (patch: PoffoTrackingOptions) => props.onChange?.({...props.value, ...patch})
  const handleCenter = () => {
    const point = face.point()
    if (point !== null) {
      return update({centerX: point.x, centerY: point.y})
    }
  }
  const handleReset = () => update({centerX: 0, centerY: 0})
  return (
    <>
      <div class="flex flex-wrap justify-end gap-2">
        <button
          type="button"
          class="wallpaper-file-button"
          disabled={face.point() === null || props.onChange === undefined}
          title={uiText('평소 자세로 앉은 뒤 눌러 주세요.')}
          onClick={handleCenter}
        >
          {uiText('현재 자세를 정면으로')}
        </button>
        <button
          type="button"
          class="wallpaper-file-button"
          disabled={props.onChange === undefined}
          onClick={handleReset}
        >
          {uiText('사용자 정면 초기화')}
        </button>
      </div>
      <Show when={face.error()}>
        {(message) => (
          <p role="alert" class="m-0 text-xs text-red-700">
            {localizeMessage(message() ?? '')}
          </p>
        )}
      </Show>
    </>
  )
}
