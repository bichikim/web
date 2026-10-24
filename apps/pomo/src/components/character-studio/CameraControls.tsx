import {For} from 'solid-js'
import {cx} from 'class-variance-authority'
import type {CameraAction} from './camera-control'

const ACTIONS = [
  {action: 'up', label: '↑ 위 이동'},
  {action: 'down', label: '↓ 아래 이동'},
  {action: 'left', label: '← 왼쪽 이동'},
  {action: 'right', label: '→ 오른쪽 이동'},
  {action: 'zoom-in', label: '＋ 확대'},
  {action: 'zoom-out', label: '− 축소'},
  {action: 'rotate-left', label: '↶ 왼쪽 회전'},
  {action: 'rotate-right', label: '↷ 오른쪽 회전'},
  {action: 'reset', label: '시점 초기화'},
] as const

interface CameraControlsProps {
  readonly disabled?: boolean
  readonly onAction: (action: CameraAction) => void
}

export const CameraControls = (props: CameraControlsProps) => (
  <fieldset
    class="m-0 min-w-0 rounded-5 border border-white/10 bg-#171f28 p-4"
    disabled={props.disabled}
  >
    <legend class="px-2 text-sm font-700 text-#d9e1e6">카메라 조작</legend>
    <div class="grid grid-cols-2 gap-2 sm:grid-cols-3">
      <For each={ACTIONS}>
        {(item) => (
          <button
            class={cx(
              'min-h-11 rounded-3 border border-white/15 bg-white/5 px-3 text-sm text-#d9e1e6',
              'hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2',
              'focus-visible:outline-#a9e5d2 disabled:cursor-not-allowed disabled:opacity-40',
            )}
            onClick={() => props.onAction(item.action)}
            type="button"
          >
            {item.label}
          </button>
        )}
      </For>
    </div>
    <p class="mb-0 mt-3 text-xs leading-5 text-#9ba8b1">
      드래그로 회전하고 휠로 확대·축소할 수 있어요.
    </p>
  </fieldset>
)
