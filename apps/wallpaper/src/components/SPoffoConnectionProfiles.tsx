import {Show} from 'solid-js'
import type {PoffoWidget} from '@winter-love/wallpaper/settings/library-model'
import type {TrackingParameter} from '../features/tracking/types'
import {useConnectionProfiles} from '../features/connection-profiles'
import {SFileInput} from './SFileInput'

interface SPoffoConnectionProfilesProps {
  readonly widget?: PoffoWidget
  readonly parameters?: readonly TrackingParameter[]
  readonly loading?: boolean
}

export const SPoffoConnectionProfiles = (props: SPoffoConnectionProfilesProps) => {
  const profiles = useConnectionProfiles({
    parameters: () => props.parameters ?? [],
    widget: () => props.widget,
  })
  return (
    <section aria-label="연결 설정 파일" class="grid gap-2 text-[13px]">
      <div class="flex flex-wrap items-center gap-2">
        <button
          type="button"
          class="wallpaper-file-button"
          disabled={props.widget === undefined || profiles.busy()}
          onClick={profiles.exportFile}
        >
          연결 JSON 저장
        </button>
        <SFileInput
          label="연결 JSON 가져오기"
          accept=".json,application/json"
          disabled={props.widget === undefined || props.loading || profiles.busy()}
          onFiles={profiles.importFile}
        />
        <Show when={profiles.hasBuiltin()}>
          <button
            type="button"
            class="wallpaper-file-button"
            disabled={profiles.busy()}
            onClick={profiles.restore}
          >
            기본 연결 적용
          </button>
        </Show>
      </div>
      <Show when={profiles.error()}>
        {(message) => (
          <p role="alert" class="m-0 text-xs text-red-700">
            {message()}
          </p>
        )}
      </Show>
    </section>
  )
}
