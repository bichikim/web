import {text as uiText} from '../localization'
import {batch, createMemo, createSignal} from 'solid-js'
import type {WallpaperController} from '../settings'
import type {WallpaperLibraryController} from '../library'

interface WidgetEditorOptions {
  readonly assets: WallpaperController['puppets']
  readonly widgets: WallpaperLibraryController['widgets']
}

export const useWidgetEditor = (options: WidgetEditorOptions) => {
  const [selected, setSelected] = createSignal<string | null>(null)
  const [previewId, setPreviewId] = createSignal<string | null>(null)
  const asset = createMemo(
    () => selected() ?? options.widgets()[0]?.assetId ?? options.assets()[0]?.id ?? null,
  )
  const widget = createMemo(() => {
    const widgets = options.widgets().filter((widget) => widget.assetId === asset())
    return (
      widgets.find((widget) => widget.id === previewId()) ??
      widgets[0] ??
      options.widgets()[0] ??
      null
    )
  })
  const assetOptions = createMemo(() =>
    options.assets().map((item) => ({label: item.name, value: item.id})),
  )
  const widgetOptions = createMemo(() =>
    options.widgets().map((widget, index) => {
      const name =
        assetOptions().find((option) => option.value === widget.assetId)?.label ??
        uiText('Poffo 위젯')
      return {
        get label() {
          return uiText('{value0} · 위젯 {value1}', {
            value0: String(name),
            value1: String(index + 1),
          })
        },
        value: widget.id,
      }
    }),
  )
  const selectAsset = (id: string) =>
    batch(() => {
      setSelected(id)
      setPreviewId(null)
    })
  const selectWidget = (id: string) => {
    const widget = options.widgets().find((widget) => widget.id === id)
    if (widget !== undefined) {
      batch(() => {
        setSelected(widget.assetId)
        setPreviewId(widget.id)
      })
    }
  }
  return {
    asset,
    assetOptions,
    previewAsset: () => widget()?.assetId ?? asset(),
    selectAsset,
    selectWidget,
    widget,
    widgetOptions,
  }
}
