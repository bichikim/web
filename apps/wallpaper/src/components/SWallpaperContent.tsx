import {createMemo, createSignal, Match, Show, Switch} from 'solid-js'
import type {WallpaperController} from '../features/settings'
import type {WallpaperContent} from '@winter-love/wallpaper/settings/model'
import {SAlbumSettings} from './SAlbumSettings'
import {SAMPLE_PUPPET_ID} from '../features/background/constants'
import {SSegmentedControl} from './SSegmentedControl'
import {SWallpaperPreview} from './SWallpaperPreview'
import {SPoffoAssetPicker} from './SPoffoAssetPicker'
import {SWebsiteSettings} from './SWebsiteSettings'
import type {WallpaperLibraryController} from '../features/library'
import {SPoffoPositionSettings} from './SPoffoPositionSettings'
import {SPoffoTrackingSettings} from './SPoffoTrackingSettings'
import type {PoffoTracking} from '@winter-love/wallpaper/settings/tracking'

const MODES: readonly {readonly value: WallpaperContent['mode']; readonly label: string}[] = [
  {label: '앨범', value: 'album'},
  {label: '웹사이트', value: 'website'},
  {label: 'Poffo', value: 'puppet'},
]
interface SWallpaperContentProps {
  readonly controller: WallpaperController
  readonly library?: WallpaperLibraryController
}
export const SWallpaperContent = (props: SWallpaperContentProps) => {
  const content = () => props.controller.current()!.content
  const [previewId, setPreviewId] = createSignal<string | null>(null)
  const preview = createMemo(() => {
    const current = content()
    if (current.mode !== 'album') {
      return null
    }
    const items = props.controller.items()
    return (
      items.find((item) => item.id === previewId()) ??
      items.find((item) => current.mediaIds.includes(item.id)) ??
      null
    )
  })
  const handleMode = (mode: WallpaperContent['mode']) => {
    const monitorId = props.controller.selectedId()
    if (mode === 'website' && monitorId !== null) {
      return props.controller.setContent({mode, url: props.library?.lastWebsite(monitorId) ?? null})
    }
    return props.controller.changeMode(mode)
  }
  const handlePuppet = (files: readonly File[]) => {
    const [file] = files
    if (file !== undefined) {
      return props.controller.addPuppet(file)
    }
  }
  const handleAsset = (value: string) => {
    const current = content()
    return props.controller.setContent({
      ...(current.mode === 'puppet' ? current : {}),
      assetId: value || null,
      mode: 'puppet',
    })
  }
  const assets = createMemo(() => [
    {label: '선택해 주세요', value: ''},
    {label: 'Poffo 샘플', value: SAMPLE_PUPPET_ID},
    ...props.controller.puppets().map((puppet) => ({label: puppet.name, value: puppet.id})),
  ])
  const asset = () => {
    const current = content()
    return current.mode === 'puppet' ? (current.assetId ?? '') : ''
  }
  const tracking = () => {
    const current = content()
    return current.mode === 'puppet' ? current.tracking : undefined
  }
  const handleTracking = (tracking: PoffoTracking) => {
    const current = content()
    if (current.mode === 'puppet') {
      return props.controller.setContent({...current, tracking})
    }
  }
  return (
    <section aria-label="배경" class="grid gap-4">
      <Show when={content().mode !== 'puppet'}>
        <SWallpaperPreview controller={props.controller} item={preview()} />
      </Show>
      <SSegmentedControl
        label="배경 종류"
        options={MODES}
        value={content().mode}
        onChange={handleMode}
      />
      <Switch>
        <Match when={content().mode === 'website'}>
          <SWebsiteSettings controller={props.controller} library={props.library} />
        </Match>
        <Match when={content().mode === 'puppet'}>
          <SPoffoAssetPicker
            options={assets()}
            value={asset()}
            onChange={handleAsset}
            onFiles={handlePuppet}
            disabled={props.controller.busy()}
          />
          <section
            aria-label="Poffo 배경 조정"
            class="grid gap-3 border-0 border-t border-solid border-stone-200 pt-4"
          >
            <div class="flex items-center justify-between gap-3">
              <h2 class="m-0 text-[13px] font-medium text-stone-700">배경 조정</h2>
              <div class="flex items-center gap-2 text-[13px] text-stone-700">
                <span class="shrink-0">트래킹 입력</span>
                <SPoffoTrackingSettings value={tracking()} onChange={handleTracking} />
              </div>
            </div>
            <SWallpaperPreview controller={props.controller} />
            <SPoffoPositionSettings controller={props.controller} />
          </section>
        </Match>
        <Match when={content().mode === 'album'}>
          <SAlbumSettings controller={props.controller} onPreview={setPreviewId} />
        </Match>
      </Switch>
    </section>
  )
}
