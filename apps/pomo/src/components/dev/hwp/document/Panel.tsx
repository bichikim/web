import {cx} from 'class-variance-authority'
import {type Accessor, createEffect, createSignal, For, Show} from 'solid-js'
import {type ViewerMode, ViewerModes} from './viewer-mode'

const PANEL_CLASSES = cx('grid gap-4 rounded-6 border border-white/8 bg-#211a2b/92 p-4 sm:p-5')

const BUTTON_CLASSES = cx(
  'inline-flex min-h-10 items-center justify-center rounded-3 border border-white/12 px-3',
  'text-sm font-700 text-#f8edf1 transition hover:border-#f2a7b8/45 hover:bg-white/8',
  'disabled:cursor-not-allowed disabled:opacity-45',
)

const PRIMARY_BUTTON_CLASSES = cx(
  BUTTON_CLASSES,
  'border-#f2a7b8/35 bg-#f2a7b8/12 text-#ffc0ce hover:bg-#f2a7b8/20',
)

const VIEWER_CLASSES = cx(
  'flex h-180 min-h-160 flex-col overflow-hidden rounded-5 border border-white/8 bg-#f6f1ec',
  'text-sm text-#8f8297',
)

const VIEWER_CONTENT_CLASSES = cx('min-h-0 min-w-0 flex-1 overflow-auto')

const VIEWER_HIDDEN_CLASSES = cx('hidden')

interface HwpDocumentPanelProps {
  readonly directPageCount: Accessor<number | null>
  readonly directPageIndex: Accessor<number>
  readonly errorMessage: Accessor<string | null>
  readonly isBusy: Accessor<boolean>
  readonly isReady: Accessor<boolean>
  readonly onExampleOpen: () => void
  readonly onFileChange: (event: Event) => void
  readonly onPageChange: (index: number) => void
  readonly onViewerModeChange: (mode: ViewerMode) => void
  readonly pageCount: Accessor<number | null>
  readonly pageSvg: Accessor<string | null>
  readonly statusMessage: Accessor<string>
  readonly viewerMode: Accessor<ViewerMode>
  readonly viewerHost: (element: HTMLDivElement) => void
}

export function HwpDocumentPanel(props: HwpDocumentPanelProps) {
  const [directViewer, setDirectViewer] = createSignal<HTMLDivElement>()

  createEffect(() => {
    const element = directViewer()
    const svg = props.pageSvg()
    if (element === undefined) {
      return
    }

    element.replaceChildren()
    if (svg === null) {
      return
    }

    const parsed = new DOMParser().parseFromString(svg, 'image/svg+xml')
    if (parsed.documentElement.nodeName === 'svg') {
      element.append(document.importNode(parsed.documentElement, true))
    }
  })

  return (
    <section class={PANEL_CLASSES} aria-labelledby="hwp-viewer-heading">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 class="m-0 text-xl font-750" id="hwp-viewer-heading">
            HWP 직접 읽기
          </h2>
          <p class="mb-0 mt-2 text-sm leading-6 text-#aaa0b1">
            직접 렌더링은 이 브라우저의 Rust/WASM 엔진에서 처리하고, iframe은 rhwp-studio를
            사용합니다.
          </p>
        </div>
        <div class="flex flex-wrap gap-2">
          <button
            class={BUTTON_CLASSES}
            disabled={!props.isReady() || props.isBusy()}
            onClick={() => props.onExampleOpen()}
            type="button"
          >
            예제 바로 열기
          </button>
          <label class={PRIMARY_BUTTON_CLASSES}>
            <span>HWP/HWPX 열기</span>
            <input
              accept=".hwp,.hwpx,application/x-hwp,application/vnd.hancom.hwpx"
              aria-label="HWP 또는 HWPX 파일 열기"
              class="sr-only"
              disabled={!props.isReady() || props.isBusy()}
              onChange={(event) => props.onFileChange(event)}
              type="file"
            />
          </label>
        </div>
      </div>

      <Show when={props.errorMessage()}>
        {(message) => (
          <p
            class="m-0 rounded-3 border border-#ff8e9f/20 bg-#ff8e9f/8 px-3 py-2 text-sm text-#ffc0ce"
            role="alert"
          >
            {message()}
          </p>
        )}
      </Show>

      <div class={VIEWER_CLASSES}>
        <div class="grid grid-cols-[repeat(2,minmax(0,1fr))] gap-2 border-b border-black/8 bg-#211a2b/92 p-2">
          <For each={ViewerModes}>
            {(mode) => (
              <button
                class={mode === props.viewerMode() ? PRIMARY_BUTTON_CLASSES : BUTTON_CLASSES}
                onClick={() => props.onViewerModeChange(mode)}
                type="button"
              >
                {mode === 'direct' ? '직접 렌더링' : 'iframe 에디터'}
              </button>
            )}
          </For>
        </div>
        <div class="relative flex min-h-0 min-w-0 flex-1 flex-col">
          <div
            aria-hidden={props.viewerMode() !== 'direct'}
            class={props.viewerMode() === 'direct' ? VIEWER_CONTENT_CLASSES : VIEWER_HIDDEN_CLASSES}
          >
            <Show
              when={props.pageSvg() !== null}
              fallback={<p class="m-4">HWP 파일을 선택해 주세요.</p>}
            >
              <div ref={setDirectViewer} class="p-4 sm:p-8" />
            </Show>
          </div>
          <div
            aria-hidden={props.viewerMode() !== 'iframe'}
            class={props.viewerMode() === 'iframe' ? VIEWER_CONTENT_CLASSES : VIEWER_HIDDEN_CLASSES}
          >
            <div ref={props.viewerHost} class="h-full min-h-0 min-w-0" />
          </div>
        </div>
      </div>

      <div class="flex flex-wrap items-center justify-between gap-3 text-sm text-#aaa0b1">
        <span>{props.statusMessage()}</span>
        <Show when={props.viewerMode() === 'direct' && props.directPageCount() !== null}>
          <div class="flex items-center gap-2">
            <button
              class={BUTTON_CLASSES}
              disabled={props.directPageIndex() === 0}
              onClick={() => props.onPageChange(props.directPageIndex() - 1)}
              type="button"
            >
              이전
            </button>
            <span>{`${props.directPageIndex() + 1} / ${props.directPageCount()}`}</span>
            <button
              class={BUTTON_CLASSES}
              disabled={props.directPageIndex() + 1 >= props.directPageCount()!}
              onClick={() => props.onPageChange(props.directPageIndex() + 1)}
              type="button"
            >
              다음
            </button>
          </div>
        </Show>
        <Show when={props.pageCount() !== null && props.viewerMode() === 'iframe'}>
          <span>{`${props.pageCount()}페이지 · iframe 안에서 페이지를 이동할 수 있어요`}</span>
        </Show>
      </div>
    </section>
  )
}
