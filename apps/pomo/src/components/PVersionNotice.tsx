import {createSignal, For, onCleanup, onMount, Show} from 'solid-js'
import * as m from '@paraglide/message'
import type {PSceneStyle} from '../features/focus-room-animation'
import {
  loadVersionCatalog,
  readViewedRelease,
  selectRecentUnseenReleases,
  type VersionRelease,
  writeViewedRelease,
} from '../features/version-catalog'
import {getPomoIconClass} from './icon-style'
import {PIconButton} from './PIconButton'
import {PModal} from './PModal'
import {POrbitBorder} from './POrbitBorder'
import {PScribbleCircleControl} from './scribble/CircleControl'
import {VersionReleaseCard} from './version-notice/ReleaseCard'

export interface PVersionNoticeProps {
  readonly sceneStyle?: PSceneStyle
}

export const PVersionNotice = (props: PVersionNoticeProps) => {
  const [isOpen, setIsOpen] = createSignal(false)
  const [releases, setReleases] = createSignal<ReadonlyArray<VersionRelease>>([])
  const [triggerElement, setTriggerElement] = createSignal<HTMLButtonElement | null>(null)

  onMount(() => {
    let disposed = false

    Promise.all([loadVersionCatalog(), readViewedRelease()])
      .then(([catalog, viewedRelease]) => {
        if (!disposed) {
          setReleases(selectRecentUnseenReleases({catalog, now: new Date(), viewedRelease}))
        }
      })
      .catch((error: unknown) => console.error('Failed to prepare version notice.', error))

    onCleanup(() => {
      disposed = true
    })
  })

  const handleOpen = (source: HTMLButtonElement) => {
    setTriggerElement(source)
    setIsOpen(true)
  }
  const handleOpenChange = (nextIsOpen: boolean) => {
    const [newestRelease] = releases()
    const wasOpen = isOpen()
    setIsOpen(nextIsOpen)

    if (nextIsOpen || !wasOpen || newestRelease === undefined) {
      return
    }

    writeViewedRelease({
      formatVersion: 1,
      releasedAt: newestRelease.releasedAt,
      version: newestRelease.version,
    }).catch((error: unknown) => console.error('Failed to persist viewed version release.', error))
  }
  const handleCloseAutoFocus = () => {
    triggerElement()?.focus()
    setReleases([])
  }

  return (
    <Show when={releases().length > 0}>
      <PScribbleCircleControl enabled={props.sceneStyle === 'scribble'}>
        <POrbitBorder>
          <PIconButton
            accessibleLabel={m.version_notice_open()}
            feedback={m.version_notice_feedback()}
            icon={getPomoIconClass('i-tabler-gift', props.sceneStyle)}
            onPress={handleOpen}
          />
        </POrbitBorder>
      </PScribbleCircleControl>
      <PModal
        description={m.version_notice_description()}
        isOpen={isOpen()}
        onCloseAutoFocus={handleCloseAutoFocus}
        onOpenChange={handleOpenChange}
        placement="top"
        size="wide"
        title={m.version_notice_title()}
      >
        <div class="grid gap-4">
          <For each={releases()}>{(release) => <VersionReleaseCard release={release} />}</For>
        </div>
      </PModal>
    </Show>
  )
}
