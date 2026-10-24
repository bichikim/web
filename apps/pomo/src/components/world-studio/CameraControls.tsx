import {cx} from 'class-variance-authority'

export interface CameraControlsProps {
  readonly onMoveDown: () => void
  readonly onMoveLeft: () => void
  readonly onMoveRight: () => void
  readonly onMoveUp: () => void
  readonly onZoomIn: () => void
  readonly onZoomOut: () => void
}

const PANEL_CLASSES = cx('pointer-events-auto absolute right-4 top-4 grid gap-1')
const SURFACE_CLASSES = cx(
  'overflow-hidden rounded-2 border border-white/15',
  'bg-#0b1016/78 shadow-[0_8px_24px_rgba(0,0,0,0.24)] backdrop-blur-sm',
)
const GROUP_CLASSES = cx('grid grid-cols-3', SURFACE_CLASSES)
const ZOOM_GROUP_CLASSES = cx('flex', SURFACE_CLASSES)
const BUTTON_CLASSES = cx(
  'grid h-8 w-8 place-items-center border-0 bg-transparent text-lg leading-none text-white/80',
  'transition-colors hover:bg-white/12 hover:text-white focus-visible:bg-white/16 focus-visible:text-white',
  'focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-#a9e5d2',
)
const EMPTY_DIRECTION_CLASSES = 'h-8 w-8'

export function CameraControls(props: CameraControlsProps) {
  const handleMoveDown = () => props.onMoveDown()
  const handleMoveLeft = () => props.onMoveLeft()
  const handleMoveRight = () => props.onMoveRight()
  const handleMoveUp = () => props.onMoveUp()
  const handleZoomIn = () => props.onZoomIn()
  const handleZoomOut = () => props.onZoomOut()

  return (
    <div class={PANEL_CLASSES} aria-label="카메라 조작">
      <div class={ZOOM_GROUP_CLASSES} aria-label="카메라 확대 축소">
        <button
          aria-label="축소"
          class={BUTTON_CLASSES}
          title="축소"
          type="button"
          onClick={handleZoomOut}
        >
          −
        </button>
        <button
          aria-label="확대"
          class={BUTTON_CLASSES}
          title="확대"
          type="button"
          onClick={handleZoomIn}
        >
          +
        </button>
      </div>
      <div class={GROUP_CLASSES} aria-label="카메라 좌우 상하 이동">
        <span aria-hidden="true" class={EMPTY_DIRECTION_CLASSES} />
        <button
          aria-label="위로 이동"
          class={BUTTON_CLASSES}
          title="위로 이동"
          type="button"
          onClick={handleMoveUp}
        >
          ↑
        </button>
        <span aria-hidden="true" class={EMPTY_DIRECTION_CLASSES} />
        <button
          aria-label="왼쪽으로 이동"
          class={BUTTON_CLASSES}
          title="왼쪽으로 이동"
          type="button"
          onClick={handleMoveLeft}
        >
          ←
        </button>
        <span aria-hidden="true" class={EMPTY_DIRECTION_CLASSES} />
        <button
          aria-label="오른쪽으로 이동"
          class={BUTTON_CLASSES}
          title="오른쪽으로 이동"
          type="button"
          onClick={handleMoveRight}
        >
          →
        </button>
        <span aria-hidden="true" class={EMPTY_DIRECTION_CLASSES} />
        <button
          aria-label="아래로 이동"
          class={BUTTON_CLASSES}
          title="아래로 이동"
          type="button"
          onClick={handleMoveDown}
        >
          ↓
        </button>
        <span aria-hidden="true" class={EMPTY_DIRECTION_CLASSES} />
      </div>
    </div>
  )
}
