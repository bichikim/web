import {cx} from 'class-variance-authority'
import {createMemo, createUniqueId, For, type JSX} from 'solid-js'
import type {CompositionPart, CompositionPartControl} from './types'
import scene from './composition.json'

const IMAGE = cx(
  'pointer-events-none absolute inset-0 h-full w-full origin-top-left select-none',
  '[translate:var(--part-x)_var(--part-y)] [rotate:var(--part-angle)]',
  '[scale:var(--part-scale-x)_var(--part-scale-y)] [opacity:var(--part-opacity)]',
)
const PERCENT = 100
const ASSETS = import.meta.glob<string>('./assets/*.png', {
  eager: true,
  import: 'default',
  query: '?url',
})

export interface PCompositionStageProps {
  readonly assetPath?: string
  readonly background?: string
  readonly getControl: (part: CompositionPart) => CompositionPartControl
  readonly onKeyDown?: JSX.EventHandler<HTMLDivElement, KeyboardEvent>
  readonly onPointerDown?: JSX.EventHandler<HTMLDivElement, PointerEvent>
  readonly onPointerEnd?: JSX.EventHandler<HTMLDivElement, PointerEvent>
  readonly onPointerMove?: JSX.EventHandler<HTMLDivElement, PointerEvent>
  readonly parts: readonly CompositionPart[]
  readonly pose?: number
}

function poseTransform(part: CompositionPart, pose: number, inherited: string) {
  if (part.group !== 'head' || pose === 0) {
    return inherited
  }
  const pivot = `translate(60%, 35%) rotate(${pose}deg) translate(-60%, -35%)`
  return inherited === 'none' ? pivot : `${pivot} ${inherited}`
}

function partTransform(part: CompositionPart) {
  return [
    `translate(${part.x}%, ${part.y}%)`,
    `rotate(${part.rotation}deg)`,
    `scale(${part.scaleX / PERCENT}, ${part.scaleY / PERCENT})`,
  ].join(' ')
}

export function PCompositionStage(props: PCompositionStageProps) {
  const handleKey: JSX.EventHandler<HTMLDivElement, KeyboardEvent> = (event) =>
    props.onKeyDown?.(event)
  const handleDown: JSX.EventHandler<HTMLDivElement, PointerEvent> = (event) =>
    props.onPointerDown?.(event)
  const handleMove: JSX.EventHandler<HTMLDivElement, PointerEvent> = (event) =>
    props.onPointerMove?.(event)
  const handleEnd: JSX.EventHandler<HTMLDivElement, PointerEvent> = (event) =>
    props.onPointerEnd?.(event)
  const maskPrefix = createUniqueId()
  const maskId = (id: string) => `${maskPrefix}-part-mask-${id}`
  const partSource = (part: CompositionPart) => {
    const assetId = part.assetId ?? part.id
    return props.assetPath === undefined
      ? ASSETS[`./assets/${assetId}.png`]
      : `${props.assetPath}/${assetId}.png`
  }
  const receivers = createMemo(() => {
    const targets = new Set(props.parts.map((part) => part.clipTo))
    return props.parts.filter((part) => targets.has(part.id))
  })
  return (
    <>
      <svg aria-hidden="true" class="pointer-events-none absolute size-0">
        <defs>
          <For each={receivers()}>
            {(part) => (
              <mask
                class="[mask-type:alpha]"
                height="1"
                id={maskId(part.id)}
                maskContentUnits="objectBoundingBox"
                maskUnits="objectBoundingBox"
                width="1"
                x="0"
                y="0"
              >
                <svg
                  height="1"
                  preserveAspectRatio="none"
                  viewBox={`0 0 ${scene.width} ${scene.height}`}
                  width="1"
                >
                  <g
                    class="origin-top-left [transform-box:view-box] [transform:var(--mask-motion)]"
                    style={{
                      '--mask-motion': poseTransform(
                        part,
                        props.pose ?? 0,
                        props.getControl(part).transform,
                      ),
                    }}
                  >
                    <image
                      class="origin-top-left [transform-box:view-box] [transform:var(--mask-transform)]"
                      height={scene.height}
                      href={partSource(part)}
                      preserveAspectRatio="none"
                      style={{'--mask-transform': partTransform(part)}}
                      width={scene.width}
                    />
                  </g>
                </svg>
              </mask>
            )}
          </For>
        </defs>
      </svg>
      <div
        aria-label="이미지 조합 작업영역"
        class={cx(
          'relative isolate w-full touch-none cursor-move overflow-hidden rounded-xl',
          '[aspect-ratio:var(--stage-ratio)]',
          '[background:var(--stage-background)]',
          'outline-offset-4 focus-visible:outline-2 focus-visible:outline-#f0c99a',
        )}
        style={{
          '--stage-background': props.background ?? '#d6d0c7',
          '--stage-ratio': `${scene.width} / ${scene.height}`,
        }}
        onKeyDown={handleKey}
        onLostPointerCapture={handleEnd}
        onPointerCancel={handleEnd}
        onPointerDown={handleDown}
        onPointerMove={handleMove}
        onPointerUp={handleEnd}
        role="region"
        tabIndex={0}
      >
        <For each={props.parts}>
          {(part) => {
            const control = createMemo(() => props.getControl(part))
            return (
              <div
                class="pointer-events-none absolute inset-0 [mask:var(--part-mask)]"
                style={{
                  '--part-mask':
                    part.clipTo === undefined ? 'none' : `url(#${maskId(part.clipTo)})`,
                }}
                classList={{'mix-blend-multiply': part.multiply === true}}
              >
                <div
                  class="absolute inset-0 origin-top-left [transform:var(--control-transform)]"
                  style={{
                    '--control-transform': poseTransform(
                      part,
                      props.pose ?? 0,
                      control().transform,
                    ),
                  }}
                >
                  <img
                    alt={`${part.label} 파트`}
                    class={IMAGE}
                    draggable={false}
                    hidden={!control().visible}
                    src={partSource(part)}
                    style={{
                      '--part-angle': `${part.rotation}deg`,
                      '--part-opacity': control().opacity / PERCENT,
                      '--part-scale-x': part.scaleX / PERCENT,
                      '--part-scale-y': part.scaleY / PERCENT,
                      '--part-x': `${part.x}%`,
                      '--part-y': `${part.y}%`,
                    }}
                  />
                </div>
              </div>
            )
          }}
        </For>
      </div>
    </>
  )
}
