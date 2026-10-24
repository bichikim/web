import {cx} from 'class-variance-authority'
import {For} from 'solid-js'
import {FOCUS_ROOM_SCENES, type PSceneId} from '../../features/focus-room-animation/index'
import {PANEL_CLASSES} from './shared'

export const ScenePicker = (props: {
  readonly onSelect: (id: PSceneId) => void
  readonly selectedId: PSceneId
}) => (
  <nav
    aria-label="프리뷰 장면"
    class={cx(
      PANEL_CLASSES,
      'absolute inset-x-3 top-3 flex gap-2 overflow-x-auto p-2 sm:inset-x-6 sm:top-6',
    )}
  >
    <For each={FOCUS_ROOM_SCENES}>
      {(scene, index) => (
        <button
          aria-pressed={props.selectedId === scene.id}
          class={cx(
            'min-w-40 shrink-0 rounded-4 border px-3 py-2.5 text-left transition-colors',
            props.selectedId === scene.id
              ? 'border-#e8c795 bg-#e8c795 text-#241b12'
              : 'border-white/8 bg-white/4 text-#e7dfe9 hover:bg-white/9',
          )}
          onClick={() => props.onSelect(scene.id)}
          type="button"
        >
          <span class="block text-[0.625rem] font-800 tracking-[0.14em] uppercase opacity-70">
            preview {String(index() + 1).padStart(2, '0')}
          </span>
          <span class="mt-1 block text-xs font-750">{scene.label}</span>
        </button>
      )}
    </For>
  </nav>
)
