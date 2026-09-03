import {For, Show} from 'solid-js'

import type {TourTargetBounds} from './headless'

export interface PTourMaskProps {
  readonly targetBounds: TourTargetBounds | null
}

const MASK_CLASSES =
  'fixed box-border bg-backdrop backdrop-blur-[8px] pointer-events-auto ' +
  'motion-reduce:transition-none transition-[top_160ms_ease,left_160ms_ease,width_160ms_ease,height_160ms_ease]'

const CORNERS = [
  {horizontal: 'start', maskOrigin: '100% 100%', name: 'top-left', vertical: 'start'},
  {horizontal: 'end', maskOrigin: '0% 100%', name: 'top-right', vertical: 'start'},
  {horizontal: 'start', maskOrigin: '100% 0%', name: 'bottom-left', vertical: 'end'},
  {horizontal: 'end', maskOrigin: '0% 0%', name: 'bottom-right', vertical: 'end'},
] as const

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
              {(corner) => {
                const radius = () => Math.min(bounds().width, bounds().height) / 2
                const maskImage = () =>
                  `radial-gradient(circle at ${corner.maskOrigin}, ` +
                  `transparent ${radius()}px, black ${radius()}px)`

                return (
                  <div
                    aria-hidden="true"
                    class={MASK_CLASSES}
                    data-corner={corner.name}
                    style={{
                      '-webkit-mask-image': maskImage(),
                      height: `${radius()}px`,
                      left: `${
                        corner.horizontal === 'start' ? bounds().left : bounds().right - radius()
                      }px`,
                      'mask-image': maskImage(),
                      top: `${
                        corner.vertical === 'start' ? bounds().top : bounds().bottom - radius()
                      }px`,
                      width: `${radius()}px`,
                    }}
                  />
                )
              }}
            </For>
          </>
        )}
      </Show>
    </>
  )
}
