import {isTauri} from '@tauri-apps/api/core'
import {getCurrentWindow} from '@tauri-apps/api/window'
import {Menu, MenuItem, PredefinedMenuItem, Submenu} from '@tauri-apps/api/menu'

export const DESKTOP_MENU_ACTION = {
  atlasExport: 'atlas-export',
  colorThemeOpen: 'color-theme-open',
  documentImport: 'document-import',
  documentOpen: 'document-open',
  documentSave: 'document-save',
  helpOpen: 'help-open',
  jsonExport: 'json-export',
  modelOpen: 'model-open',
  psdReimport: 'psd-reimport',
  recoveryOpen: 'recovery-open',
  redo: 'redo',
  studioOpen: 'studio-open',
  studioSave: 'studio-save',
  undo: 'undo',
} as const

export type DesktopMenuAction =
  | (typeof DESKTOP_MENU_ACTION)[keyof typeof DESKTOP_MENU_ACTION]
  | `example:${number}`

interface DesktopMenuExample {
  readonly label: string
}

interface DesktopMenuItemSpec {
  readonly action: DesktopMenuAction
  readonly accelerator?: string
  readonly label: string
}

const MENU_ACTION_EVENT = 'poffo:desktop-menu-action'
const menuItems = new Map<DesktopMenuAction, MenuItem>()
const enabledItems = new Map<DesktopMenuAction, boolean>()
const knownActions = new Set<string>(Object.values(DESKTOP_MENU_ACTION))
let nativeMenu: Menu | null = null
let initialization: Promise<void> | null = null

const isDesktopMenuAction = (value: unknown): value is DesktopMenuAction =>
  typeof value === 'string' && (knownActions.has(value) || /^example:\d+$/u.test(value))

const isHistoryAction = (action: DesktopMenuAction) =>
  action === DESKTOP_MENU_ACTION.undo || action === DESKTOP_MENU_ACTION.redo

const getFocusedEditor = (element: Element | null): HTMLElement | undefined => {
  const nested = element?.shadowRoot?.activeElement
  if (nested !== undefined && nested !== null) {
    return getFocusedEditor(nested)
  }
  return element instanceof HTMLElement &&
    (element.isContentEditable || element.matches('input, select, textarea'))
    ? element
    : undefined
}

const dispatchDesktopMenuAction = (action: DesktopMenuAction) => {
  if (isHistoryAction(action)) {
    const editor = getFocusedEditor(globalThis.document.activeElement)
    if (editor !== undefined) {
      editor.ownerDocument.execCommand(action)
      return
    }
  }
  globalThis.dispatchEvent(new CustomEvent<DesktopMenuAction>(MENU_ACTION_EVENT, {detail: action}))
}

const createActionItem = async ({action, accelerator, label}: DesktopMenuItemSpec) => {
  const item = await MenuItem.new({
    enabled: enabledItems.get(action) ?? false,
    id: action,
    text: label,
    ...(accelerator === undefined ? {} : {accelerator}),
    action: () => dispatchDesktopMenuAction(action),
  })
  menuItems.set(action, item)
  return item
}

const createSeparator = () => PredefinedMenuItem.new({item: 'Separator'})

const createApplicationMenu = async () =>
  Submenu.new({
    items: [
      await PredefinedMenuItem.new({item: {About: null}}),
      await createSeparator(),
      await PredefinedMenuItem.new({item: 'Services'}),
      await createSeparator(),
      await PredefinedMenuItem.new({item: 'Hide'}),
      await PredefinedMenuItem.new({item: 'HideOthers'}),
      await PredefinedMenuItem.new({item: 'ShowAll'}),
      await createSeparator(),
      await PredefinedMenuItem.new({item: 'Quit'}),
    ],
    text: 'Poffo',
  })

const createFileMenu = async (examples: ReadonlyArray<DesktopMenuExample>, isMacOS: boolean) => {
  const items = [
    await createActionItem({action: DESKTOP_MENU_ACTION.documentImport, label: '가져오기'}),
    await createActionItem({
      accelerator: 'CmdOrCtrl+O',
      action: DESKTOP_MENU_ACTION.documentOpen,
      label: '불러오기',
    }),
    await createActionItem({action: DESKTOP_MENU_ACTION.psdReimport, label: 'PSD 재가져오기'}),
    await createSeparator(),
  ]
  if (examples.length > 0) {
    const exampleItems = await Promise.all(
      examples.map((example, index) =>
        createActionItem({action: `example:${index}`, label: example.label}),
      ),
    )
    items.push(await Submenu.new({items: exampleItems, text: '예제'}))
    items.push(await createSeparator())
  }
  items.push(
    await createActionItem({action: DESKTOP_MENU_ACTION.recoveryOpen, label: '복구 찾기'}),
    await createSeparator(),
    await createActionItem({action: DESKTOP_MENU_ACTION.documentSave, label: '문서 저장'}),
    await createActionItem({action: DESKTOP_MENU_ACTION.jsonExport, label: 'JSON 내보내기'}),
    await createActionItem({
      action: DESKTOP_MENU_ACTION.atlasExport,
      label: '텍스처 아틀라스로 JSON 내보내기',
    }),
    await createSeparator(),
    await createActionItem({action: DESKTOP_MENU_ACTION.modelOpen, label: '모델 불러오기'}),
    await createActionItem({action: DESKTOP_MENU_ACTION.studioOpen, label: '스튜디오 불러오기'}),
    await createActionItem({action: DESKTOP_MENU_ACTION.studioSave, label: '스튜디오 저장'}),
  )
  if (!isMacOS) {
    items.push(
      await createSeparator(),
      await PredefinedMenuItem.new({item: 'Quit', text: '끝내기'}),
    )
  }
  return Submenu.new({items, text: '파일'})
}

const createEditMenu = async (isMacOS: boolean) =>
  Submenu.new({
    items: [
      await createActionItem({
        accelerator: 'CmdOrCtrl+Z',
        action: DESKTOP_MENU_ACTION.undo,
        label: '실행 취소',
      }),
      await createActionItem({
        accelerator: isMacOS ? 'CmdOrCtrl+Shift+Z' : 'CmdOrCtrl+Y',
        action: DESKTOP_MENU_ACTION.redo,
        label: '다시 실행',
      }),
      await createSeparator(),
      await PredefinedMenuItem.new({item: 'Cut'}),
      await PredefinedMenuItem.new({item: 'Copy'}),
      await PredefinedMenuItem.new({item: 'Paste'}),
      await PredefinedMenuItem.new({item: 'SelectAll'}),
    ],
    text: '편집',
  })

const createWindowMenu = async (isMacOS: boolean) => {
  const menu = await Submenu.new({
    items: [
      await PredefinedMenuItem.new({item: 'Minimize'}),
      await PredefinedMenuItem.new({item: 'Maximize'}),
      await createSeparator(),
      await PredefinedMenuItem.new({item: 'CloseWindow'}),
    ],
    text: '창',
  })
  if (isMacOS) {
    await menu.setAsWindowsMenuForNSApp()
  }
  return menu
}

const createViewMenu = async (isMacOS: boolean) => {
  const fullscreen = isMacOS
    ? await PredefinedMenuItem.new({item: 'Fullscreen'})
    : await MenuItem.new({
        action: () => {
          const window = getCurrentWindow()
          return window
            .isFullscreen()
            .then((enabled) => window.setFullscreen(!enabled))
            .catch((cause: unknown) => console.error('Could not toggle fullscreen.', cause))
        },
        id: 'fullscreen',
        text: '전체 화면',
      })
  return Submenu.new({
    items: [
      await createActionItem({action: DESKTOP_MENU_ACTION.colorThemeOpen, label: '색 테마'}),
      await createSeparator(),
      fullscreen,
    ],
    text: '보기',
  })
}

const createHelpMenu = async (isMacOS: boolean) => {
  const menu = await Submenu.new({
    items: [await createActionItem({action: DESKTOP_MENU_ACTION.helpOpen, label: 'Poffo 도움말'})],
    text: '도움말',
  })
  if (isMacOS) {
    await menu.setAsHelpMenuForNSApp()
  }
  return menu
}

const createDesktopMenu = async (examples: ReadonlyArray<DesktopMenuExample>) => {
  const isMacOS = /Mac|iPhone|iPad/u.test(navigator.platform)
  const menus = [
    ...(isMacOS ? [await createApplicationMenu()] : []),
    await createFileMenu(examples, isMacOS),
    await createEditMenu(isMacOS),
    await createViewMenu(isMacOS),
    await createWindowMenu(isMacOS),
    await createHelpMenu(isMacOS),
  ]
  const menu = await Menu.new({items: menus})
  const previous = isMacOS
    ? await menu.setAsAppMenu()
    : await menu.setAsWindowMenu(getCurrentWindow())
  await previous?.close()
  nativeMenu = menu
  const synchronizeHistory = () => {
    setDesktopMenuItemEnabled(
      DESKTOP_MENU_ACTION.undo,
      enabledItems.get(DESKTOP_MENU_ACTION.undo) ?? false,
    )
    setDesktopMenuItemEnabled(
      DESKTOP_MENU_ACTION.redo,
      enabledItems.get(DESKTOP_MENU_ACTION.redo) ?? false,
    )
  }
  globalThis.document.addEventListener('focusin', synchronizeHistory)
  globalThis.document.addEventListener('focusout', synchronizeHistory)
}

export const initializeDesktopMenu = (examples: ReadonlyArray<DesktopMenuExample> = []) => {
  if (!isTauri()) {
    return Promise.resolve()
  }
  if (nativeMenu !== null) {
    return Promise.resolve()
  }
  if (initialization === null) {
    initialization = createDesktopMenu(examples).catch((cause: unknown) => {
      initialization = null
      throw new Error('Poffo desktop menu initialization failed.', {cause})
    })
  }
  return initialization
}

export const hasDesktopMenu = () => nativeMenu !== null

export const listenDesktopMenuAction = (handler: (action: DesktopMenuAction) => void) => {
  const handle = (event: Event) => {
    if (event instanceof CustomEvent && isDesktopMenuAction(event.detail)) {
      handler(event.detail)
    }
  }
  globalThis.addEventListener(MENU_ACTION_EVENT, handle)
  return () => globalThis.removeEventListener(MENU_ACTION_EVENT, handle)
}

export const setDesktopMenuItemEnabled = (action: DesktopMenuAction, enabled: boolean) => {
  enabledItems.set(action, enabled)
  const item = menuItems.get(action)
  if (item !== undefined) {
    const textHistory =
      isHistoryAction(action) && getFocusedEditor(globalThis.document.activeElement) !== undefined
    item.setEnabled(enabled || textHistory).catch((cause: unknown) => {
      console.error(`Could not update the ${action} desktop menu item.`, cause)
    })
  }
}
