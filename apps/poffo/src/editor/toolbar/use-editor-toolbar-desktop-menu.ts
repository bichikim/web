import {createEffect, onCleanup, onMount} from 'solid-js'
import type {PuppetExampleDocument} from '@winter-love/puppet/editor'
import type {WorkspaceContextValue} from '../../workspace/types'
import {
  DESKTOP_MENU_ACTION,
  type DesktopMenuAction,
  listenDesktopMenuAction,
  setDesktopMenuItemEnabled,
} from '../../desktop/menu'
import type {EditorToolbarMenuProps} from './types'
import {useFileDialog} from '../../desktop/use-file-dialog'

interface UseEditorToolbarDesktopMenuProps {
  readonly desktopMenu: boolean
  readonly toolbar: EditorToolbarMenuProps
  readonly workspace?: WorkspaceContextValue
  readonly onHelpOpen: () => void
  readonly onThemeOpen: () => void
  readonly onExampleOpen: (example: PuppetExampleDocument) => void
  readonly onRecoveryOpen: () => void
}

export const useEditorToolbarDesktopMenu = (props: UseEditorToolbarDesktopMenuProps) => {
  const dialog = useFileDialog()
  const active = () => {
    const {workspace} = props
    return workspace?.active() !== false && workspace?.mode() === 'editor'
  }
  const openFile = async (
    title: string,
    onImport: ((file: File | undefined) => void) | undefined,
    extensions: ReadonlyArray<string> = ['png', 'psd', 'json', 'poffo'],
  ) => {
    const file = await dialog.openFile({extensions, title})
    if (file !== undefined && active()) {
      onImport?.(file)
    }
  }
  const handlers: Partial<Record<DesktopMenuAction, () => void>> = {
    [DESKTOP_MENU_ACTION.documentImport]: () => openFile('가져오기', props.toolbar.onFileImport),
    [DESKTOP_MENU_ACTION.documentOpen]: () => openFile('불러오기', props.toolbar.onFileOpen),
    [DESKTOP_MENU_ACTION.psdReimport]: () =>
      openFile('PSD 재가져오기', props.toolbar.onPsdReimport, ['psd']),
    [DESKTOP_MENU_ACTION.recoveryOpen]: () => props.onRecoveryOpen(),
    [DESKTOP_MENU_ACTION.documentSave]: () => props.toolbar.onPoffoExport?.(),
    [DESKTOP_MENU_ACTION.jsonExport]: () => props.toolbar.onExport(),
    [DESKTOP_MENU_ACTION.atlasExport]: () => props.toolbar.onAtlasExport?.(),
    [DESKTOP_MENU_ACTION.undo]: () => props.toolbar.onUndo?.(),
    [DESKTOP_MENU_ACTION.redo]: () => props.toolbar.onRedo?.(),
    [DESKTOP_MENU_ACTION.helpOpen]: () => props.onHelpOpen(),
    [DESKTOP_MENU_ACTION.colorThemeOpen]: () => props.onThemeOpen(),
  }
  const handleAction = (action: DesktopMenuAction) => {
    if (!active()) {
      return
    }
    const exampleIndex = /^example:(?<index>\d+)$/u.exec(action)?.groups?.index
    if (exampleIndex !== undefined) {
      const example = props.toolbar.examples?.[Number(exampleIndex)]
      if (example !== undefined) {
        props.onExampleOpen(example)
      }
      return
    }
    handlers[action]?.()
  }
  createEffect(() => {
    if (!props.desktopMenu) {
      return
    }
    const enabled = active()
    setDesktopMenuItemEnabled(DESKTOP_MENU_ACTION.documentImport, enabled)
    setDesktopMenuItemEnabled(DESKTOP_MENU_ACTION.documentOpen, enabled)
    setDesktopMenuItemEnabled(
      DESKTOP_MENU_ACTION.psdReimport,
      enabled && props.toolbar.onPsdReimport !== undefined,
    )
    setDesktopMenuItemEnabled(
      DESKTOP_MENU_ACTION.recoveryOpen,
      enabled && props.toolbar.onRecoveryOpen !== undefined,
    )
    setDesktopMenuItemEnabled(
      DESKTOP_MENU_ACTION.documentSave,
      enabled && props.toolbar.onPoffoExport !== undefined,
    )
    setDesktopMenuItemEnabled(DESKTOP_MENU_ACTION.jsonExport, enabled)
    setDesktopMenuItemEnabled(
      DESKTOP_MENU_ACTION.atlasExport,
      enabled && props.toolbar.onAtlasExport !== undefined,
    )
    setDesktopMenuItemEnabled(DESKTOP_MENU_ACTION.undo, enabled && props.toolbar.canUndo === true)
    setDesktopMenuItemEnabled(DESKTOP_MENU_ACTION.redo, enabled && props.toolbar.canRedo === true)
    setDesktopMenuItemEnabled(DESKTOP_MENU_ACTION.helpOpen, enabled)
    setDesktopMenuItemEnabled(DESKTOP_MENU_ACTION.colorThemeOpen, enabled)
    props.toolbar.examples?.forEach((_example, index) => {
      setDesktopMenuItemEnabled(`example:${index}`, enabled)
    })
  })
  onMount(() => {
    if (props.desktopMenu) {
      const unsubscribe = listenDesktopMenuAction(handleAction)
      onCleanup(unsubscribe)
    }
  })
  onCleanup(() => {
    if (props.desktopMenu) {
      const actionItems = [
        DESKTOP_MENU_ACTION.documentImport,
        DESKTOP_MENU_ACTION.documentOpen,
        DESKTOP_MENU_ACTION.psdReimport,
        DESKTOP_MENU_ACTION.recoveryOpen,
        DESKTOP_MENU_ACTION.documentSave,
        DESKTOP_MENU_ACTION.jsonExport,
        DESKTOP_MENU_ACTION.atlasExport,
        DESKTOP_MENU_ACTION.undo,
        DESKTOP_MENU_ACTION.redo,
        DESKTOP_MENU_ACTION.helpOpen,
        DESKTOP_MENU_ACTION.colorThemeOpen,
      ]
      actionItems.forEach((action) => setDesktopMenuItemEnabled(action, false))
      props.toolbar.examples?.forEach((_example, index) => {
        setDesktopMenuItemEnabled(`example:${index}`, false)
      })
    }
  })
  return {dismissError: dialog.dismissError, error: dialog.error}
}
