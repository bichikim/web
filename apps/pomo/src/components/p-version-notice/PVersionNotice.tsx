import {createSignal, For, onCleanup, onMount, Show} from 'solid-js'
import * as m from '@paraglide/message'
import type {PSceneStyle} from '../../features/focus-room-animation'
import {
  loadVersionCatalog,
  readViewedRelease,
  selectNoticeReleases,
  type VersionRelease,
  writeViewedRelease,
} from '../../features/version-catalog'
import {getPomoIconClass} from '../icon-style'
import {GLASS_ICON_BUTTON} from '../button-presets'
import {PButton} from '../p-button/PButton'
import {PFeatureRequest} from '../p-feature-request/PFeatureRequest'
import {PModal} from '../p-modal/PModal'
import {POrbitBorder} from '../p-orbit-border/POrbitBorder'
import {PScribbleCircleControl} from '../scribble/CircleControl'
import {VersionReleaseCard} from '../version-notice/ReleaseCard'
import {PLoadingStatus} from '../p-loading-status/PLoadingStatus'
import {DesktopDialogFrame} from '../desktop-dialog/Frame'
import {openDesktopDialog} from '../../features/desktop-mode/dialogs'

export interface PVersionNoticeProps {
  readonly desktopDialog?: boolean
  readonly desktopSurface?: boolean
  readonly featureRequestVisible?: boolean
  readonly onRequestClose?: () => void
  readonly sceneStyle?: PSceneStyle
}

export const PVersionNotice = (props: PVersionNoticeProps) => {
  const [isOpen, setIsOpen] = createSignal(false)
  const [catalogAvailable, setCatalogAvailable] = createSignal(false)
  const [releases, setReleases] = createSignal<ReadonlyArray<VersionRelease>>([])
  const [triggerElement, setTriggerElement] = createSignal<HTMLButtonElement | null>(null)

  onMount(() => {
    let disposed = false

    Promise.all([loadVersionCatalog(), readViewedRelease()])
      .then(([catalog, viewedRelease]) => {
        if (!disposed) {
          setCatalogAvailable(true)
          setReleases(selectNoticeReleases({catalog, now: new Date(), viewedRelease}))
        }
      })
      .catch((error: unknown) => console.error('Failed to prepare version notice.', error))

    onCleanup(() => {
      disposed = true
    })
  })

  const handleOpen = (source: HTMLButtonElement) => {
    setTriggerElement(source)

    if (props.desktopSurface) {
      openDesktopDialog('versionNotice')
        .then(() => setReleases([]))
        .catch((error: unknown) => {
          console.error('Failed to open the desktop version notice dialog.', error)
        })
      return
    }

    setIsOpen(true)
  }
  const persistViewedRelease = () => {
    const [newestRelease] = releases()
    if (newestRelease === undefined) {
      return
    }

    writeViewedRelease({
      formatVersion: 1,
      releasedAt: newestRelease.releasedAt,
      version: newestRelease.version,
    }).catch((error: unknown) => console.error('Failed to persist viewed version release.', error))
  }
  const handleOpenChange = (nextIsOpen: boolean) => {
    const wasOpen = isOpen()
    setIsOpen(nextIsOpen)

    if (nextIsOpen || !wasOpen) {
      return
    }

    persistViewedRelease()
  }
  const handleCloseAutoFocus = () => {
    triggerElement()?.focus()
    setReleases([])
  }
  const showFeatureRequest = () => props.featureRequestVisible ?? true
  const releaseContent = () => (
    <Show
      when={releases().length > 0}
      fallback={<PLoadingStatus message={m.modal_content_loading()} />}
    >
      <div class="grid gap-4">
        <For each={releases()}>{(release) => <VersionReleaseCard release={release} />}</For>
      </div>
    </Show>
  )
  const featureRequestContent = () => (
    <PFeatureRequest
      desktopDialog={props.desktopDialog}
      desktopSurface={props.desktopSurface}
      onRequestClose={props.onRequestClose}
      sceneStyle={props.sceneStyle}
    />
  )
  const desktopVersionNoticeContent = () => (
    <DesktopDialogFrame
      onClose={() => {
        persistViewedRelease()
        props.onRequestClose?.()
      }}
      title={m.version_notice_title()}
    >
      {releaseContent()}
    </DesktopDialogFrame>
  )
  const inlineVersionNoticeContent = () => (
    <>
      <PScribbleCircleControl enabled={props.sceneStyle === 'scribble'}>
        <POrbitBorder>
          <PButton
            {...GLASS_ICON_BUTTON}
            accessibleLabel={m.version_notice_open()}
            tooltip={m.version_notice_open()}
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
        {releaseContent()}
      </PModal>
    </>
  )

  return (
    <Show
      when={!props.desktopDialog || catalogAvailable()}
      fallback={desktopVersionNoticeContent()}
    >
      <Show
        fallback={<Show when={showFeatureRequest()}>{featureRequestContent()}</Show>}
        when={releases().length > 0}
      >
        <Show when={props.desktopDialog} fallback={inlineVersionNoticeContent()}>
          {desktopVersionNoticeContent()}
        </Show>
      </Show>
    </Show>
  )
}
