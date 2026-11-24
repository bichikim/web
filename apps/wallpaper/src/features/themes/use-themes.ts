import {invoke, isTauri} from '@tauri-apps/api/core'
import {listen} from '@tauri-apps/api/event'
import {type Accessor, createSignal, onCleanup, onMount} from 'solid-js'
import {THEME_MAX_BYTES, type ThemeArchive} from '@winter-love/wallpaper/theme'
import {THEME_ORIGIN} from '@winter-love/wallpaper/theme-location'
import {readThemeArchive} from '@winter-love/wallpaper/theme-archive'
import type {WallpaperMonitor} from '../settings/monitors'
import {applyTheme} from './apply-theme'
import {exportTheme} from './export-theme'
import type {ThemeExportSelection} from './types'

interface UseThemesProps {
  /** Currently connected screens. */
  readonly monitors: Accessor<readonly WallpaperMonitor[]>
  /** Screen selected in the Wallpaper settings. */
  readonly selectedId: Accessor<string | null>
  /** Opens the theme settings when an external import arrives. */
  readonly onOpen: () => void
}

const restoreMessage = (manifest: ThemeArchive['manifest']) => {
  if (manifest.background === undefined) {
    return '이전 위젯을 복원했어요.'
  }
  return manifest.widgets === undefined ? '이전 배경을 복원했어요.' : '이전 테마 설정을 복원했어요.'
}

const downloadThemeFile = (bytes: Uint8Array<ArrayBuffer>, name: string) => {
  const url = URL.createObjectURL(new Blob([bytes], {type: 'application/zip'}))
  const link = document.createElement('a')
  link.href = url
  link.download = `${name.replaceAll(/[\\/:*?"<>|]/gu, '-').trim()}.poffotheme`
  link.click()
  return url
}

const readThemeFile = async (file: File) => {
  if (!file.name.toLowerCase().endsWith('.poffotheme') || file.size > THEME_MAX_BYTES) {
    throw new Error('Invalid theme file.')
  }
  return new Uint8Array(await file.arrayBuffer())
}

const saveNativeThemeFile = (bytes: Uint8Array<ArrayBuffer>, name: string) =>
  invoke<boolean>('save_theme_archive', bytes, {
    headers: {'X-Theme-Name': encodeURIComponent(name)},
  })

export const useThemes = (props: UseThemesProps) => {
  const [archive, setArchive] = createSignal<ThemeArchive | null>(null)
  const [busy, setBusy] = createSignal(false)
  const [message, setMessage] = createSignal<string | null>(null)
  const [error, setError] = createSignal<string | null>(null)
  const [undo, setUndo] = createSignal<(() => Promise<string>) | null>(null)
  const selectedMonitor = () =>
    props.monitors().find((monitor) => monitor.id === props.selectedId()) ?? props.monitors()[0]
  const stage = (bytes: Uint8Array) => {
    setArchive(readThemeArchive(bytes))
    setMessage(null)
  }
  const report = (cause: unknown, description: string) => {
    console.error('Wallpaper theme operation failed', cause)
    setError(description)
  }
  const dismissFeedback = () => {
    setError(null)
    setMessage(null)
  }
  const perform = async (operation: () => Promise<void>, failure: string) => {
    if (busy()) {
      return
    }
    setBusy(true)
    dismissFeedback()
    try {
      await operation()
    } catch (cause) {
      report(cause, failure)
    } finally {
      setBusy(false)
    }
  }

  let exportUrl: string | undefined
  let disposed = false
  let unsubscribe: (() => void) | undefined
  let downloads = Promise.resolve()
  const receive = () => {
    downloads = downloads
      .then(async () => {
        if (disposed) {
          return
        }
        const source = await invoke<ArrayBuffer>('take_theme_request')
        const bytes = new Uint8Array(source)
        if (!disposed && bytes.byteLength > 0) {
          props.onOpen()
          setError(null)
          stage(bytes)
        }
      })
      .catch((cause: unknown) => {
        if (!disposed) {
          props.onOpen()
          report(cause, '마켓에서 테마를 가져오지 못했어요.')
        }
      })
  }
  onMount(() => {
    if (isTauri()) {
      listen('poffo-theme-opened', receive)
        .then((stop) => {
          if (disposed) {
            stop()
          } else {
            unsubscribe = stop
            receive()
          }
        })
        .catch((cause: unknown) => report(cause, '마켓 연결을 시작하지 못했어요.'))
    }
  })
  onCleanup(() => {
    disposed = true
    unsubscribe?.()
    if (exportUrl !== undefined) {
      URL.revokeObjectURL(exportUrl)
    }
  })

  return {
    apply: () =>
      perform(async () => {
        const current = archive()
        const monitor = selectedMonitor()
        if (current === null || monitor === undefined) {
          return
        }
        const restore = await applyTheme({archive: current, monitor, monitors: props.monitors()})
        setUndo(() => async () => {
          await restore()
          return restoreMessage(current.manifest)
        })
        if (archive() === current) {
          setArchive(null)
        }
        setMessage('테마를 적용했어요.')
      }, '테마를 적용하지 못했어요.'),
    archive,
    busy,
    cancel: () => {
      setArchive(null)
      setError(null)
    },
    canUndo: () => undo() !== null,
    dismissFeedback,
    error,
    message,
    openFile: (file: File) =>
      perform(
        async () => stage(await readThemeFile(file)),
        '올바른 .poffotheme 파일을 선택해 주세요.',
      ),
    openMarket: () => {
      if (!isTauri()) {
        window.open(THEME_ORIGIN, '_blank', 'noopener,noreferrer')
        return
      }
      return perform(() => invoke('open_theme_market'), 'Poffo Themes를 열지 못했어요.')
    },
    restore: () =>
      perform(async () => {
        const result = await undo()?.()
        setUndo(null)
        setMessage(result ?? null)
      }, '이전 설정을 복원하지 못했어요.'),
    save: (selection: ThemeExportSelection) =>
      perform(async () => {
        const monitor = selectedMonitor()
        if (monitor === undefined) {
          return
        }
        const {name} = selection
        const bytes = await exportTheme({...selection, monitor, monitors: props.monitors()})
        if (isTauri() && navigator.platform.startsWith('Mac')) {
          if (await saveNativeThemeFile(bytes, name)) {
            setMessage('테마 파일을 내보냈어요.')
          }
          return
        }
        if (exportUrl !== undefined) {
          URL.revokeObjectURL(exportUrl)
        }
        exportUrl = downloadThemeFile(bytes, name)
        setMessage('테마 파일을 내보냈어요.')
      }, '테마를 내보내지 못했어요.'),
  }
}

export type ThemesController = ReturnType<typeof useThemes>
