import {Match, Switch} from 'solid-js'
import {emitTo} from '@tauri-apps/api/event'
import type {AlbumWallpaper, PuppetWallpaper} from '@winter-love/wallpaper/settings/model'
import {useBackgroundSettings} from '../features/background/use-background-settings'
import {SAlbumBackground} from './SAlbumBackground'
import {SPositionedPoffo} from './SPositionedPoffo'

interface SBackgroundProps {
  readonly monitorId: string
}

const report = (cause: unknown) => {
  console.error('Wallpaper renderer failed', cause)
  emitTo('manager', 'wallpaper-error', {message: '배경 파일을 표시하지 못했어요.'}).catch(
    (error: unknown) => console.error('Wallpaper error notification failed', error),
  )
}

export const SBackground = (props: SBackgroundProps) => {
  const background = useBackgroundSettings(() => props.monitorId, report)
  const album = (): AlbumWallpaper | null => {
    const content = background.settings()?.content
    return content?.mode === 'album' ? content : null
  }
  const puppet = (): PuppetWallpaper | null => {
    const content = background.settings()?.content
    return content?.mode === 'puppet' ? content : null
  }
  return (
    <main class="fixed inset-0 overflow-hidden bg-stone-950" aria-label="Wallpaper 배경">
      <Switch>
        <Match when={album()}>
          {(content) => (
            <SAlbumBackground
              content={content}
              items={background.items}
              load={background.loadMedia}
              onError={report}
            />
          )}
        </Match>
        <Match when={puppet()}>
          {(content) => (
            <SPositionedPoffo
              assetId={() => content().assetId}
              load={background.loadPuppet}
              onError={report}
              placement={() => content().placement}
              tracking={() => content().tracking}
              trackingBindings={() => content().trackingBindings}
              trackingOptions={() => content().trackingOptions}
              onChange={(placement) => background.movePoffo(placement).catch(report)}
            />
          )}
        </Match>
      </Switch>
    </main>
  )
}
