import {text as uiText} from '../features/localization'
import {createSignal, For, Show} from 'solid-js'
import type {WallpaperController} from '../features/settings'
import {isBuiltinMedia} from '../features/builtin-assets'
import type {BackgroundMedia} from '@winter-love/wallpaper/model'
import {SAlbumDeleteDialog} from './SAlbumDeleteDialog'
import type {AlbumWallpaper} from '@winter-love/wallpaper/settings/model'
import {SAlbumItem} from './SAlbumItem'
import {SAlbumImport} from './SAlbumImport'
import {SSelect} from './SSelect'
import {SNumberInput} from './SNumberInput'

const TRANSITIONS: readonly {
  readonly label: string
  readonly value: AlbumWallpaper['transition']
}[] = [
  {
    get label() {
      return uiText('페이드')
    },
    value: 'fade',
  },
  {
    get label() {
      return uiText('와이프')
    },
    value: 'directional-wipe',
  },
  {
    get label() {
      return uiText('워프')
    },
    value: 'cross-warp',
  },
  {
    get label() {
      return uiText('원형')
    },
    value: 'circle-open',
  },
  {label: 'RGB', value: 'rgb-kinetic'},
  {
    get label() {
      return uiText('랜덤')
    },
    value: 'random',
  },
  {
    get label() {
      return uiText('없음')
    },
    value: 'none',
  },
]

const PLAYBACK_ORDERS = [
  {
    get label() {
      return uiText('순차')
    },
    value: 'sequential',
  },
  {
    get label() {
      return uiText('랜덤')
    },
    value: 'random',
  },
] as const

interface SAlbumSettingsProps {
  readonly controller: WallpaperController
  readonly onPreview?: (id: string) => void
}
export const SAlbumSettings = (props: SAlbumSettingsProps) => {
  const [removing, setRemoving] = createSignal<BackgroundMedia | null>(null)
  const requestRemove = (item: BackgroundMedia) => {
    if (isBuiltinMedia(item.id)) {
      return props.controller.removeMedia(item.id)
    }
    setRemoving(item)
  }
  const album = (): AlbumWallpaper | null => {
    const current = props.controller.current()!.content
    return current.mode === 'album' ? current : null
  }
  const saveContent = (patch: Partial<AlbumWallpaper>) => {
    const current = album()
    if (current !== null) {
      return props.controller.setContent({...current, ...patch})
    }
  }
  const handleFit = (fit: NonNullable<AlbumWallpaper['fit']>) => saveContent({fit})
  const handleOrder = (order: AlbumWallpaper['order']) => saveContent({order})
  const handleSeconds = (photoSeconds: number) => saveContent({photoSeconds})
  const handleTransition = (transition: AlbumWallpaper['transition']) => saveContent({transition})
  const handleVideo = (videoMode: AlbumWallpaper['videoMode']) => saveContent({videoMode})
  return (
    <Show when={album()}>
      {(current) => (
        <>
          <div
            class="-m-1 flex min-w-0 gap-2 overflow-x-auto p-1"
            role="group"
            aria-label={uiText('앨범에 표시할 파일')}
          >
            <For each={props.controller.items()}>
              {(item) => (
                <SAlbumItem
                  item={item}
                  controller={props.controller}
                  selected={album()?.mediaIds.includes(item.id) ?? false}
                  onPreview={props.onPreview}
                  onRemove={() => requestRemove(item)}
                />
              )}
            </For>
            <SAlbumImport controller={props.controller} />
          </div>
          <Show when={props.controller.hasHiddenMedia()}>
            <button
              type="button"
              class="wallpaper-file-button justify-self-end"
              onClick={props.controller.restoreBuiltinMedia}
            >
              {uiText('기본 배경 복원')}
            </button>
          </Show>
          <Show when={removing()}>
            {(item) => (
              <SAlbumDeleteDialog
                name={item().name}
                error={props.controller.error()}
                onDelete={() => props.controller.removeMedia(item().id)}
                onClose={() => setRemoving(null)}
              />
            )}
          </Show>
          <div>
            <div class="wallpaper-row">
              <span>{uiText('표시 방식')}</span>
              <SSelect
                label={uiText('사진·동영상 표시 방식')}
                options={[
                  {
                    label: uiText('전체 보기'),
                    value: 'contain',
                  },
                  {
                    label: uiText('화면 채우기'),
                    value: 'cover',
                  },
                ]}
                value={current().fit ?? 'contain'}
                onChange={handleFit}
              />
            </div>
            <div class="wallpaper-row">
              <span>{uiText('재생 순서')}</span>
              <SSelect
                label={uiText('재생 순서')}
                options={PLAYBACK_ORDERS}
                value={current().order}
                onChange={handleOrder}
              />
            </div>
            <div class="wallpaper-row">
              <span>{uiText('사진 표시 시간')}</span>
              <span class="flex items-center justify-end gap-2">
                <SNumberInput
                  label={uiText('사진 표시 시간 (초)')}
                  min={1}
                  max={300}
                  value={current().photoSeconds}
                  onChange={handleSeconds}
                />
                <span class="text-stone-600">{uiText('초')}</span>
              </span>
            </div>
            <div class="wallpaper-row">
              <span>{uiText('전환 효과')}</span>
              <SSelect
                label={uiText('전환 효과')}
                options={TRANSITIONS}
                value={current().transition}
                onChange={handleTransition}
              />
            </div>
            <div class="wallpaper-row">
              <span>{uiText('동영상 재생')}</span>
              <SSelect
                label={uiText('동영상 재생')}
                options={[
                  {
                    label: uiText('끝나면 다음'),
                    value: 'end',
                  },
                  {
                    label: uiText('끝난 화면 유지'),
                    value: 'hold',
                  },
                  {
                    label: uiText('반복'),
                    value: 'loop',
                  },
                ]}
                value={current().videoMode}
                onChange={handleVideo}
              />
            </div>
          </div>
        </>
      )}
    </Show>
  )
}
