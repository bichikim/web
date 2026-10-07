import {createEffect, createSignal, For, Show} from 'solid-js'
import type {TextMatch} from './find-text'
import type {PdfPageText} from './pdf/types'
import {splitSearchToken} from './split-search-token'
import {useTextMetrics} from './pdf/use-text-metrics'

interface SPdfTextLayerProps {
  text: PdfPageText
  scale: number
  matches?: readonly TextMatch[]
  activeMatch?: number
  scrollRequest?: number
}

export const SPdfTextLayer = (props: SPdfTextLayerProps) => {
  const [container, setContainer] = createSignal<HTMLDivElement | null>(null)
  useTextMetrics({container, text: () => props.text})
  createEffect(() => {
    props.scrollRequest
    props.matches
    const target = container()
    const active = props.activeMatch
    if (target !== null && active !== undefined && active >= 0) {
      target
        .querySelector<HTMLElement>(`[data-search-match="${active}"]`)
        ?.scrollIntoView({block: 'center', inline: 'nearest'})
    }
  })
  return (
    <div
      role="region"
      aria-label="PDF 텍스트"
      ref={setContainer}
      class="pdf-text-layer absolute left-0 top-0 origin-top-left select-text leading-none
        [height:calc(100%/var(--pdf-scale))] [width:calc(100%/var(--pdf-scale))]
        [transform:scale(var(--pdf-scale))] [letter-spacing:normal] [word-spacing:normal]"
      style={{'--pdf-scale': props.scale}}
    >
      <For each={props.text.runs}>
        {(run) => (
          <>
            <span
              data-pdf-width={run.width}
              dir={run.direction}
              class="absolute cursor-text select-text whitespace-pre text-transparent
            [font-family:var(--pdf-font)] [font-size:var(--pdf-font-height)] [font-weight:400]
            [left:var(--pdf-left)] [top:var(--pdf-top)] origin-top-left
            [transform:rotate(var(--pdf-angle))_scaleX(var(--pdf-stretch,1))]"
              style={{
                '--pdf-angle': `${run.angle}rad`,
                '--pdf-font': run.font,
                '--pdf-font-height': `${run.height}px`,
                '--pdf-left': `${run.x}px`,
                '--pdf-top': `${run.y}px`,
              }}
            >
              <For
                each={splitSearchToken({offset: run.offset, text: run.text}, props.matches ?? [])}
              >
                {(fragment) => (
                  <Show when={fragment.match !== null} fallback={fragment.text}>
                    <mark
                      class="rounded-[2px] text-transparent
                [background-color:color-mix(in_srgb,var(--viewer-search)_50%,transparent)] data-[active=true]:outline
                data-[active=true]:outline-1 data-[active=true]:outline-accent"
                      data-active={fragment.match === props.activeMatch}
                      data-search-match={fragment.match}
                    >
                      {fragment.text}
                    </mark>
                  </Show>
                )}
              </For>
            </span>
            <Show when={run.lineBreak}>
              <br class="absolute select-text" />
            </Show>
          </>
        )}
      </For>
    </div>
  )
}
