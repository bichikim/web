import {createMemo, For, on, Show} from 'solid-js'
import type {StoryFrame} from '../features/desktop-story/frame'
import {SIcon} from './SIcon'
import {SDesktopPreview} from './SDesktopPreview'
import {SCodexStory} from './SCodexStory'
import type {useCharacterSpeech} from '../features/character-speech'
import CHAPTERS from '../data/story/chapters.json'
import {SStoryCopy} from './SStoryCopy'

interface SDesktopStoryProps {
  /** The scene mask supplies the entrance for diagonal transitions. */
  readonly animated?: boolean
  /** Current product chapter and its scroll-driven presentation. */
  readonly frame: StoryFrame
  /** Return to the original interactive widget without resetting preferences. */
  readonly onReturn?: () => void
  readonly speech?: ReturnType<typeof useCharacterSpeech>
  readonly ready?: boolean
}

const SAppPreview = (props: {readonly miniature?: boolean}) => (
  <div
    aria-hidden="true"
    class="absolute bottom-[10%] left-[6%] w-[44%] max-w-72 -rotate-3 rounded-[1.2rem]
      border border-solid border-white/90 bg-white/90 p-3 text-ink
      shadow-[0_20px_70px_-25px_#372c6555] backdrop-blur-xl
      sm:bottom-[12%] sm:left-[48%] sm:w-[21%] sm:p-4"
  >
    <div class="flex items-center justify-between pb-2.5">
      <span class="text-[10px] font-750 sm:text-xs">Poffo / WIDGET</span>
      <span class="h-2 w-2 rounded-full bg-[#9bb9b1]" />
    </div>
    <div class="mt-3 flex items-center gap-2">
      <img src="/favicon.png" alt="" class="h-7 w-7 object-contain sm:h-9 sm:w-9" />
      <div class="text-[10px] font-650 sm:text-xs">애시 캐릭터</div>
    </div>
    <div class="mt-3 flex justify-between text-[9px] sm:text-[11px]">
      <span>동작</span>
      <span class="font-650 text-violet">{props.miniature ? '작아지기' : '커피 들기'}</span>
    </div>
    <div class="mt-2.5 flex justify-between text-[9px] sm:text-[11px]">
      <span>시선 추적</span>
      <span class="flex h-3.5 w-6 items-center justify-end rounded-full bg-violet p-0.5">
        <span class="h-2.5 w-2.5 rounded-full bg-white" />
      </span>
    </div>
    <div class="mt-3 hidden items-center gap-2 sm:flex">
      <span class="text-[11px]">크기</span>
      <span class="h-1 flex-1 rounded-full bg-lilac">
        <span class="block h-1 w-2/3 rounded-full bg-violet" />
      </span>
      <span class="text-[10px]">100%</span>
    </div>
  </div>
)

export const SDesktopStory = (props: SDesktopStoryProps) => {
  const chapter = () => CHAPTERS[props.frame.chapter]!
  const visibleKind = createMemo(() => (props.frame.visible ? props.frame.kind : null))
  const animated = createMemo(on(visibleKind, () => props.animated !== false))
  const desktopVisible = createMemo(
    () => props.frame.kind === 'overview' || props.frame.kind === 'wallpaper',
  )

  return (
    <section
      aria-label="Poffo Wallpaper 앱 소개"
      aria-hidden={!props.frame.visible}
      inert={!props.frame.visible || props.frame.transitioning}
      data-story-chapter={props.frame.visible ? props.frame.chapter : undefined}
      class="pointer-events-none absolute inset-0 text-ink opacity-[var(--story-visible)]"
      style={{
        '--story-progress': props.frame.progress,
        '--story-visible': Number(props.frame.visible),
      }}
    >
      <div
        class="absolute inset-0 bg-[#f2effb]/90"
        classList={{
          'bg-[#e7e3f5]/95!': props.frame.kind === 'download',
          'bg-[#edf5fa]/75!': props.frame.kind === 'widgets' || props.frame.kind === 'codex',
          'bg-[#eee8f5]/65!': props.frame.kind === 'details',
          'bg-white/30!': props.frame.kind === 'wallpaper',
        }}
      />
      <Show when={props.frame.visible ? props.frame.kind : null} keyed>
        <div
          class="absolute left-[6%] top-[18%] w-[88%] sm:left-[7%] sm:top-[23%] sm:w-[52%]"
          classList={{'top-[14%]! sm:top-[15%]!': desktopVisible()}}
        >
          <p
            class="relative mb-5 w-fit text-[9px] font-750 tracking-[0.18em] sm:mb-7 sm:text-[11px]"
            classList={{'mb-4!': desktopVisible()}}
          >
            <span
              aria-hidden="true"
              class="story-copy-surface"
              classList={{'animate-story-caption': animated()}}
            />
            <span class="relative inline-block" classList={{'animate-story-caption': animated()}}>
              {chapter().label}
            </span>
          </p>
          <h2
            class="relative w-fit max-w-full [font-family:Arial,Helvetica,sans-serif]
            text-[clamp(2.8rem,14vw,5.8rem)]
            font-900 leading-[0.83] tracking-[-0.075em] sm:text-[clamp(5rem,9.4vw,10rem)]"
            classList={{
              'text-[clamp(2.5rem,11vw,5rem)]! sm:text-[clamp(3rem,min(7vw,10dvh),8rem)]!':
                desktopVisible(),
            }}
          >
            <span aria-hidden="true" class="story-copy-surface" />
            <For each={chapter().lines}>
              {(line, index) => (
                <span
                  class="relative block w-max max-w-full"
                  classList={{
                    'animate-story-title': animated() && index() === 0,
                    'animate-story-title-alt': animated() && index() !== 0,
                  }}
                >
                  {line}
                </span>
              )}
            </For>
          </h2>
          <div
            class="relative mt-6 w-fit max-w-95 sm:mt-9"
            classList={{'mt-4! sm:mt-5!': desktopVisible()}}
          >
            <div
              aria-hidden="true"
              class="story-copy-surface"
              classList={{'animate-story-caption': animated()}}
            />
            <SStoryCopy
              chapter={props.frame.chapter}
              animated={animated()}
              speech={props.speech}
              ready={props.ready && !props.frame.transitioning}
            />
          </div>
          <Show when={props.frame.kind === 'download'}>
            <div class="pointer-events-auto relative mt-5 flex w-max max-w-full flex-wrap items-center gap-3 sm:mt-7">
              <span aria-hidden="true" class="story-copy-surface pointer-events-none" />
              <button
                type="button"
                popovertarget="app-download"
                class="relative flex min-h-11 items-center gap-4 rounded-full border-0 bg-ink px-5 text-xs text-white
                hover:bg-violet sm:min-h-13 sm:px-7 sm:text-sm"
              >
                앱 다운로드 <SIcon name="download" class="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={() => props.onReturn?.()}
                class="relative min-h-11 rounded-full border-0 bg-transparent px-3 text-xs underline underline-offset-4"
              >
                다시 체험하기
              </button>
            </div>
          </Show>
        </div>
      </Show>
      <Show when={props.frame.visible && desktopVisible()}>
        <SDesktopPreview
          live={props.frame.kind === 'wallpaper'}
          playing={!props.frame.transitioning}
        />
      </Show>
      <Show when={props.frame.kind === 'widgets' || props.frame.kind === 'details'}>
        <SAppPreview miniature={props.frame.kind === 'details'} />
      </Show>
      <Show when={props.frame.visible && props.frame.kind === 'codex'}>
        <SCodexStory
          speech={props.speech}
          ready={props.ready}
          playing={!props.frame.transitioning}
        />
      </Show>
      <div
        aria-hidden="true"
        class="absolute bottom-6 left-[6%] right-[6%] flex items-center gap-4 sm:left-[7%] sm:right-[7%]"
      >
        <span class="text-[10px] font-700 tabular-nums">
          0{props.frame.chapter + 1} / 0{CHAPTERS.length}
        </span>
        <span class="h-px flex-1 bg-ink/15">
          <span class="block h-px origin-left scale-x-[var(--story-progress)] bg-ink" />
        </span>
        <span class="text-[9px] font-700 tracking-widest">SCROLL TO EXPLORE ↓</span>
      </div>
    </section>
  )
}
