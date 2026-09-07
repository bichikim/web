import {cx} from 'class-variance-authority'
import {For, Show} from 'solid-js'

import {getPrimaryMood, MOOD_MODIFIERS, type TextMoodAnalysis} from '../../features/text-mood'

const MAXIMUM_PERCENTAGE = 100

const formatPercentage = (value: number) => `${Math.round(value * MAXIMUM_PERCENTAGE)}%`

export interface TextMoodAnalysisResultProps {
  readonly analysis: TextMoodAnalysis
}

export const TextMoodAnalysisResult = (props: TextMoodAnalysisResultProps) => {
  const primary = () => getPrimaryMood(props.analysis.primary.id)
  const secondary = () => {
    const score = props.analysis.secondary
    return score === null ? null : {...getPrimaryMood(score.id), probability: score.probability}
  }

  return (
    <div class="mt-10 grid gap-6 2xl:grid-cols-[minmax(0,0.9fr)_minmax(22rem,1.1fr)]">
      <div class="grid content-start gap-4">
        <article
          class={cx(
            'grid gap-4 rounded-6 border p-5 xs:grid-cols-[auto_1fr] xs:items-center xs:p-6',
            props.analysis.uncertain
              ? 'border-#f0c99a/35 bg-#f0c99a/7'
              : 'border-#9ed6bb/30 bg-#9ed6bb/7',
          )}
        >
          <span aria-hidden="true" class="text-5xl xs:text-6xl">
            {primary().icon}
          </span>
          <div>
            <div class="flex flex-wrap items-center gap-2">
              <p class="m-0 text-xs font-750 tracking-[0.16em] text-#9ed6bb uppercase">주 분위기</p>
              <Show when={props.analysis.uncertain}>
                <span class="rounded-full bg-#f0c99a/14 px-2 py-1 text-[0.625rem] font-700 text-#f4d7b5">
                  판단 경계
                </span>
              </Show>
            </div>
            <h2 class="mb-0 mt-2 text-2xl font-800">{primary().label}</h2>
            <p class="mb-0 mt-1 text-sm leading-6 text-#bdb2c4">
              {primary().description} · {formatPercentage(props.analysis.primary.probability)}
            </p>
          </div>
        </article>

        <Show when={secondary()}>
          {(moodScore) => (
            <div class="flex items-center gap-3 rounded-4 bg-white/4 px-4 py-3 text-sm">
              <span aria-hidden="true" class="text-2xl">
                {moodScore().icon}
              </span>
              <span class="text-#aaa0b1">가까운 분위기</span>
              <strong class="ml-auto text-#e9dfe9">{moodScore().label}</strong>
              <span class="text-#8f8297">{formatPercentage(moodScore().probability)}</span>
            </div>
          )}
        </Show>

        <div class="grid gap-2 xs:grid-cols-2">
          <For each={props.analysis.modifiers}>
            {(modifierScore) => {
              const definition = MOOD_MODIFIERS.find(
                (candidate) => candidate.id === modifierScore.id,
              )

              return (
                <div
                  class={cx(
                    'flex items-center gap-3 rounded-4 border px-4 py-3',
                    modifierScore.active
                      ? 'border-#f2a7b8/35 bg-#f2a7b8/8'
                      : 'border-white/8 bg-white/2 opacity-60',
                  )}
                >
                  <span aria-hidden="true" class="text-xl">
                    {definition?.icon}
                  </span>
                  <div>
                    <p class="m-0 text-xs font-700 text-#e9dfe9">{definition?.label}</p>
                    <p class="mb-0 mt-1 text-[0.6875rem] text-#8f8297">
                      {modifierScore.active ? '감지됨' : '감지되지 않음'} ·{' '}
                      {formatPercentage(modifierScore.probability)}
                    </p>
                  </div>
                </div>
              )
            }}
          </For>
        </div>
      </div>

      <section aria-labelledby="mood-score-heading" class="rounded-6 bg-#17131f/70 p-5">
        <div class="flex items-end justify-between gap-4">
          <div>
            <p class="m-0 text-xs font-750 tracking-[0.16em] text-#9ed6bb uppercase">
              Score distribution
            </p>
            <h2 class="mb-0 mt-2 text-lg font-800" id="mood-score-heading">
              전체 분위기 점수
            </h2>
          </div>
          <span class="text-xs text-#8f8297">차이 {formatPercentage(props.analysis.margin)}</span>
        </div>
        <div class="mt-5 grid gap-3">
          <For each={props.analysis.scores}>
            {(score) => {
              const definition = getPrimaryMood(score.id)
              return (
                <div class="grid grid-cols-[6.5rem_1fr_2.5rem] items-center gap-3 text-xs">
                  <span class="truncate text-#bdb2c4">
                    {definition.icon} {definition.label}
                  </span>
                  <div class="h-2 overflow-hidden rounded-full bg-white/7">
                    <div
                      class={cx(
                        'h-full rounded-full [width:var(--pomo-progress-width)]',
                        score.id === props.analysis.primary.id ? 'bg-#9ed6bb' : 'bg-#655b6c',
                      )}
                      style={{'--pomo-progress-width': formatPercentage(score.probability)}}
                    />
                  </div>
                  <span class="text-right tabular-nums text-#8f8297">
                    {formatPercentage(score.probability)}
                  </span>
                </div>
              )
            }}
          </For>
        </div>
      </section>
    </div>
  )
}
