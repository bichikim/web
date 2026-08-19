import {A, useNavigate} from '@solidjs/router'
import {cx} from 'class-variance-authority'
import {For, Show} from 'solid-js'

import {
  usePDialogueEditor,
  type UsePDialogueEditorProps,
  usePEvents,
} from '../features/focus-room-dialogue'
import {
  SUPERTONIC_LANGUAGE_OPTIONS,
  SUPERTONIC_MODELS,
  SUPERTONIC_VOICES,
} from '../features/supertonic'
import {getPrimaryMood, getPrimaryMoodIcon} from '../features/text-mood'

const CLASSES = {
  dialogueEditor: [
    'pomo-dialogue-editor min-h-dvh box-border',
    'bg-[radial-gradient(circle_at_15%_0%,_rgb(122_83_53_/_20%),_transparent_32rem),_#17130f]',
    'pt-[max(1.25rem,_var(--pomo-safe-area-inset-top))]',
    'pr-[max(1.25rem,_var(--pomo-safe-area-inset-right))]',
    'pb-[max(6rem,_calc(1.25rem_+_var(--pomo-safe-area-inset-bottom)))]',
    'pl-[max(1.25rem,_var(--pomo-safe-area-inset-left))]',
    'text-[#fffaf1]',
  ].join(' '),
  dialogueEditorBack: [
    'pomo-dialogue-editor__back flex min-h-11 box-border flex-none items-center gap-2',
    '[border:1px_solid_rgb(255_255_255_/_12%)] rounded-full py-0 px-4 text-[#fffaf1] no-underline',
    '[&:focus-visible]:[outline:2px_solid_#d6b585] [&:focus-visible]:[outline-offset:2px]',
    'max-xl:[justify-self:start]',
  ].join(' '),
  dialogueEditorButton: [
    'pomo-dialogue-editor__button [&:focus-visible]:[outline:2px_solid_#d6b585]',
    '[&:focus-visible]:[outline-offset:2px] min-h-11 cursor-pointer border-0 rounded-full py-0',
    'px-[1.2rem] font-[750] [&:disabled]:[cursor:not-allowed] [&:disabled]:[opacity:0.4]',
  ].join(' '),
  dialogueEditorButtonPrimary: 'pomo-dialogue-editor__button--primary bg-[#d6b585] text-[#241a12]',
  dialogueEditorButtonSecondary: [
    'pomo-dialogue-editor__button--secondary [border:1px_solid_rgb(255_255_255_/_14%)]',
    'bg-transparent text-[#fffaf1]',
  ].join(' '),
  dialogueEditorEmpty: [
    'pomo-dialogue-editor__empty m-0 text-[#ddd2c6] text-[0.85rem] leading-[1.6] rounded-xl',
    'bg-[rgb(255_255_255_/_3%)] p-6 text-center',
  ].join(' '),
  dialogueEditorEyebrow: [
    'pomo-dialogue-editor__eyebrow m-[0_0_0.5rem] text-[#d6b585] text-xs font-[750]',
    'tracking-[0.16em] uppercase',
  ].join(' '),
  dialogueEditorField: [
    'pomo-dialogue-editor__field grid gap-2 text-[#eee4d9] text-[0.82rem] font-bold',
    '[&_small]:text-[#8e8276] [&_small]:font-[550] [&_select]:w-full [&_select]:box-border',
    '[&_select]:[border:1px_solid_rgb(255_255_255_/_12%)] [&_select]:rounded-xl',
    '[&_select]:bg-[#17130f] [&_select]:text-[#fffaf1] [&_select]:[font:inherit]',
    '[&_select]:font-[500] [&_select]:outline-none [&_textarea]:w-full [&_textarea]:box-border',
    '[&_textarea]:[border:1px_solid_rgb(255_255_255_/_12%)] [&_textarea]:rounded-xl',
    '[&_textarea]:bg-[#17130f] [&_textarea]:text-[#fffaf1] [&_textarea]:[font:inherit]',
    '[&_textarea]:font-[500] [&_textarea]:outline-none [&_select]:min-h-12 [&_select]:py-0',
    '[&_select]:px-[0.9rem] [&_textarea]:min-h-[12rem] [&_textarea]:[resize:vertical]',
    '[&_textarea]:p-[0.9rem] [&_textarea]:leading-[1.6]',
    '[&_select:focus-visible]:[outline:2px_solid_#d6b585]',
    '[&_select:focus-visible]:[outline-offset:2px]',
    '[&_textarea:focus-visible]:[outline:2px_solid_#d6b585]',
    '[&_textarea:focus-visible]:[outline-offset:2px]',
  ].join(' '),
  dialogueEditorFieldLabel: 'pomo-dialogue-editor__field-label flex justify-between gap-4',
  dialogueEditorFooter: [
    'pomo-dialogue-editor__footer w-[min(100%,_68rem)] [margin-inline:auto] flex justify-end',
    'gap-3 fixed right-[max(1rem,_var(--pomo-safe-area-inset-right))]',
    'bottom-[max(1rem,_var(--pomo-safe-area-inset-bottom))] left-[max(1rem,_var(--pomo-safe-area-inset-left))]',
    'w-auto items-center [border:1px_solid_rgb(255_255_255_/_12%)] rounded-2xl',
    'bg-[rgb(29_23_18_/_94%)] p-3 shadow-[0_1rem_4rem_rgb(0_0_0_/_35%)] [&_p]:m-[0_auto_0_0]',
    '[&_p]:text-[#a99d90] [&_p]:text-xs max-xl:[&_p]:hidden',
  ].join(' '),
  dialogueEditorHeader: [
    'pomo-dialogue-editor__header w-[min(100%,_68rem)] [margin-inline:auto] flex items-start',
    'justify-between gap-8 [padding-block:1rem_2rem] [&_h1]:m-0',
    '[&_h1]:text-[clamp(1.75rem,_4vw,_2.5rem)] [&_h1]:leading-[1.2]',
    '[&_p:not([data-pomo-dialogue-editor-eyebrow])]:max-w-[42rem]',
    '[&_p:not([data-pomo-dialogue-editor-eyebrow])]:m-[0.75rem_0_0]',
    '[&_p:not([data-pomo-dialogue-editor-eyebrow])]:text-[#c8baaa]',
    '[&_p:not([data-pomo-dialogue-editor-eyebrow])]:leading-[1.6] max-xl:grid',
    'max-xl:gap-4',
  ].join(' '),
  dialogueEditorLayout: [
    'pomo-dialogue-editor__layout w-[min(100%,_68rem)] [margin-inline:auto] grid',
    'grid-cols-[repeat(2,_minmax(0,_1fr))] gap-4 max-xl:grid-cols-[1fr]',
  ].join(' '),
  dialogueEditorMood: [
    'pomo-dialogue-editor__mood grid grid-cols-[2.75rem_minmax(0,_1fr)] items-center',
    'gap-[0.55rem] text-[#ddd2c6] [&_img]:w-11 [&_img]:h-11 [&_img]:object-contain',
    '[&_span]:text-[#d8caba] [&_span]:leading-[1.35] max-xl:[grid-column:2]',
  ].join(' '),
  dialogueEditorPanel: [
    'pomo-dialogue-editor__panel grid content-start gap-5',
    '[border:1px_solid_rgb(255_255_255_/_10%)] rounded-[1.25rem] bg-[rgb(38_31_25_/_88%)]',
    'p-[clamp(1.1rem,_3vw,_1.5rem)] shadow-[0_1.5rem_5rem_rgb(0_0_0_/_20%)]',
  ].join(' '),
  dialogueEditorPreview: [
    'pomo-dialogue-editor__preview grid gap-3 [&_>_div]:flex [&_>_div]:justify-between',
    '[&_>_div]:gap-4 [&_>_div]:text-[0.8rem] [&_span]:text-[#9f9387] [&_audio]:w-full',
  ].join(' '),
  dialogueEditorSectionHeading: [
    'pomo-dialogue-editor__section-heading flex items-start gap-3 [&_>_span]:grid [&_>_span]:w-8',
    '[&_>_span]:h-8 [&_>_span]:flex-none [&_>_span]:place-items-center [&_>_span]:rounded-full',
    '[&_>_span]:bg-[#d6b585] [&_>_span]:text-[#241a12] [&_>_span]:text-[0.8rem]',
    '[&_>_span]:font-extrabold [&_h2]:m-0 [&_h2]:text-[1.05rem] [&_p]:m-[0.3rem_0_0]',
    '[&_p]:text-[#ad9f90] [&_p]:text-[0.8rem] [&_p]:leading-[1.5]',
  ].join(' '),
  dialogueEditorSegmentButton: [
    'pomo-dialogue-editor__segment-button min-h-9 px-[0.9rem] text-xs whitespace-nowrap',
    'max-xl:[grid-column:2] max-xl:justify-self-end',
  ].join(' '),
  dialogueEditorSegments: [
    'pomo-dialogue-editor__segments grid gap-[0.6rem] m-0 p-0 list-none [&_li]:grid',
    '[&_li]:grid-cols-[3.5rem_minmax(0,_1fr)_10rem_auto] [&_li]:items-center [&_li]:gap-3',
    '[&_li]:rounded-xl [&_li]:bg-[rgb(255_255_255_/_4%)] [&_li]:p-3 [&_span]:text-[#d6b585]',
    '[&_span]:text-xs [&_span]:font-[750] [&_p]:m-0 [&_p]:text-[#ddd2c6] [&_p]:text-[0.85rem]',
    '[&_p]:leading-[1.6] max-xl:[&_li]:grid-cols-[3.5rem_minmax(0,_1fr)]',
  ].join(' '),
  dialogueEditorSelects: [
    'pomo-dialogue-editor__selects grid grid-cols-[repeat(3,_minmax(0,_1fr))] gap-3',
    'max-sm:grid-cols-[1fr]',
  ].join(' '),
  dialogueEditorStatus: [
    'pomo-dialogue-editor__status flex min-h-12 box-border items-center gap-[0.65rem] rounded-xl',
    'bg-[rgb(214_181_133_/_9%)] p-3 text-[#d8caba] text-[0.8rem] leading-[1.4] [&_strong]:ml-auto',
    '[&_strong]:text-[#e6c998]',
  ].join(' '),
  dialogueEditorTimelinePanel:
    'pomo-dialogue-editor__timeline-panel col-span-full max-xl:[grid-column:auto]',
  dialogueEditorVoiceActions: 'pomo-dialogue-editor__voice-actions flex justify-end gap-3',
} as const

const MAXIMUM_TEXT_LENGTH = 3000
const MILLISECONDS_PER_SECOND = 1000
const SECONDS_PER_MINUTE = 60

export interface PDialogueEditorProps {
  readonly dialogueId: string | null
}

const formatDuration = (durationMs: number) => {
  const totalSeconds = Math.round(durationMs / MILLISECONDS_PER_SECOND)
  const minutes = Math.floor(totalSeconds / SECONDS_PER_MINUTE)
  const seconds = totalSeconds % SECONDS_PER_MINUTE
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

// oxlint-disable-next-line eslint/max-lines-per-function -- The form follows one numbered authoring workflow and shares one controller.
export default function PDialogueEditor(props: PDialogueEditorProps) {
  const navigate = useNavigate()
  const events = usePEvents()
  const editorProps: UsePDialogueEditorProps = {dialogueId: () => props.dialogueId}
  const editor = usePDialogueEditor(editorProps)
  const isBusy = () => {
    const {status} = editor.state()
    return (
      status === 'generating' ||
      status === 'analyzing' ||
      status === 'loading' ||
      status === 'preparing' ||
      status === 'saving'
    )
  }
  const handleSave = async () => {
    const dialogueId = await editor.save()

    if (dialogueId !== null) {
      try {
        await events.refreshDialogues()
      } catch (error: unknown) {
        console.error('Failed to refresh saved focus room dialogues.', error)
      }

      navigate('/')
    }
  }
  const handleModelChange = (modelId: string) => {
    const model = SUPERTONIC_MODELS.find((item) => item.id === modelId)

    if (model !== undefined) {
      editor.setModelId(model.id)
    }
  }
  const handleLanguageChange = (language: string) => {
    const option = SUPERTONIC_LANGUAGE_OPTIONS.find((item) => item.value === language)

    if (option !== undefined) {
      editor.setLanguage(option.value)
    }
  }
  const handleVoiceChange = (voiceId: string) => {
    const voice = SUPERTONIC_VOICES.find((item) => item.id === voiceId)

    if (voice !== undefined) {
      editor.setVoiceId(voice.id)
    }
  }

  return (
    <main class={CLASSES.dialogueEditor}>
      <header class={CLASSES.dialogueEditorHeader}>
        <div>
          <p class={CLASSES.dialogueEditorEyebrow} data-pomo-dialogue-editor-eyebrow="">
            Pomo 대화
          </p>
          <h1>{props.dialogueId === null ? '새 대화 만들기' : '대화 편집하기'}</h1>
          <p>긴 대사는 음성에 맞게 나뉘며, 각 구간의 텍스트와 감정이 말풍선에 순서대로 표시돼요.</p>
        </div>
        <A class={CLASSES.dialogueEditorBack} href="/">
          <span aria-hidden="true" class="i-tabler-arrow-left size-5" />
          Pomo로
        </A>
      </header>

      <div class={CLASSES.dialogueEditorLayout}>
        <section aria-labelledby="dialogue-content-title" class={CLASSES.dialogueEditorPanel}>
          <div class={CLASSES.dialogueEditorSectionHeading}>
            <span>1</span>
            <div>
              <h2 id="dialogue-content-title">대화 내용</h2>
              <p>Pomo에서 캐릭터가 말할 문장을 입력하세요.</p>
            </div>
          </div>

          <label class={CLASSES.dialogueEditorField}>
            <span class={CLASSES.dialogueEditorFieldLabel}>
              대사
              <small>
                {editor.text().length} / {MAXIMUM_TEXT_LENGTH}
              </small>
            </span>
            <textarea
              disabled={isBusy()}
              maxlength={MAXIMUM_TEXT_LENGTH}
              onInput={(event) => editor.setText(event.currentTarget.value)}
              placeholder="Pomo를 시작할 때 캐릭터가 말할 내용을 입력하세요."
              value={editor.text()}
            />
          </label>
        </section>

        <section aria-labelledby="dialogue-voice-title" class={CLASSES.dialogueEditorPanel}>
          <div class={CLASSES.dialogueEditorSectionHeading}>
            <span>2</span>
            <div>
              <h2 id="dialogue-voice-title">목소리와 음성</h2>
              <p>대사를 음성으로 만드세요. 필요한 모델은 자동으로 준비돼요.</p>
            </div>
          </div>

          <div class={CLASSES.dialogueEditorSelects}>
            <label class={CLASSES.dialogueEditorField}>
              <span>언어</span>
              <select
                disabled={isBusy()}
                onChange={(event) => handleLanguageChange(event.currentTarget.value)}
                value={editor.language()}
              >
                <For each={SUPERTONIC_LANGUAGE_OPTIONS}>
                  {(language) => <option value={language.value}>{language.label}</option>}
                </For>
              </select>
            </label>
            <label class={CLASSES.dialogueEditorField}>
              <span>모델</span>
              <select
                disabled={isBusy()}
                onChange={(event) => handleModelChange(event.currentTarget.value)}
                value={editor.modelId()}
              >
                <For each={SUPERTONIC_MODELS}>
                  {(model) => <option value={model.id}>{model.label}</option>}
                </For>
              </select>
            </label>
            <label class={CLASSES.dialogueEditorField}>
              <span>목소리</span>
              <select
                disabled={isBusy()}
                onChange={(event) => handleVoiceChange(event.currentTarget.value)}
                value={editor.voiceId()}
              >
                <For each={SUPERTONIC_VOICES}>
                  {(voice) => <option value={voice.id}>{voice.label}</option>}
                </For>
              </select>
            </label>
          </div>

          <div aria-live="polite" class={CLASSES.dialogueEditorStatus} role="status">
            <span aria-hidden="true" class="i-tabler-wave-sine size-5" />
            <span>{editor.state().message}</span>
            <Show when={editor.state().status === 'preparing'}>
              <strong>{editor.progress()}%</strong>
            </Show>
          </div>

          <div class={CLASSES.dialogueEditorVoiceActions}>
            <button
              class={cx(CLASSES.dialogueEditorButton, CLASSES.dialogueEditorButtonPrimary)}
              disabled={!editor.canGenerate()}
              onClick={editor.generate}
              type="button"
            >
              음성 만들기
            </button>
          </div>

          <Show when={editor.audioUrl()}>
            {(audioUrl) => (
              <div class={CLASSES.dialogueEditorPreview}>
                <div>
                  <strong>전체 미리 듣기</strong>
                  <span>AI 생성 음성 · {formatDuration(editor.durationMs())}</span>
                </div>
                <audio
                  controls
                  controlslist="nodownload noplaybackrate"
                  preload="metadata"
                  src={audioUrl()}
                />
              </div>
            )}
          </Show>
        </section>

        <section
          aria-labelledby="dialogue-timeline-title"
          class={cx(
            CLASSES.dialogueEditorPanel,
            CLASSES.dialogueEditorTimelinePanel,
            editor.segments().length === 0 && 'pomo-dialogue-editor__timeline-panel--empty',
          )}
        >
          <div class={CLASSES.dialogueEditorSectionHeading}>
            <span>3</span>
            <div>
              <h2 id="dialogue-timeline-title">말풍선 타임라인</h2>
              <p>전체 음성을 새로 만든 현재 편집에서만 말풍선 음성을 다시 만들 수 있어요.</p>
            </div>
          </div>

          <Show
            when={editor.segments().length > 0}
            fallback={
              <p class={CLASSES.dialogueEditorEmpty}>
                음성을 만들면 구간별 텍스트와 시작 시간이 표시돼요.
              </p>
            }
          >
            <ol class={CLASSES.dialogueEditorSegments}>
              <For each={editor.segments()}>
                {(segment, position) => (
                  <li>
                    <span>{formatDuration(segment.startMs)}</span>
                    <p>{segment.text}</p>
                    <Show when={segment.mood}>
                      {(mood) => {
                        const definition = getPrimaryMood(mood().primary.id)

                        return (
                          <div class={CLASSES.dialogueEditorMood}>
                            <img
                              alt=""
                              aria-hidden="true"
                              src={getPrimaryMoodIcon(definition.id)}
                            />
                            <span>{definition.label}</span>
                          </div>
                        )
                      }}
                    </Show>
                    <button
                      aria-label={`${position() + 1}번 말풍선 음성 다시 만들기`}
                      class={cx(
                        CLASSES.dialogueEditorButton,
                        CLASSES.dialogueEditorButtonSecondary,
                        CLASSES.dialogueEditorSegmentButton,
                      )}
                      disabled={!editor.canRegenerateSegments()}
                      onClick={() => editor.regenerateSegment(position())}
                      title="전체 음성을 새로 만든 뒤 사용할 수 있어요."
                      type="button"
                    >
                      <Show
                        when={editor.regeneratingSegmentIndex() === position()}
                        fallback="다시 만들기"
                      >
                        만드는 중…
                      </Show>
                    </button>
                  </li>
                )}
              </For>
            </ol>
          </Show>
        </section>
      </div>

      <footer class={CLASSES.dialogueEditorFooter}>
        <p>음성을 다시 만들기 전까지 변경한 대사나 목소리는 저장할 수 없어요.</p>
        <button
          class={cx(CLASSES.dialogueEditorButton, CLASSES.dialogueEditorButtonPrimary)}
          disabled={!editor.canSave()}
          onClick={handleSave}
          type="button"
        >
          대화 저장
        </button>
      </footer>
    </main>
  )
}
