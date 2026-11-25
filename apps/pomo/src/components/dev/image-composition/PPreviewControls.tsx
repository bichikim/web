import type {JSX} from 'solid-js'

export interface PPreviewControlsProps {
  readonly background: string
  readonly onBackgroundChange?: (color: string) => void
  readonly onPoseChange?: (angle: number) => void
  readonly pose: number
}

export function PPreviewControls(props: PPreviewControlsProps) {
  const handlePose: JSX.EventHandler<HTMLInputElement, InputEvent> = (event) =>
    props.onPoseChange?.(event.currentTarget.valueAsNumber)
  const handleBackground: JSX.EventHandler<HTMLInputElement, InputEvent> = (event) =>
    props.onBackgroundChange?.(event.currentTarget.value)

  return (
    <>
      <label class="mt-4 grid gap-2 text-sm">
        고개 회전 시험 · {props.pose}°
        <input
          aria-label="고개 회전 시험"
          class="w-full accent-#f0c99a"
          disabled={props.onPoseChange === undefined}
          max="8"
          min="-8"
          onInput={handlePose}
          step="0.5"
          type="range"
          value={props.pose}
        />
      </label>
      <label class="mt-4 flex items-center gap-3 text-sm">
        투명 가장자리 확인 배경
        <input
          aria-label="투명 가장자리 확인 배경"
          disabled={props.onBackgroundChange === undefined}
          onInput={handleBackground}
          type="color"
          value={props.background}
        />
      </label>
    </>
  )
}
