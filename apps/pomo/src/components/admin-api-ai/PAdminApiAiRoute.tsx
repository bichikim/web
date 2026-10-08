import {Index, Show} from 'solid-js'
import {type AdminApiAiController, type ApiAiRoute} from 'src/features/admin-api-ai'
import {BUTTON_CLASSES, INPUT_CLASSES} from './styles'

interface PAdminApiAiRouteProps {
  readonly index: number
  readonly model: AdminApiAiController
  readonly route: ApiAiRoute
}

export const PAdminApiAiRoute = (props: PAdminApiAiRouteProps) => (
  <div class="grid min-w-0 gap-4 rounded-4 border border-white/15 bg-white/3 p-4 sm:p-5">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <h2 class="m-0 text-base font-750">
        {props.index + 1}순위{props.index === 0 ? ' · 먼저 사용' : ' · 폴백'}
      </h2>
      <div class="flex flex-wrap gap-2">
        <button
          aria-label={`${props.index + 1}순위 위로 이동`}
          class={BUTTON_CLASSES}
          disabled={props.index === 0}
          type="button"
          onClick={() => props.model.moveRoute(props.index, -1)}
        >
          ↑ 위로
        </button>
        <button
          aria-label={`${props.index + 1}순위 아래로 이동`}
          class={BUTTON_CLASSES}
          disabled={props.index === props.model.routes().length - 1}
          type="button"
          onClick={() => props.model.moveRoute(props.index, 1)}
        >
          ↓ 아래로
        </button>
        <button
          aria-label={`${props.index + 1}순위 삭제`}
          class={BUTTON_CLASSES}
          disabled={props.model.routes().length === 1}
          type="button"
          onClick={() => props.model.removeRoute(props.index)}
        >
          삭제
        </button>
      </div>
    </div>
    <div class="grid min-w-0 gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
      <label class="grid min-w-0 gap-2 text-sm text-white/80">
        제공자
        <select
          aria-label={`${props.index + 1}순위 제공자`}
          class={INPUT_CLASSES}
          onChange={(event) => props.model.changeProvider(props.index, event.currentTarget.value)}
        >
          <Show
            when={
              !(props.model.saved()?.providers ?? []).some(
                (provider) => provider.id === props.route.providerId,
              )
            }
          >
            <option value={props.route.providerId} selected>
              {props.route.providerId} · 키 설정 필요
            </option>
          </Show>
          <Index each={props.model.saved()?.providers ?? []}>
            {(provider) => (
              <option value={provider().id} selected={props.route.providerId === provider().id}>
                {provider().id}
              </option>
            )}
          </Index>
        </select>
      </label>
      <label class="grid min-w-0 gap-2 text-sm text-white/80">
        모델 ID
        <select
          aria-label={`${props.index + 1}순위 모델 ID`}
          class={INPUT_CLASSES}
          required
          onChange={(event) =>
            props.model.replaceRoute(props.index, {
              ...props.route,
              model: event.currentTarget.value,
            })
          }
        >
          <option value="" selected={props.route.model === ''}>
            모델 선택
          </option>
          <Index
            each={(props.model.saved()?.catalog ?? []).filter(
              (entry) => entry.providerId === props.route.providerId,
            )}
          >
            {(entry) => (
              <option value={entry().model} selected={props.route.model === entry().model}>
                {entry().label ? `${entry().label} · ${entry().model}` : entry().model}
              </option>
            )}
          </Index>
        </select>
      </label>
    </div>
  </div>
)
