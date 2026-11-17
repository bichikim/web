import {For} from 'solid-js'

interface SHeadControlsProps {
  readonly disabled?: boolean
  readonly following: boolean
  readonly direction: number | null
  readonly onTurn: (direction: -1 | 0 | 1) => void
  readonly onToggleFollowing: () => void
}

const directions = [
  {label: '왼쪽', value: -1},
  {label: '정면', value: 0},
  {label: '오른쪽', value: 1},
] as const

export default function SHeadControls(props: SHeadControlsProps) {
  return (
    <div class="absolute inset-x-4 bottom-4 flex flex-wrap items-center justify-center gap-2">
      <div
        class="flex items-center gap-1 rounded-full border border-white/15 bg-[#302b39]/95
          p-1 shadow-lg"
        role="group"
        aria-label="고개 방향"
      >
        <For each={directions}>
          {(direction) => (
            <button
              type="button"
              class="fortune-focus min-h-11 rounded-full bg-transparent px-4 text-sm text-inherit
                hover:bg-white/10 disabled:opacity-40"
              classList={{'bg-[#65488a]!': props.direction === direction.value}}
              aria-pressed={props.direction === direction.value}
              aria-label={`${direction.label} 보기`}
              disabled={props.disabled}
              onClick={() => props.onTurn(direction.value)}
            >
              {direction.label}
            </button>
          )}
        </For>
      </div>
      <button
        type="button"
        class="fortune-focus min-h-11 rounded-full border border-white/15 bg-[#302b39]/95
          px-4 text-sm text-inherit shadow-lg hover:bg-[#463c53] disabled:opacity-40"
        aria-pressed={props.following}
        aria-label="마우스 시선 추적"
        title={props.following ? '현재 시선 고정' : '마우스 따라보기'}
        disabled={props.disabled}
        onClick={() => props.onToggleFollowing()}
      >
        마우스 추적 {props.following ? '켜짐' : '꺼짐'}
      </button>
    </div>
  )
}
