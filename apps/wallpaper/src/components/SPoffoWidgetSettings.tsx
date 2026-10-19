import {batch, createMemo, createSignal, For, Show} from 'solid-js'
import {Portal} from 'solid-js/web'
import type {WallpaperController} from '../features/settings'
import type {WallpaperLibraryController} from '../features/library'
import {SAMPLE_PUPPET_ID} from '../features/background/constants'
import {SPoffoAssetPicker} from './SPoffoAssetPicker'
import {usePoffoImport} from '../features/poffo/use-poffo-import'
import {SPoffoWidgetRow} from './SPoffoWidgetRow'
import {SCodexConnection} from './SCodexConnection'
import {SPoffoWidgetEditor} from './SPoffoWidgetEditor'

interface SPoffoWidgetSettingsProps {
  readonly controller: WallpaperController
  readonly library: WallpaperLibraryController
}

export const SPoffoWidgetSettings = (props: SPoffoWidgetSettingsProps) => {
  const [folded, setFolded] = createSignal<string | null>(null)
  const [editorHost, setEditorHost] = createSignal<HTMLDivElement>()
  const [selected, setAsset] = createSignal<string | null>(null)
  const asset = createMemo(
    () =>
      selected() ??
      props.library.widgets()[0]?.assetId ??
      props.controller.puppets()[0]?.id ??
      SAMPLE_PUPPET_ID,
  )
  const [previewId, setPreviewId] = createSignal<string | null>(null)
  const widgetPreview = createMemo(() => {
    const widgets = props.library.widgets().filter((widget) => widget.assetId === asset())
    return (
      widgets.find((widget) => widget.id === previewId()) ??
      widgets[0] ??
      props.library.widgets()[0] ??
      null
    )
  })
  const previewAsset = createMemo(() => widgetPreview()?.assetId ?? asset())
  const selectWidget = (id: string | null, assetId: string) =>
    batch(() => {
      setAsset(assetId)
      setPreviewId(id)
      setFolded(null)
    })
  const toggleWidget = (id: string, assetId: string) =>
    widgetPreview()?.id === id
      ? setFolded((value) => (value === id ? null : id))
      : selectWidget(id, assetId)
  const {error, importFiles} = usePoffoImport(setAsset)
  const options = createMemo(() => [
    {label: 'Poffo 샘플', value: SAMPLE_PUPPET_ID},
    ...props.controller.puppets().map((item) => ({label: item.name, value: item.id})),
  ])
  const name = (id: string) =>
    options().find((option) => option.value === id)?.label ?? 'Poffo 캐릭터'
  return (
    <section aria-label="Poffo 위젯 설정" class="grid gap-4">
      <SCodexConnection />
      <SPoffoAssetPicker
        selectLabel="위젯 캐릭터"
        options={options()}
        value={asset()}
        onChange={(id) => selectWidget(null, id)}
        onFiles={importFiles}
        error={error()}
      >
        <button
          type="button"
          class="wallpaper-file-button"
          onClick={() => props.library.addWidget(asset())}
        >
          위젯으로 띄우기
        </button>
      </SPoffoAssetPicker>
      <section
        aria-label="위젯 조정"
        class="grid gap-3 border-0 border-t border-solid border-stone-200 pt-4"
      >
        <h2 class="m-0 text-[13px] font-medium text-stone-700">
          {widgetPreview() === null ? '캐릭터 확인' : '열린 위젯'}
        </h2>
        <fieldset class="m-0 min-w-0 border-0 p-0">
          <legend class="sr-only">편집할 위젯</legend>
          <ul aria-label="열린 Poffo 위젯" class="m-0 grid list-none gap-2 p-0">
            <For each={props.library.widgets()}>
              {(widget, index) => (
                <SPoffoWidgetRow
                  widget={widget}
                  number={index() + 1}
                  name={name(widget.assetId)}
                  selected={widgetPreview()?.id === widget.id}
                  expanded={widgetPreview()?.id === widget.id && folded() !== widget.id}
                  onSelect={() => toggleWidget(widget.id, widget.assetId)}
                  onClose={() => props.library.removeWidget(widget.id)}
                >
                  <Show when={widgetPreview()?.id === widget.id}>
                    <div ref={setEditorHost} class="relative min-w-0" />
                  </Show>
                </SPoffoWidgetRow>
              )}
            </For>
          </ul>
        </fieldset>
        <Show when={props.library.widgets().length === 0}>
          <div ref={setEditorHost} />
        </Show>
        <Show when={editorHost()}>
          <Portal mount={editorHost()}>
            <SPoffoWidgetEditor
              controller={props.controller}
              library={props.library}
              widget={widgetPreview()}
              assetId={previewAsset}
            />
          </Portal>
        </Show>
      </section>
    </section>
  )
}
