import {For} from 'solid-js'

import * as m from '@paraglide/message'
import {CUSTOM_ALBUM_COVER_EDGE} from '../../features/custom-albums'
import type {CropFrame, CustomAlbumCoverCropController} from './use-custom-album-cover-crop'

const CROP_GRID_DIVISIONS = 3
const CROP_RESIZE_HANDLES = [
  {
    cursor: 'cursor-nwse-resize',
    label: () => m.album_custom_cover_crop_handle_northwest(),
    name: 'northwest',
  },
  {
    cursor: 'cursor-ns-resize',
    label: () => m.album_custom_cover_crop_handle_north(),
    name: 'north',
  },
  {
    cursor: 'cursor-nesw-resize',
    label: () => m.album_custom_cover_crop_handle_northeast(),
    name: 'northeast',
  },
  {cursor: 'cursor-ew-resize', label: () => m.album_custom_cover_crop_handle_east(), name: 'east'},
  {
    cursor: 'cursor-nwse-resize',
    label: () => m.album_custom_cover_crop_handle_southeast(),
    name: 'southeast',
  },
  {
    cursor: 'cursor-ns-resize',
    label: () => m.album_custom_cover_crop_handle_south(),
    name: 'south',
  },
  {
    cursor: 'cursor-nesw-resize',
    label: () => m.album_custom_cover_crop_handle_southwest(),
    name: 'southwest',
  },
  {cursor: 'cursor-ew-resize', label: () => m.album_custom_cover_crop_handle_west(), name: 'west'},
] as const

type CropResizeHandleName = (typeof CROP_RESIZE_HANDLES)[number]['name']

interface CustomAlbumCoverCropCanvasProps {
  readonly crop: CustomAlbumCoverCropController
  readonly frame: CropFrame
}

const getCropResizeHandlePosition = (
  frame: CropFrame,
  handle: CropResizeHandleName,
): {readonly x: number; readonly y: number} => {
  const right = frame.cropX + frame.cropSize
  const bottom = frame.cropY + frame.cropSize
  const middleX = frame.cropX + frame.cropSize / 2
  const middleY = frame.cropY + frame.cropSize / 2

  switch (handle) {
    case 'northwest':
      return {x: frame.cropX, y: frame.cropY}
    case 'north':
      return {x: middleX, y: frame.cropY}
    case 'northeast':
      return {x: right, y: frame.cropY}
    case 'east':
      return {x: right, y: middleY}
    case 'southeast':
      return {x: right, y: bottom}
    case 'south':
      return {x: middleX, y: bottom}
    case 'southwest':
      return {x: frame.cropX, y: bottom}
    case 'west':
      return {x: frame.cropX, y: middleY}
  }
}

const getCropGridPath = (frame: CropFrame): string => {
  const firstLine = frame.cropSize / CROP_GRID_DIVISIONS
  const secondLine = (frame.cropSize * (CROP_GRID_DIVISIONS - 1)) / CROP_GRID_DIVISIONS
  const right = frame.cropX + frame.cropSize
  const bottom = frame.cropY + frame.cropSize

  return [
    `M${frame.cropX + firstLine} ${frame.cropY}V${bottom}`,
    `M${frame.cropX + secondLine} ${frame.cropY}V${bottom}`,
    `M${frame.cropX} ${frame.cropY + firstLine}H${right}`,
    `M${frame.cropX} ${frame.cropY + secondLine}H${right}`,
  ].join(' ')
}

export const CustomAlbumCoverCropCanvas = (props: CustomAlbumCoverCropCanvasProps) => (
  <div class="grid items-start gap-3 sm:grid-cols-[minmax(0,1fr)_6rem]">
    <svg
      aria-describedby="custom-cover-crop-instruction"
      aria-label={m.album_custom_cover_crop_canvas()}
      class="mx-auto block aspect-square w-full max-w-80 touch-none overflow-visible
        rounded-panel-inner bg-content-surface"
      onPointerCancel={() => props.crop.handlePointerEnd()}
      onPointerDown={(event) => props.crop.handlePointerDown(event)}
      onPointerMove={(event) => props.crop.handlePointerMove(event)}
      onPointerUp={() => props.crop.handlePointerEnd()}
      role="group"
      viewBox={`0 0 ${CUSTOM_ALBUM_COVER_EDGE} ${CUSTOM_ALBUM_COVER_EDGE}`}
    >
      <image
        height={props.frame.imageHeight}
        href={props.frame.source}
        preserveAspectRatio="none"
        width={props.frame.imageWidth}
        x={props.frame.imageX}
        y={props.frame.imageY}
      />
      <path
        class="pointer-events-none fill-black/50"
        d={`M0 0H${CUSTOM_ALBUM_COVER_EDGE}V${CUSTOM_ALBUM_COVER_EDGE}H0Z
          M${props.frame.cropX} ${props.frame.cropY}h${props.frame.cropSize}v${props.frame.cropSize}
          h-${props.frame.cropSize}Z`}
        fill-rule="evenodd"
      />
      <rect
        aria-describedby="custom-cover-crop-instruction"
        aria-label={m.album_custom_cover_crop_move_selection()}
        class="cursor-move fill-transparent focus-visible:fill-highlight/10 focus-visible:stroke-foreground"
        data-crop-handle="move"
        height={props.frame.cropSize}
        onKeyDown={(event) => props.crop.handleSelectionKeyDown(event)}
        pointer-events="all"
        role="group"
        stroke-width="2"
        tabindex="0"
        width={props.frame.cropSize}
        x={props.frame.cropX}
        y={props.frame.cropY}
      />
      <path
        class="pointer-events-none fill-none stroke-foreground/60"
        d={getCropGridPath(props.frame)}
        stroke-width="1"
      />
      <rect
        class="pointer-events-none fill-none stroke-foreground"
        height={props.frame.cropSize}
        stroke-width="2"
        width={props.frame.cropSize}
        x={props.frame.cropX}
        y={props.frame.cropY}
      />
      <For each={CROP_RESIZE_HANDLES}>
        {(handle) => {
          const point = () => getCropResizeHandlePosition(props.frame, handle.name)

          return (
            <g data-crop-handle={handle.name}>
              <circle
                class={`${handle.cursor} fill-transparent`}
                cx={point().x}
                cy={point().y}
                aria-hidden="true"
                pointer-events="all"
                r="24"
              />
              <circle
                aria-describedby="custom-cover-crop-instruction"
                aria-label={m.album_custom_cover_crop_resize_handle({position: handle.label()})}
                class={
                  `pointer-events-none fill-content-surface stroke-highlight ` +
                  `focus-visible:fill-highlight focus-visible:stroke-foreground`
                }
                cx={point().x}
                cy={point().y}
                onKeyDown={props.crop.handleResizeKeyDown(handle.name)}
                r="12"
                role="group"
                stroke-width="2"
                tabindex="0"
              />
            </g>
          )
        }}
      </For>
    </svg>
    <div class="grid justify-items-start gap-2">
      <span class="text-xs font-650 leading-4 text-muted-foreground">
        {m.album_custom_cover_crop_preview()}
      </span>
      <svg
        aria-label={m.album_custom_cover_crop_preview()}
        class="size-24 rounded-control bg-content-surface"
        role="img"
        viewBox={`${props.frame.cropX} ${props.frame.cropY} ${props.frame.cropSize} ${props.frame.cropSize}`}
      >
        <image
          height={props.frame.imageHeight}
          href={props.frame.source}
          preserveAspectRatio="none"
          width={props.frame.imageWidth}
          x={props.frame.imageX}
          y={props.frame.imageY}
        />
      </svg>
    </div>
  </div>
)
