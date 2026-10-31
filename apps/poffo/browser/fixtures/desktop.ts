import {expect, type Page} from 'playwright/test'
import {readFileSync} from 'node:fs'

interface DesktopMenuItem {
  readonly id: string
  readonly text?: string
  readonly accelerator?: string
  readonly enabled: boolean
}

interface DesktopHarness {
  readonly items: () => ReadonlyArray<DesktopMenuItem>
  readonly activate: (id: string) => void
  readonly attachment: () => string | undefined
  readonly selectFile: (file: DesktopFileSelection | null) => void
}

interface DesktopFileSelection {
  readonly name: string
  readonly bytes: ReadonlyArray<number>
}

declare global {
  var poffoDesktop: DesktopHarness
}

interface DesktopOptions {
  readonly platform: 'MacIntel' | 'Win32'
  readonly rejectInitialization?: boolean
  readonly automaticAction?: string
  readonly initialFile?: DesktopFileSelection
  readonly rejectRead?: boolean
}

/** Replaces the native IPC boundary; application code and Tauri's JavaScript API stay real. */
export const installDesktop = async (page: Page, options: DesktopOptions) => {
  const capability: {readonly permissions: ReadonlyArray<string>} = JSON.parse(
    readFileSync(new URL('../../src-tauri/capabilities/desktop.json', import.meta.url), 'utf8'),
  )
  await page.addInitScript(
    ({permissions, platform, rejectInitialization, automaticAction, initialFile, rejectRead}) => {
      interface MenuOptions {
        readonly id?: string
        readonly text?: string
        readonly accelerator?: string
        readonly enabled?: boolean
      }
      interface Resource {
        readonly id: string
        readonly options: MenuOptions
        readonly callback: number
        enabled: boolean
        index: number
      }
      interface CommandArguments {
        readonly rid?: number
        readonly handler?: {readonly id: number}
        readonly options?: MenuOptions
        readonly enabled?: boolean
        readonly path?: string
      }
      let sequence = 0
      let attachment: string | undefined
      let automaticSent = false
      type IpcCallback = (message: unknown) => void
      const callbacks = new Map<number, IpcCallback>()
      const resources = new Map<number, Resource>()
      const selections: Array<DesktopFileSelection | null> =
        initialFile === undefined ? [] : [initialFile]
      const selectedFiles = new Map<string, DesktopFileSelection>()
      const openDialog = () => {
        if (!permissions.includes('dialog:allow-open')) {
          throw new Error('File dialog permission denied')
        }
        const file = selections.shift()
        if (file === undefined || file === null) {
          return null
        }
        const path = `/selected/${file.name}`
        selectedFiles.set(path, file)
        return path
      }
      const readSelected = (path: string) => {
        const file = selectedFiles.get(path)
        if (rejectRead || !permissions.includes('fs:allow-read-file') || file === undefined) {
          throw new Error('File read permission denied')
        }
        return new Uint8Array(file.bytes).buffer
      }
      const createMenu = (args: CommandArguments) => {
        if (rejectInitialization) {
          throw new Error('Native menu unavailable')
        }
        sequence += 1
        const id = args.options?.id ?? `menu:${sequence}`
        resources.set(sequence, {
          callback: args.handler!.id,
          enabled: args.options?.enabled !== false,
          id,
          index: 0,
          options: args.options ?? {},
        })
        return [sequence, id]
      }
      const updateEnabled = (args: CommandArguments) => {
        const resource = resources.get(args.rid!)!
        resource.enabled = args.enabled === true
        if (
          automaticAction !== undefined &&
          !automaticSent &&
          resource.enabled &&
          resource.id === automaticAction
        ) {
          automaticSent = true
          queueMicrotask(() => globalThis.poffoDesktop.activate(automaticAction))
        }
      }
      const invoke = async (command: string, args: CommandArguments) => {
        if (command.startsWith('plugin:menu|') && !permissions.includes('core:menu:default')) {
          throw new Error('Menu API permission denied')
        }
        switch (command) {
          case 'plugin:dialog|open':
            return openDialog()
          case 'plugin:fs|read_file':
            return readSelected(args.path!)
          case 'plugin:path|basename':
            return selectedFiles.get(args.path!)?.name
          case 'plugin:menu|new':
            return createMenu(args)
          case 'plugin:menu|set_enabled':
            return updateEnabled(args)
          case 'plugin:menu|set_as_app_menu':
            attachment = 'app'
            return null
          case 'plugin:menu|set_as_window_menu':
            attachment = 'window'
            return null
          case 'plugin:menu|set_as_windows_menu_for_nsapp':
          case 'plugin:menu|set_as_help_menu_for_nsapp':
          case 'plugin:resources|close':
            return
          default:
            throw new Error(`Unexpected desktop command: ${command}`)
        }
      }
      Object.defineProperty(navigator, 'platform', {configurable: true, value: platform})
      Object.assign(globalThis, {
        __TAURI_INTERNALS__: {
          invoke,
          metadata: {currentWindow: {label: 'main'}},
          transformCallback: (callback: (message: unknown) => void) => {
            sequence += 1
            callbacks.set(sequence, callback)
            return sequence
          },
          unregisterCallback: (id: number) => callbacks.delete(id),
        },
        isTauri: true,
        poffoDesktop: {
          activate: (id: string) => {
            const item = [...resources.values()].find((item) => item.id === id)
            if (item === undefined || !item.enabled) {
              throw new Error(`Native menu item unavailable: ${id}`)
            }
            callbacks.get(item.callback)!({index: item.index, message: id})
            item.index += 1
          },
          attachment: () => attachment,
          items: () =>
            [...resources.values()].map((item) => ({
              ...item.options,
              enabled: item.enabled,
              id: item.id,
            })),
          selectFile: (file: DesktopFileSelection | null) => selections.push(file),
        },
      })
    },
    {...options, permissions: capability.permissions},
  )
}

export const activateMenu = async (page: Page, id: string) => {
  await expect
    .poll(() =>
      page.evaluate(
        (id) => globalThis.poffoDesktop.items().find((item) => item.id === id)?.enabled,
        id,
      ),
    )
    .toBe(true)
  await page.evaluate((id) => globalThis.poffoDesktop.activate(id), id)
}
