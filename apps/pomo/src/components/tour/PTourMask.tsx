import './mask.css'
import {For, Show} from 'solid-js'

import type {TourTargetBounds} from './headless'

export interface PTourMaskProps {
  readonly targetBounds: TourTargetBounds | null
}

const MASK_CLASSES =
  'fixed box-border bg-backdrop backdrop-blur-[8px] pointer-events-auto ' +
  'motion-reduce:transition-none transition-[top_160ms_ease,left_160ms_ease,width_160ms_ease,height_160ms_ease]'

const CORNERS = ['top-left', 'top-right', 'bottom-left', 'bottom-right'] as const

/** 활성 대상의 화면 영역만 남기고 나머지 뷰포트를 가립니다. */
export const PTourMask = (props: PTourMaskProps) => {
  return (
    <>
      <Show
        fallback={<div aria-hidden="true" class={`${MASK_CLASSES} inset-0`} data-part="full" />}
        when={props.targetBounds}
      >
        {(bounds) => (
          <>
            <div
              aria-hidden="true"
              class={MASK_CLASSES}
              data-part="top"
              style={{height: `${bounds().top}px`, left: 0, top: 0, width: '100%'}}
            />
            <div
              aria-hidden="true"
              class={MASK_CLASSES}
              data-part="left"
              style={{
                height: `${bounds().height}px`,
                left: 0,
                top: `${bounds().top}px`,
                width: `${bounds().left}px`,
              }}
            />
            <div
              aria-hidden="true"
              class={MASK_CLASSES}
              data-part="right"
              style={{
                height: `${bounds().height}px`,
                left: `${bounds().right}px`,
                right: 0,
                top: `${bounds().top}px`,
              }}
            />
            <div
              aria-hidden="true"
              class={MASK_CLASSES}
              data-part="bottom"
              style={{bottom: 0, left: 0, top: `${bounds().bottom}px`, width: '100%'}}
            />
            <For each={CORNERS}>
              {(corner) => (
                <div
                  aria-hidden="true"
                  class={`${MASK_CLASSES} pomo-tour-corner`}
                  data-corner={corner}
                  style={{
                    '--target-bottom': `${bounds().bottom}px`,
                    '--target-height': `${bounds().height}px`,
                    '--target-left': `${bounds().left}px`,
                    '--target-right': `${bounds().right}px`,
                    '--target-top': `${bounds().top}px`,
                    '--target-width': `${bounds().width}px`,
                  }}
                />
              )}
            </For>
          </>
        )}
      </Show>
    </>
  )
}
