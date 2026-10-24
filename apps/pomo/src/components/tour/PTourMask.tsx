import {Show} from 'solid-js'

import type {TourTargetBounds} from './headless'

export interface PTourMaskProps {
  readonly targetBounds: TourTargetBounds | null
}

const MASK_CLASSES =
  'fixed inset-0 box-border bg-backdrop backdrop-blur-[8px] pointer-events-auto ' +
  'motion-reduce:transition-none transition-[top_160ms_ease,left_160ms_ease,width_160ms_ease,height_160ms_ease]'

/** 활성 대상의 화면 영역만 남기고 나머지 뷰포트를 가립니다. */
export const PTourMask = (props: PTourMaskProps) => {
  return (
    <>
      <Show
        fallback={<div aria-hidden="true" class={`${MASK_CLASSES} inset-0`} data-part="full" />}
        when={props.targetBounds}
      >
        {(bounds) => (
          <div
            aria-hidden="true"
            class={`${MASK_CLASSES} pomo-tour-mask`}
            data-part="mask"
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
      </Show>
    </>
  )
}
