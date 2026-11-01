import {semanticJobs} from './semantic-jobs'
import {type Accessor, createEffect, createSignal, onCleanup, untrack} from 'solid-js'
import type {PoffoWidget} from '@winter-love/wallpaper/settings/library-model'
import {
  SEMANTIC_TEXT_LIMIT,
  type SemanticFrame,
  type SemanticInput,
} from '@winter-love/wallpaper/settings/semantics'
import {createSemanticModel} from './model'
import {classifySemantics} from './classify'
import {
  announceSemantics,
  sendSemanticFrame,
  subscribeSemanticInput,
  subscribeSemanticRequests,
} from './channel'
import type {SemanticRuntime} from './context'
import {useSemanticPreview} from './use-semantic-preview'
import {createRandomDraws} from './random-draws'

interface UseSemanticHostProps {
  readonly widgets: Accessor<readonly PoffoWidget[]>
}
export const useSemanticHost = (props: UseSemanticHostProps): SemanticRuntime => {
  const model = createSemanticModel()
  const [inputs, setInputs] = createSignal<ReadonlyMap<string, SemanticInput>>(new Map())
  const draws = createRandomDraws(() => Math.random())
  const [busy, setBusy] = createSignal(false)
  const [connected, setConnected] = createSignal(false)
  const [error, setError] = createSignal<string | null>(null)
  const [frames, setFrames] = createSignal<ReadonlyMap<string, SemanticFrame>>(new Map())
  const manual = useSemanticPreview({
    onChange: (widgetId) => {
      if (props.widgets().some((widget) => widget.id === widgetId)) {
        publish(frames().get(widgetId) ?? {scores: {}, widgetId}).catch(console.error)
      }
    },
    widgets: props.widgets,
  })
  const pending = new Map<string, {signature: string; input: SemanticInput}>()
  const signatures = new Map<string, string>()
  let disposed = false
  const publish = async (frame: SemanticFrame) => {
    if (!disposed) {
      const value = {...frame, previewId: manual.selection(frame.widgetId)}
      setFrames((values) => new Map(values).set(frame.widgetId, value))
      await sendSemanticFrame(value)
    }
  }
  const drain = async (): Promise<void> => {
    if (busy() || disposed) {
      return
    }
    setBusy(true)
    try {
      while (pending.size > 0) {
        const [id, job] = pending.entries().next().value!
        pending.delete(id)
        const bindings =
          props.widgets().find((widget) => widget.id === id)?.speech?.semanticBindings ?? []
        try {
          // oxlint-disable-next-line no-await-in-loop -- One shared model processes the newest pending text per widget in order.
          const scores = await classifySemantics({
            bindings,
            embed: model.embed,
            text: job.input.text,
          })
          if (signatures.get(id) === job.signature) {
            const settings = props.widgets().find((widget) => widget.id === id)
              ?.speech?.randomActions
            const fallbackId = draws.select({bindings, input: job.input, scores, settings})
            // oxlint-disable-next-line no-await-in-loop -- Publish this completed widget before processing the next.
            await publish({scores, widgetId: id, ...(fallbackId === undefined ? {} : {fallbackId})})
            setError(null)
          }
        } catch (cause) {
          if (!disposed && signatures.get(id) === job.signature) {
            console.error('Local semantic analysis failed', cause)
            setError('로컬 텍스트 분석을 실행하지 못했어요.')
            // oxlint-disable-next-line no-await-in-loop -- Clear stale outputs before continuing.
            await publish({scores: {}, widgetId: id}).catch(console.error)
          }
        }
      }
    } finally {
      setBusy(false)
    }
  }
  const accept = (input: SemanticInput) => {
    if (props.widgets().some((widget) => widget.id === input.widgetId)) {
      if (input.readoutId === undefined) {
        draws.clear(input.widgetId)
      }
      setInputs((values) =>
        new Map(values).set(input.widgetId, {
          ...input,
          text: input.text.slice(-SEMANTIC_TEXT_LIMIT),
        }),
      )
    }
  }
  const test = (widgetId: string, text: string) => {
    signatures.delete(widgetId)
    accept({text, widgetId})
  }
  const subscriptions = [
    subscribeSemanticInput(accept),
    subscribeSemanticRequests((id) => {
      const frame = frames().get(id)
      if (frame !== undefined) {
        sendSemanticFrame(frame).catch(console.error)
      }
    }),
  ]
  Promise.all(subscriptions)
    .then(() => {
      if (!disposed) {
        setConnected(true)
      }
    })
    .catch(console.error)
  createEffect(() => {
    const ids = props.widgets().map((widget) => widget.id)
    if (connected() && ids.length > 0) {
      untrack(() => announceSemantics().catch(console.error))
    }
  })
  createEffect(() => {
    const texts = inputs()
    const widgets = semanticJobs(props.widgets(), texts)
    untrack(() => {
      const ids = new Set(widgets.map((widget) => widget.id))
      if ([...texts.keys()].some((id) => !ids.has(id))) {
        setInputs(new Map([...texts].filter(([id]) => ids.has(id))))
      }
      for (const id of signatures.keys()) {
        if (!ids.has(id)) {
          signatures.delete(id)
          pending.delete(id)
          draws.clear(id)
          setFrames(new Map([...frames()].filter(([key]) => key !== id)))
        }
      }
      for (const widget of widgets) {
        const {input, signature} = widget
        const {text} = input
        if (signatures.get(widget.id) !== signature) {
          signatures.set(widget.id, signature)
          if (text.trim() === '') {
            pending.delete(widget.id)
            publish({scores: {}, widgetId: widget.id}).catch(console.error)
          } else {
            pending.set(widget.id, {input, signature})
          }
        }
      }
      drain().catch(console.error)
    })
  })
  onCleanup(() => {
    disposed = true
    pending.clear()
    for (const subscription of subscriptions) {
      subscription.then((stop) => stop()).catch(console.error)
    }
    model.dispose()
  })
  return {
    busy,
    error,
    preview: manual.preview,
    previewing: manual.previewing,
    score: (widgetId, id) => frames().get(widgetId)?.scores[id],
    test,
  }
}
