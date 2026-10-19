import {type Accessor, createEffect, createSignal, onCleanup} from 'solid-js'
import {createLibraryRepository} from '@winter-love/wallpaper/settings/library-repository'
import {
  DEFAULT_POFFO_SPEECH,
  type PoffoSpeech,
  poffoSpeechSchema,
} from '@winter-love/wallpaper/settings/library-model'

/** Observes one widget's persisted bubble preferences. */
export const useWidgetSpeech = (widgetId: Accessor<string | undefined>) => {
  const [speech, setSpeech] = createSignal<PoffoSpeech>(DEFAULT_POFFO_SPEECH)
  const [error, setError] = createSignal<string | null>(null)
  createEffect(() => {
    const id = widgetId()
    setSpeech(DEFAULT_POFFO_SPEECH)
    setError(null)
    if (id === undefined) {
      return
    }
    const repository = createLibraryRepository('wallpaper-library')
    let revision = 0
    let disposed = false
    const refresh = async () => {
      revision += 1
      const current = revision
      const library = await repository.read()
      if (!disposed && current === revision) {
        const value = library.widgets.find((item) => item.id === id)?.speech
        setSpeech(poffoSpeechSchema.parse(value ?? DEFAULT_POFFO_SPEECH))
        setError(null)
      }
    }
    const report = (cause: unknown) => {
      if (!disposed) {
        console.error('Poffo bubble settings failed', cause)
        setSpeech(DEFAULT_POFFO_SPEECH)
        setError('말풍선 설정을 불러올 수 없어요.')
      }
    }
    const stop = repository.subscribe(() => {
      refresh().catch(report)
    }, report)
    refresh().catch(report)
    onCleanup(() => {
      disposed = true
      stop()
      repository.close()
    })
  })
  return {error, speech}
}
