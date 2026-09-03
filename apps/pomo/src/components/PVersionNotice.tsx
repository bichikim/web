import {createSignal, createUniqueId, For, onCleanup, onMount, Show} from 'solid-js'

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

export interface PVersionNoticeProps {
  readonly sceneStyle?: PSceneStyle
}

interface VersionReleaseCardProps {
  readonly release: VersionRelease
}

const VersionReleaseCard = (props: VersionReleaseCardProps) => {
  const titleId = createUniqueId()
  const hasChanges = () => props.release.changes.length > 0

  return (
    <article
      aria-labelledby={titleId}
      class="overflow-hidden rounded-5 border border-solid border-border bg-surface"
    >
      <header class="flex items-center gap-3 p-4 settings-compact:p-3.5">
        <span
          aria-hidden="true"
          class={
            'grid size-10 flex-none place-items-center rounded-control border border-solid ' +
            'border-border bg-secondary-soft text-highlight'
          }
        >
          <span class={hasChanges() ? 'i-tabler-sparkles size-5' : 'i-tabler-rocket size-5'} />
        </span>
        <div class="min-w-0 flex-1">
          <h3 class="m-0 text-[0.9375rem] font-750 leading-5 text-foreground" id={titleId}>
            {props.release.title}
          </h3>
          <time
            class="mt-1 block text-xs font-650 leading-4 text-muted-foreground"
            dateTime={props.release.releasedAt}
          >
            {props.release.version}
          </time>
        </div>
      </header>

      <Show
        fallback={
          <p class="m-0 border-t border-solid border-border px-4 py-3.5 text-sm leading-6 text-muted-foreground">
            {m.version_notice_initial_release()}
          </p>
        }
        when={hasChanges()}
      >
        <ul class="m-0 list-none border-t border-solid border-border p-0">
          <For each={props.release.changes}>
            {(change) => (
              <li
                class={
                  'flex items-start gap-3 border-b border-solid border-border px-4 py-3.5 ' +
                  'text-sm leading-6 text-foreground last:border-b-0 settings-compact:px-3.5'
                }
                role="listitem"
              >
                <span
                  aria-hidden="true"
                  class="i-tabler-check mt-1 size-4 flex-none text-highlight"
                />
                <span>{change}</span>
              </li>
            )}
          </For>
        </ul>
      </Show>
    </article>
  )
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

export default PVersionNotice
