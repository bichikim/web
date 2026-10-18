import * as m from '@paraglide/message'
import {Show} from 'solid-js'
import {
  TAROT_DRAW_COUNTS,
  type TarotLocale,
  type TarotReadingController,
  type TarotSpeechController,
} from '../../features/tarot'
import {PButton} from '../p-button/PButton'
import {PRadioSwitch} from '../p-radio-switch/PRadioSwitch'
import {PTextField} from '../p-text-field/PTextField'
import {Reading} from './Reading'
import {Spread} from './Spread'
import {Options} from './Options'
import {ModelDownloads} from './ModelDownloads'

const TABLE_THEME =
  '[--pomo-color-foreground-channels:242_232_207] [--pomo-color-foreground-opacity:1] ' +
  '[--pomo-color-muted-foreground-channels:184_182_158] [--pomo-color-muted-foreground-opacity:1] ' +
  '[--pomo-color-highlight-channels:216_185_126] [--pomo-color-highlight-opacity:1] ' +
  '[--pomo-color-border-channels:150_133_94] [--pomo-color-border-opacity:1] ' +
  '[--pomo-color-border-hover-channels:216_185_126] [--pomo-color-border-hover-opacity:1] ' +
  '[--pomo-color-primary-channels:216_185_126] [--pomo-color-primary-opacity:1] ' +
  '[--pomo-color-primary-soft-channels:216_185_126] [--pomo-color-primary-soft-opacity:0.16] ' +
  '[--pomo-color-primary-strong-channels:216_185_126] [--pomo-color-primary-strong-opacity:1] ' +
  '[--pomo-color-secondary-soft-channels:216_185_126] [--pomo-color-secondary-soft-opacity:0.08] ' +
  '[--pomo-color-surface-overlay-channels:13_27_24] [--pomo-color-surface-overlay-opacity:1] ' +
  '[--pomo-color-content-surface-channels:13_27_24] [--pomo-color-content-surface-opacity:1]'

const SECONDARY_BUTTON =
  'whitespace-nowrap !rounded-full !px-4 focus-visible:!shadow-[0_0_0_3px_#d8b97e80]'

const COUNT_SELECTOR =
  'min-w-0 [&>div]:min-h-[3.25rem] [&>label]:text-[#d8b97e] ' +
  '[&>div>div>div]:gap-0.5 [&>div>div>div]:px-1 [&>div>div>div]:text-xs ' +
  'sm:[&>div>div>div]:text-sm [&>div>div>div>span]:whitespace-nowrap ' +
  '[&>div>div>div>span>span]:size-4'

export interface TarotProps {
  readonly locale: TarotLocale
  readonly reading: TarotReadingController
  readonly speech: TarotSpeechController
}

export const Tarot = (props: TarotProps) => {
  const isBusy = () =>
    props.reading.status() === 'checking' ||
    props.reading.status() === 'downloading' ||
    props.reading.status() === 'preparing' ||
    props.reading.status() === 'generating'
  const canInterpret = () =>
    props.reading.cards().length > 0 &&
    (props.reading.status() === 'idle' || props.reading.status() === 'complete')
  const handleCountChange = (value: string) => {
    const count = Object.values(TAROT_DRAW_COUNTS).find((count) => String(count) === value)
    if (count !== undefined) {
      props.reading.setCount(count)
    }
  }
  const isTextDownloading = () => props.reading.status() === 'downloading'
  const isInterpreting = () => isBusy() && !isTextDownloading()
  return (
    <section
      aria-label={m.tarot_tab()}
      class={
        `relative grid min-w-0 grid-cols-1 gap-4 p-4 text-foreground ` +
        `bg-[radial-gradient(ellipse_at_50%_35%,#24463b_0%,#142c26_50%,#0e211d_100%)] ` +
        `shadow-[inset_0_0_60px_#0003] sm:gap-5 sm:p-6 ${TABLE_THEME}`
      }
    >
      <div class="grid min-w-0 grid-cols-1 gap-4">
        <PRadioSwitch
          class={`${COUNT_SELECTOR} w-64 max-w-full`}
          disabled={isBusy()}
          label={m.tarot_count_label()}
          onChange={handleCountChange}
          options={[
            {label: m.tarot_one_card(), value: '1'},
            {label: m.tarot_three_cards(), value: '3'},
            {label: m.tarot_five_cards(), value: '5'},
          ]}
          value={String(props.reading.count())}
        />
        <PTextField
          class="min-w-0 [&>label]:text-sm [&>label]:text-[#d8b97e] [&>textarea]:min-w-0
            [&>textarea]:min-h-[3.25rem] [&>textarea]:h-[3.25rem]
            [&>textarea]:bg-[#0d1b18] [&>textarea]:rounded-3"
          disabled={isBusy()}
          label={m.tarot_question_label()}
          multiline
          onChange={props.reading.setQuestion}
          rows={1}
          value={props.reading.question()}
        />
        <div class="flex min-w-0 flex-wrap items-center justify-between gap-3">
          <Options
            autoRead={props.speech.autoRead()}
            onAutoReadChange={props.speech.setAutoRead}
            onUprightChange={props.reading.setShowCardsUpright}
            upright={props.reading.showCardsUpright()}
          />
          <div class="ml-auto flex flex-wrap items-center justify-end gap-2">
            <ModelDownloads part="progress" reading={props.reading} speech={props.speech} />
            <Show when={!isBusy()}>
              <PButton
                class="whitespace-nowrap !rounded-full !px-4 !text-[#241d10]
                  !shadow-[0_4px_20px_#0004,inset_0_1px_0_#fff6]
              focus-visible:!outline-2 focus-visible:!outline-solid focus-visible:!outline-offset-4
                focus-visible:!outline-[#d8b97e]"
                icon="i-tabler-sparkles"
                disabled={
                  props.reading.status() === 'consent' || props.speech.status() === 'consent'
                }
                onPress={props.reading.draw}
                raised
              >
                {props.reading.cards().length > 0 ? m.tarot_redraw() : m.tarot_draw()}
              </PButton>
            </Show>
            <Show when={isInterpreting()}>
              <PButton
                class={SECONDARY_BUTTON}
                bordered
                icon="i-tabler-loader-2 animate-spin motion-reduce:animate-none"
                onPress={props.reading.cancel}
                tone="secondary"
                transparent
              >
                {m.tarot_cancel()}
              </PButton>
            </Show>
            <Show when={canInterpret()}>
              <PButton
                accessibleLabel={m.tarot_interpret()}
                class={SECONDARY_BUTTON}
                bordered
                icon="i-tabler-sparkles"
                onPress={props.reading.retry}
                tone="secondary"
                tooltip={m.tarot_interpret()}
                transparent
              />
            </Show>
            <Show when={props.reading.cards().length > 0 && props.reading.status() === 'error'}>
              <PButton
                class={SECONDARY_BUTTON}
                bordered
                onPress={props.reading.retry}
                tone="secondary"
                transparent
              >
                {m.tarot_retry()}
              </PButton>
            </Show>
          </div>
        </div>
      </div>
      <Spread
        cards={props.reading.cards()}
        count={props.reading.count()}
        locale={props.locale}
        showUpright={props.reading.showCardsUpright()}
      />
      <ModelDownloads part="consent" reading={props.reading} speech={props.speech} />
      <Show when={props.reading.status() === 'unsupported'}>
        <p role="status" class="m-0 text-sm leading-6 text-muted-foreground">
          {m.tarot_unsupported()}
        </p>
      </Show>
      <Show when={props.reading.status() === 'error'}>
        <p role="alert" class="m-0 text-sm leading-6 text-danger">
          {props.reading.error() ?? m.tarot_result_empty()}
        </p>
      </Show>
      <Reading
        visible={props.reading.cards().length > 0}
        output={props.reading.output()}
        generating={isInterpreting()}
        speech={props.speech}
      />
    </section>
  )
}
