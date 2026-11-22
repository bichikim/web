import {A} from '@solidjs/router'
import {createSignal, Match, Switch} from 'solid-js'
import SHeadControls from './SHeadControls'
import {useCharacterViewer} from './use-character-viewer'

const reload = () => globalThis.location.reload()

export default function SCharacterViewer() {
  const [canvas, setCanvas] = createSignal<HTMLCanvasElement | null>(null)
  const [viewport, setViewport] = createSignal<HTMLDivElement | null>(null)
  const viewer = useCharacterViewer({canvas, viewport})

  return (
    <main
      class="relative h-dvh w-full overflow-hidden bg-[#24212b] text-[#f6f2fa]"
      onPointerMove={viewer.handleLook}
      onPointerLeave={viewer.handleLeave}
    >
      <h1 class="sr-only">점술가 캐릭터</h1>
      <p class="sr-only" id="character-controls">
        드래그로 이동하고 휠이나 두 손가락으로 확대·축소합니다. 방향키로 이동, 더하기와 빼기로
        확대·축소, 0으로 화면에 맞춥니다.
      </p>
      <div
        ref={setViewport}
        role="region"
        aria-label="캐릭터 화면"
        aria-describedby="character-controls"
        aria-busy={viewer.status() === 'loading'}
        tabindex="0"
        class="absolute inset-0 touch-none select-none outline-none focus-visible:ring-2
          focus-visible:ring-inset focus-visible:ring-[#cbb5e3]"
        classList={{'cursor-grab': !viewer.dragging(), 'cursor-grabbing': viewer.dragging()}}
        onPointerDown={viewer.handlePointerDown}
        onPointerMove={viewer.handlePointerMove}
        onPointerUp={viewer.handlePointerEnd}
        onPointerCancel={viewer.handlePointerEnd}
        onLostPointerCapture={viewer.handlePointerEnd}
        onBlur={viewer.handleBlur}
        onWheel={viewer.handleWheel}
        onKeyDown={viewer.handleKeyDown}
      >
        <canvas
          ref={setCanvas}
          aria-hidden="true"
          class="pointer-events-none absolute inset-0 size-full"
        />
      </div>
      <Switch>
        <Match when={viewer.status() === 'loading'}>
          <p
            class="pointer-events-none absolute inset-0 grid place-items-center text-sm"
            role="status"
          >
            캐릭터 불러오는 중…
          </p>
        </Match>
        <Match when={viewer.status() === 'error'}>
          <div
            class="absolute inset-0 flex flex-col items-center justify-center gap-3"
            role="alert"
          >
            <p>캐릭터를 불러오지 못했어요.</p>
            <button
              class="fortune-focus rounded-full bg-[#65488a] px-5 py-2 text-white"
              type="button"
              onClick={reload}
            >
              다시 불러오기
            </button>
          </div>
        </Match>
      </Switch>
      <A
        href="/"
        class="fortune-focus absolute left-4 top-4 flex size-11 items-center justify-center
          rounded-full bg-[#302b39]/90 text-xl hover:bg-[#463c53]"
        aria-label="홈으로 돌아가기"
        title="홈으로 돌아가기"
      >
        <span aria-hidden="true">←</span>
      </A>
      <div
        class="absolute right-4 top-4 flex items-center gap-1 rounded-full
          border border-white/15 bg-[#302b39]/95 p-1 shadow-lg"
        role="group"
        aria-label="화면 배율"
      >
        <button
          type="button"
          class="fortune-focus size-11 rounded-full bg-transparent text-2xl text-inherit
            hover:bg-white/10 disabled:opacity-40"
          aria-label="축소"
          title="축소 (-)"
          onClick={viewer.zoomOut}
          disabled={viewer.status() !== 'ready'}
        >
          −
        </button>
        <output class="w-16 text-center text-sm tabular-nums" aria-label="배율">
          {viewer.zoomPercent()}%
        </output>
        <button
          type="button"
          class="fortune-focus size-11 rounded-full bg-transparent text-2xl text-inherit
            hover:bg-white/10 disabled:opacity-40"
          aria-label="확대"
          title="확대 (+)"
          onClick={viewer.zoomIn}
          disabled={viewer.status() !== 'ready'}
        >
          +
        </button>
        <button
          type="button"
          class="fortune-focus min-h-11 rounded-full bg-transparent px-4 text-sm text-inherit
            hover:bg-white/10 disabled:opacity-40"
          title="화면에 맞추기 (0)"
          onClick={viewer.reset}
          disabled={viewer.status() !== 'ready'}
        >
          맞춤
        </button>
      </div>
      <SHeadControls
        disabled={viewer.status() !== 'ready'}
        following={viewer.following()}
        direction={viewer.direction()}
        onTurn={viewer.turnHead}
        onToggleFollowing={viewer.toggleFollowing}
      />
    </main>
  )
}
