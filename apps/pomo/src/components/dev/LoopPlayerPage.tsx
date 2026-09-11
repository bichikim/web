import {Title} from '@solidjs/meta'
import {A} from '@solidjs/router'
import {useLoopPlayer} from 'src/features/loop-player'

const INPUT = 'min-h-11 rounded-xl border border-white/20 bg-#17131f p-3 text-#f8edf1'
export function LoopPlayerPage() {
  const {
    duration,
    overlap,
    play,
    playing,
    position,
    previewPosition,
    seek,
    select,
    setOverlap,
    status,
    stop,
  } = useLoopPlayer()
  return (
    <main class="min-h-dvh bg-#17131f px-5 py-8 text-#f8edf1 sm:px-8">
      <Title>Pomofi — 크로스페이드 루프 플레이어</Title>
      <div class="mx-auto max-w-3xl grid gap-6">
        <nav class="flex gap-5 text-#b8e8d0">
          <A href="/dev">← 실험실</A>
          <A href="/dev/sound-loop">AI 루프 연결</A>
        </nav>
        <h1 class="m-0 text-3xl">크로스페이드 루프 플레이어</h1>
        <p class="m-0 text-#bdb2c4 leading-7">
          같은 음원의 끝과 다음 시작을 겹쳐 반복합니다. 끝은 서서히 작아지고, 다음 시작은 서서히
          커집니다.
        </p>
        <label class="grid gap-3">
          오디오 파일
          <input
            type="file"
            accept="audio/*"
            onChange={(event) => select(event.currentTarget.files?.[0] ?? null)}
          />
        </label>
        <label class="grid gap-2">
          겹쳐 재생할 시간 (초)
          <input
            class={INPUT}
            type="number"
            min="0.1"
            max={duration() / 2 || undefined}
            step="0.1"
            value={overlap()}
            disabled={playing()}
            onInput={(event) => setOverlap(event.currentTarget.valueAsNumber)}
          />
        </label>
        <p class="m-0 text-sm text-#bdb2c4">
          음원 길이: {duration().toFixed(1)}초 · 기본 겹침 4초 · 최대 음원 길이의 절반
        </p>
        <label class="grid gap-2">
          재생 위치 · {position().toFixed(1)} / {duration().toFixed(1)}초
          <input
            aria-label="재생 위치"
            class="min-h-11 w-full accent-#b8e8d0"
            type="range"
            min="0"
            max={duration()}
            step="0.1"
            value={position()}
            disabled={!duration()}
            onInput={(event) => previewPosition(event.currentTarget.valueAsNumber)}
            onChange={seek}
          />
        </label>
        <div class="flex flex-wrap gap-3">
          <button
            class="min-h-11 rounded-xl border-0 bg-#b8e8d0 px-5 text-#17131f font-700 disabled:opacity-50"
            type="button"
            disabled={!duration() || playing()}
            onClick={() => play(false)}
          >
            루프 재생
          </button>
          <button
            class={INPUT}
            type="button"
            disabled={!duration() || playing()}
            onClick={() => play(true)}
          >
            연결 직전부터 듣기
          </button>
          <button class={INPUT} type="button" disabled={!playing()} onClick={stop}>
            정지
          </button>
        </div>
        <p role="status" class="m-0 text-#b8e8d0">
          {status()}
        </p>
        <p class="text-sm text-#bdb2c4 leading-6">
          파일을 새로 생성하거나 서버로 전송하지 않습니다. 이 페이지를 열어 둔 상태에서 연결 부위를
          확인하세요.
        </p>
      </div>
    </main>
  )
}
