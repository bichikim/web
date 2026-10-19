import {invoke, isTauri} from '@tauri-apps/api/core'
import {createEffect, createSignal, on, onCleanup} from 'solid-js'
import type {WallpaperLibraryController} from '../library'
import {createWidgetRuntime} from './create-widget-runtime'
import {DEFAULT_POFFO_SPEECH} from '@winter-love/wallpaper/settings/library-model'

export const useWidgetRuntime = (library: WallpaperLibraryController) => {
  const [error, setError] = createSignal<string | null>(null)
  const runtime = isTauri()
    ? createWidgetRuntime({
        close: (id) => invoke('close_poffo_widget', {id}),
        configure: (widget) =>
          invoke('configure_poffo_speech', {
            id: widget.id,
            speech: widget.speech ?? DEFAULT_POFFO_SPEECH,
          }),
        open: async (widget) => {
          await invoke('open_poffo_widget', {options: widget})
        },
      })
    : null
  createEffect(
    on(
      () =>
        library
          .widgets()
          .map((widget) => `${widget.id}:${JSON.stringify(widget.speech ?? null)}`)
          .join(','),
      () => {
        runtime
          ?.synchronize(library.widgets().map((widget) => ({...widget})))
          .then(() => setError(null))
          .catch((cause: unknown) => {
            console.error('Poffo widget synchronization failed', cause)
            setError('Poffo 위젯을 표시하지 못했어요.')
          })
      },
    ),
  )
  onCleanup(() => {
    runtime
      ?.dispose()
      .catch((cause: unknown) => console.error('Poffo widget cleanup failed', cause))
  })
  return {dismissError: () => setError(null), error}
}
