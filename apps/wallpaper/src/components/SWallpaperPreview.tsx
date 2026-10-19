import {createMemo, Match, Show, Switch} from 'solid-js'
import type {BackgroundMedia} from '@winter-love/wallpaper/model'
import type {
  PoffoTrackingBindings,
  PoffoTrackingOptions,
} from '@winter-love/wallpaper/settings/tracking'
import type {PoffoPlacement} from '@winter-love/wallpaper/settings/model'
import type {WallpaperController} from '../features/settings'
import {useMediaUrl} from '../features/settings/use-media-url'
import {SPoffoCalibrationPreview} from './SPoffoCalibrationPreview'
import {SVideoPreview} from './SVideoPreview'

const DEFAULT_MONITOR_SIZE = {height: 9, width: 16}

interface SWallpaperPreviewProps {
  readonly controller: WallpaperController
  readonly item?: BackgroundMedia | null
}
export const SWallpaperPreview = (props: SWallpaperPreviewProps) => {
  const content = () => props.controller.current()!.content
  const selected = createMemo(() => {
    const current = content()
    if (current.mode !== 'album') {
      return null
    }
    return (
      props.item ??
      props.controller.items().find((item) => current.mediaIds.includes(item.id)) ??
      null
    )
  })
  const media = useMediaUrl({
    id: () => selected()?.id ?? null,
    load: (id) => props.controller.loadMedia(id),
  })
  const assetId = createMemo(() => {
    const current = content()
    return current.mode === 'puppet' ? current.assetId : null
  })
  const website = createMemo(() => {
    const current = content()
    return current.mode === 'website' ? current.url : null
  })
  const placement = () => {
    const current = content()
    return current.mode === 'puppet' ? current.placement : undefined
  }
  const tracking = () => {
    const current = content()
    return current.mode === 'puppet' ? current.tracking : undefined
  }
  const trackingBindings = () => {
    const current = content()
    return current.mode === 'puppet' ? current.trackingBindings : undefined
  }
  const trackingOptions = () => {
    const current = content()
    return current.mode === 'puppet' ? current.trackingOptions : undefined
  }
  const handleOptions = (trackingOptions: PoffoTrackingOptions) => {
    const current = content()
    if (current.mode === 'puppet') {
      return props.controller.setContent({...current, trackingOptions})
    }
  }
  const handleBindings = (trackingBindings: PoffoTrackingBindings) => {
    const current = content()
    if (current.mode === 'puppet') {
      return props.controller.setContent({...current, trackingBindings})
    }
  }
  const screenAspect = () => {
    const monitor = props.controller
      .monitors()
      .find((item) => item.id === props.controller.selectedId())
    return (
      (monitor?.width ?? DEFAULT_MONITOR_SIZE.width) /
      (monitor?.height ?? DEFAULT_MONITOR_SIZE.height)
    )
  }
  const movePoffo = (placement: PoffoPlacement) => {
    const current = content()
    if (current.mode === 'puppet') {
      return props.controller.setContent({...current, placement})
    }
  }
  const host = () => new URL(website() ?? 'about:blank').hostname
  return (
    <Show
      when={assetId()}
      keyed
      fallback={
        <figure
          aria-label="배경 미리보기"
          class="relative m-0 grid h-52 w-full place-items-center overflow-hidden rounded-xl bg-stone-200"
        >
          <Switch>
            <Match when={content().mode === 'album'}>
              <Show
                when={media.url()}
                fallback={
                  <p class="m-0 px-5 text-center text-sm text-stone-600">
                    {media.failed()
                      ? '미리보기를 불러올 수 없어요.'
                      : '사진·동영상을 추가해 주세요.'}
                  </p>
                }
              >
                {(url) => (
                  <Switch>
                    <Match when={selected()?.kind === 'photo'}>
                      <img
                        src={url()}
                        alt={selected()?.name ?? ''}
                        class="absolute inset-0 h-full w-full object-contain"
                      />
                    </Match>
                    <Match when={selected()?.kind === 'video'}>
                      <SVideoPreview src={url()} label={selected()?.name} autoplay contain />
                    </Match>
                  </Switch>
                )}
              </Show>
            </Match>
            <Match when={content().mode === 'website'}>
              <div class="grid max-w-full justify-items-center gap-2 px-6 text-center text-stone-700">
                <span aria-hidden="true" class="text-3xl">
                  ◎
                </span>
                <p class="m-0 max-w-full truncate text-sm font-medium">
                  {host() || '웹사이트 주소를 입력해 주세요.'}
                </p>
                <Show when={website()}>
                  <p class="m-0 max-w-full truncate text-xs text-stone-600">{website()}</p>
                </Show>
              </div>
            </Match>
            <Match when={content().mode === 'puppet'}>
              <p class="m-0 text-sm text-stone-600">캐릭터를 선택해 주세요.</p>
            </Match>
          </Switch>
        </figure>
      }
    >
      {(id) => (
        <SPoffoCalibrationPreview
          label="배경 미리보기"
          targetId={props.controller.selectedId() ?? undefined}
          mode={tracking() ?? 'off'}
          screenAspect={screenAspect()}
          assetId={() => id}
          load={props.controller.loadPuppet}
          placement={placement}
          bindings={trackingBindings}
          value={trackingOptions()}
          onChange={handleOptions}
          onBindingsChange={handleBindings}
          onPlacementChange={movePoffo}
        />
      )}
    </Show>
  )
}
