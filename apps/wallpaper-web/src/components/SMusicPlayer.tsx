import {createSignal, Show} from 'solid-js'
import {useMusicPlayer} from '../features/music-player'
import {SIcon} from './SIcon'

export const SMusicPlayer = () => {
  const [element, setElement] = createSignal<HTMLAudioElement | null>(null)
  const player = useMusicPlayer({element})
  const active = () => player.status() === 'playing' || player.status() === 'loading'
  const artwork = () => player.track()?.artwork ?? player.album()?.artwork
  return (
    <>
      <audio
        ref={setElement}
        src={player.track()?.src}
        prop:volume={1}
        preload="none"
        onPlaying={player.handlePlaying}
        onPause={player.handlePause}
        onWaiting={player.handleWaiting}
        onError={player.handleError}
        onEnded={player.ended}
        onLoadedMetadata={player.syncTime}
        onDurationChange={player.syncTime}
        onTimeUpdate={player.syncTime}
      />
      <section
        aria-label="음악 플레이어"
        class="pointer-events-auto flex h-11 min-w-0 max-w-68 flex-1 items-center
          gap-[clamp(0.25rem,1.5vw,0.5rem)] rounded-full
          border border-solid border-white/80 bg-white/90 p-1.25 text-ink
          shadow-[0_8px_30px_-12px_#35244745] backdrop-blur-xl"
      >
        <button
          type="button"
          aria-label={
            player.libraryStatus() === 'error'
              ? '음악 다시 불러오기'
              : active()
                ? '음악 일시 정지'
                : '음악 재생'
          }
          disabled={player.track() === null && player.libraryStatus() !== 'error'}
          aria-busy={player.status() === 'loading'}
          onClick={player.toggle}
          class="relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full border-0 bg-ink
            text-white hover:bg-violet disabled:opacity-35"
        >
          <Show when={artwork()}>
            {(source) => (
              <>
                <img
                  src={source()}
                  alt={`${player.track()?.title ?? player.album()?.title} 커버`}
                  width="32"
                  height="32"
                  class="pointer-events-none absolute inset-0 h-full w-full object-cover"
                />
                <span aria-hidden="true" class="pointer-events-none absolute inset-0 bg-ink/30" />
              </>
            )}
          </Show>
          <SIcon name={active() ? 'pause' : 'play'} class="relative h-6 w-6" />
        </button>
        <div class="min-w-0 flex-1 text-left">
          <span class="block truncate text-[11px] font-600 leading-4">
            {player.track()?.title ?? player.album()?.title ?? '음악'}
          </span>
          <span class="block truncate text-[9px] leading-3 text-muted">
            <Show
              when={player.track() !== null}
              fallback={
                player.libraryStatus() === 'error'
                  ? '다시 불러오기'
                  : player.libraryStatus() === 'loading'
                    ? '불러오는 중'
                    : '등록된 곡 없음'
              }
            >
              {player.track()?.artist ?? player.album()?.artist} · {player.album()?.title}
            </Show>
          </span>
        </div>
        <button
          type="button"
          aria-label="다음 곡"
          disabled={!player.canNext()}
          onClick={player.next}
          class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-0 bg-transparent
            hover:bg-lilac disabled:opacity-25"
        >
          <SIcon name="next" />
        </button>
      </section>
    </>
  )
}
