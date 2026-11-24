import {Show} from 'solid-js'
import ashPoster from '../../../wallpaper-web/public/models/white-cat/poster.webp?inline'
import {text as uiText} from '../features/localization'

interface SWidgetLoadingProps {
  /** Uses a matching bundled silhouette when available; omission uses a neutral loading indicator. */
  readonly assetId?: string | null
  /** Uses the selected imported model's stored alpha mask. */
  readonly silhouette?: string | null | undefined
}

export const SWidgetLoading = (props: SWidgetLoadingProps) => (
  <div
    role="status"
    aria-label={uiText('캐릭터 불러오는 중')}
    class="pointer-events-none absolute inset-0 grid place-items-center"
  >
    <span class="sr-only">{uiText('캐릭터 불러오는 중')}</span>
    <Show
      when={props.assetId === 'builtin:ash' ? ashPoster : props.silhouette}
      fallback={
        <span aria-hidden="true" class="flex animate-pulse gap-1.5 motion-reduce:animate-none">
          <span class="h-1.5 w-1.5 rounded-full bg-slate-400" />
          <span class="h-1.5 w-1.5 rounded-full bg-slate-400" />
          <span class="h-1.5 w-1.5 rounded-full bg-slate-400" />
        </span>
      }
    >
      {(silhouette) => (
        <div
          aria-hidden="true"
          class="h-full w-full animate-pulse bg-slate-300/60 motion-reduce:animate-none
          [mask-image:var(--widget-silhouette)] [mask-size:contain] [mask-repeat:no-repeat]
          [mask-position:center]"
          style={{'--widget-silhouette': `url("${silhouette()}")`}}
        />
      )}
    </Show>
  </div>
)
