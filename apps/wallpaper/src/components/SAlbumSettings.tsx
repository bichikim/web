import {For, Show} from 'solid-js'
import type {WallpaperController} from '../features/settings'
import type {AlbumWallpaper} from '@winter-love/wallpaper/settings/model'
import {SAlbumItem} from './SAlbumItem'
import {SAlbumImport} from './SAlbumImport'
import {SSelect} from './SSelect'
import {SNumberInput} from './SNumberInput'

const TRANSITIONS: readonly {
  readonly label: string
  readonly value: AlbumWallpaper['transition']
}[] = [
  {label: '페이드', value: 'fade'},
  {label: '와이프', value: 'directional-wipe'},
  {label: '워프', value: 'cross-warp'},
  {label: '원형', value: 'circle-open'},
  {label: 'RGB', value: 'rgb-kinetic'},
  {label: '랜덤', value: 'random'},
  {label: '없음', value: 'none'},
]

interface SAlbumSettingsProps {
  readonly controller: WallpaperController
  readonly onPreview?: (id: string) => void
}
export const SAlbumSettings = (props: SAlbumSettingsProps) => {
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
            aria-label="앨범에 표시할 파일"
          >
            <For each={props.controller.items()}>
              {(item) => (
                <SAlbumItem
                  item={item}
                  controller={props.controller}
                  selected={album()?.mediaIds.includes(item.id) ?? false}
                  onPreview={props.onPreview}
                />
              )}
            </For>
            <SAlbumImport controller={props.controller} />
          </div>
          <div>
            <div class="wallpaper-row">
              <span>표시 방식</span>
              <SSelect
                label="사진·동영상 표시 방식"
                options={[
                  {label: '전체 보기', value: 'contain'},
                  {label: '화면 채우기', value: 'cover'},
                ]}
                value={current().fit ?? 'contain'}
                onChange={handleFit}
              />
            </div>
            <div class="wallpaper-row">
              <span>재생 순서</span>
              <SSelect
                label="재생 순서"
                options={[
                  {label: '순차', value: 'sequential'},
                  {label: '랜덤', value: 'random'},
                ]}
                value={current().order}
                onChange={handleOrder}
              />
            </div>
            <div class="wallpaper-row">
              <span>사진 표시 시간</span>
              <span class="flex items-center justify-end gap-2">
                <SNumberInput
                  label="사진 표시 시간 (초)"
                  min={1}
                  max={300}
                  value={current().photoSeconds}
                  onChange={handleSeconds}
                />
                <span class="text-stone-600">초</span>
              </span>
            </div>
            <div class="wallpaper-row">
              <span>전환 효과</span>
              <SSelect
                label="전환 효과"
                options={TRANSITIONS}
                value={current().transition}
                onChange={handleTransition}
              />
            </div>
            <div class="wallpaper-row">
              <span>동영상 재생</span>
              <SSelect
                label="동영상 재생"
                options={[
                  {label: '끝나면 다음', value: 'end'},
                  {label: '끝난 화면 유지', value: 'hold'},
                  {label: '반복', value: 'loop'},
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
