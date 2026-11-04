import {useWorkspace} from '../workspace/context'
import {useStudioShortcuts} from './use-studio-shortcuts'
import {Popover} from '@kobalte/core/popover'
import {createEffect, createSignal, Show} from 'solid-js'
import {EditorToast, usePopoverSurface} from '@winter-love/puppet/editor'

import {FileAction} from '../editor/FileAction'
import type {useWorkspaceLayout} from './graph/use-workspace-layout'
import {hasDesktopMenu} from '../desktop/menu'
import {useRuntimeDesktopMenu} from './use-runtime-desktop-menu'
interface RuntimeMenuProps {
  readonly onLoadModel: (file: File | undefined) => void
  readonly workspace?: ReturnType<typeof useWorkspaceLayout>
}
export const RuntimeMenu = (props: RuntimeMenuProps) => {
  const desktopMenu = hasDesktopMenu()
  const workspace = useWorkspace()
  const active = () =>
    workspace === undefined || (workspace.active() && workspace.mode() !== 'editor')
  const [open, setOpen] = createSignal(false)
  createEffect(() => {
    if (!active()) {
      setOpen(false)
    }
  })
  const [trigger, setTrigger] = createSignal<HTMLButtonElement>()
  const [surface, setSurface] = createSignal<HTMLDivElement>()
  const [studioInput, setStudioInput] = createSignal<HTMLInputElement>()
  const popup = usePopoverSurface({open, surface, trigger})
  const handleReturnFocus = () => trigger()?.focus()
  const handleClose = () => {
    setOpen(false)
    const target = trigger()
    queueMicrotask(() => target?.focus())
  }
  const handleEscape = (event: KeyboardEvent) => {
    if (open() && !event.defaultPrevented) {
      event.preventDefault()
      handleClose()
    }
  }
  const handleImport = (file: File | undefined) => {
    if (file !== undefined) {
      props.workspace?.importStudio(file)
    }
  }
  const handleOpen = () => {
    if (open()) {
      handleClose()
    }
    if (desktopMenu) {
      nativeMenu.openStudio()
    } else {
      studioInput()?.click()
    }
  }
  const handleFileChange = (event: Event & {currentTarget: HTMLInputElement}) => {
    const file = event.currentTarget.files?.[0]
    event.currentTarget.value = ''
    handleImport(file)
  }
  const handleSave = () => {
    if (open()) {
      handleClose()
    }
    props.workspace?.exportStudio()
  }
  const nativeMenu = useRuntimeDesktopMenu({
    active,
    desktopMenu,
    onLoadModel: (file) => props.onLoadModel(file),
    onSave: handleSave,
    workspace: () => props.workspace,
  })
  const handleDismiss = () => {
    nativeMenu.dismissError()
    props.workspace?.dismissError()
  }
  const shortcut = useStudioShortcuts({
    enabled: () => active() && props.workspace !== undefined,
    onOpen: handleOpen,
    onSave: handleSave,
  })
  return (
    <>
      <Popover forceMount open={open()} onOpenChange={setOpen}>
        <Show when={!desktopMenu}>
          <Popover.Trigger
            ref={setTrigger}
            class="toolbar-menu-trigger"
            aria-label="메인 메뉴"
            type="button"
          >
            <span class="puppet-icon puppet-icon-menu-2" aria-hidden="true" />
          </Popover.Trigger>
        </Show>
        <Popover.Content
          ref={setSurface}
          aria-label="파일 작업"
          onEscapeKeyDown={handleEscape}
          class="toolbar-menu-content puppet-runtime-menu"
          popover="manual"
          data-top-layer={popup.active()}
          style={{
            '--runtime-menu-x': `${popup.position().x}px`,
            '--runtime-menu-y': `${popup.position().y}px`,
          }}
        >
          <FileAction
            label="모델 불러오기"
            accept=".json,.poffo,application/json"
            onClose={handleClose}
            onReturnFocus={handleReturnFocus}
            onImport={props.onLoadModel}
          />
          <Show when={props.workspace}>
            <hr />
            <button
              type="button"
              class="toolbar-menu-history-action"
              aria-label="스튜디오 불러오기"
              aria-keyshortcuts={shortcut.openKeys}
              onClick={handleOpen}
            >
              <span>스튜디오 불러오기</span>
              <span class="editor-context-menu-shortcut" aria-hidden="true">
                {shortcut.openLabel}
              </span>
            </button>
            <input
              ref={setStudioInput}
              type="file"
              hidden
              aria-label="스튜디오 불러오기"
              accept=".json,application/json"
              onChange={handleFileChange}
            />
            <button
              type="button"
              class="toolbar-menu-history-action"
              aria-label="스튜디오 저장"
              aria-keyshortcuts={shortcut.saveKeys}
              onClick={handleSave}
            >
              <span>스튜디오 저장</span>
              <span class="editor-context-menu-shortcut" aria-hidden="true">
                {shortcut.saveLabel}
              </span>
            </button>
          </Show>
        </Popover.Content>
      </Popover>
      <EditorToast
        tone="error"
        message={nativeMenu.error() ?? props.workspace?.error() ?? undefined}
        onDismiss={handleDismiss}
      />
    </>
  )
}
