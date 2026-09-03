import {A, useNavigate} from '@solidjs/router'
import {cx} from 'class-variance-authority'
import {createSignal, For, onCleanup, Show} from 'solid-js'

import {usePSceneStyle} from '../../features/focus-room-animation'
import {
  usePDialogueEditor,
  type UsePDialogueEditorProps,
  usePEvents,
} from '../../features/focus-room-dialogue'
import {formatModelDownloadSize} from '../../features/model-storage'
import {useModelDownload} from '../../features/model-download'
import {
  getSupertonicModel,
  isSupertonicModelDownloaded,
  SUPERTONIC_LANGUAGE_OPTIONS,
  SUPERTONIC_MODELS,
  SUPERTONIC_VOICES,
} from '../../features/supertonic'
import {getPrimaryMood} from '../../features/text-mood'
import PDialogueDraftGenerator from './DraftGenerator'
import {PFaceIcon} from '../PFaceIcon'
import {PGenerationStatus} from '../PGenerationStatus'
import {PAudioPreview} from '../PAudioPreview'
import {PModelDownloadConsent} from '../PModelDownloadConsent'

const CLASSES = {
  dialogueEditor: cx(
    'pomo-dialogue-editor min-h-dvh box-border',
    '[background:var(--pomo-dialogue-editor-background)]',
    'pt-[max(1.25rem,_var(--pomo-safe-area-inset-top))]',
    'pr-[max(1.25rem,_var(--pomo-safe-area-inset-right))]',
    'pb-[max(1.25rem,_calc(1.25rem_+_var(--pomo-safe-area-inset-bottom)))]',
    'pl-[max(1.25rem,_var(--pomo-safe-area-inset-left))]',
    'text-foreground',
  ),
  dialogueEditorBack: cx(
    'pomo-dialogue-editor__back flex min-h-11 box-border flex-none items-center gap-2',
    'border border-solid border-border rounded-full py-0 px-4 text-foreground no-underline',
    'focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-highlight',
    'focus-visible:outline-offset-2',
    'max-xl:[justify-self:start]',
  ),
  dialogueEditorButton: cx(
    'pomo-dialogue-editor__button focus-visible:outline-2 focus-visible:outline-solid',
    'focus-visible:outline-highlight focus-visible:outline-offset-2 min-h-11 cursor-pointer border-0 rounded-full py-0',
    'px-[1.2rem] font-[750] [&:disabled]:[cursor:not-allowed] [&:disabled]:[opacity:0.4]',
  ),
  dialogueEditorButtonPrimary: 'pomo-dialogue-editor__button--primary bg-highlight text-background',
  dialogueEditorButtonSecondary: cx(
    'pomo-dialogue-editor__button--secondary border border-solid border-border',
    'bg-transparent text-foreground',
  ),
  dialogueEditorEmpty: cx(
    'pomo-dialogue-editor__empty m-0 text-muted-foreground text-[0.85rem] leading-[1.6] rounded-xl',
    'bg-content-surface p-6 text-center',
  ),
  dialogueEditorField: cx(
    'pomo-dialogue-editor__field grid gap-2 text-foreground text-[0.82rem] font-bold',
    '[&_small]:text-muted-foreground [&_small]:font-[550] [&_select]:w-full [&_select]:box-border',
    '[&_select]:border [&_select]:border-solid [&_select]:border-border [&_select]:rounded-xl',
    '[&_select]:bg-surface-strong [&_select]:text-foreground [&_select]:[font:inherit]',
    '[&_select]:font-[500] [&_select]:outline-none [&_textarea]:w-full [&_textarea]:box-border',
    '[&_textarea]:border [&_textarea]:border-solid [&_textarea]:border-border [&_textarea]:rounded-xl',
    '[&_textarea]:bg-surface-strong [&_textarea]:text-foreground [&_textarea]:[font:inherit]',
    '[&_textarea]:font-[500] [&_textarea]:outline-none [&_select]:min-h-12 [&_select]:py-0',
    '[&_select]:px-[0.9rem] [&_textarea]:min-h-[12rem] [&_textarea]:[resize:vertical]',
    '[&_textarea]:p-[0.9rem] [&_textarea]:leading-[1.6]',
    '[&_select:focus-visible]:outline-2 [&_select:focus-visible]:outline-solid',
    '[&_select:focus-visible]:outline-highlight',
    '[&_select:focus-visible]:[outline-offset:2px]',
    '[&_textarea:focus-visible]:outline-2 [&_textarea:focus-visible]:outline-solid',
    '[&_textarea:focus-visible]:outline-highlight',
    '[&_textarea:focus-visible]:[outline-offset:2px]',
  ),
  dialogueEditorFieldLabel: 'pomo-dialogue-editor__field-label flex justify-between gap-4',
  dialogueEditorFooter: cx(
    'pomo-dialogue-editor__footer w-[min(100%,_68rem)] [margin:1rem_auto_0] flex justify-end',
    'gap-3 items-center border border-solid border-border rounded-2xl',
    'bg-modal-surface p-3 shadow-panel backdrop-blur-surface [&_p]:m-[0_auto_0_0]',
    '[&_p]:text-muted-foreground [&_p]:text-xs max-xl:[&_p]:hidden',
  ),
  dialogueEditorHeader: cx(
    'pomo-dialogue-editor__header w-[min(100%,_68rem)] [margin-inline:auto] flex items-center',
    'justify-between gap-8 pb-4 [&_h1]:m-0',
    '[&_h1]:text-[clamp(1.75rem,_4vw,_2.5rem)] [&_h1]:leading-[1.2]',
    'max-xl:gap-4',
  ),
  dialogueEditorLayout: cx(
    'pomo-dialogue-editor__layout w-[min(100%,_68rem)] [margin-inline:auto] grid',
    'grid-cols-[repeat(2,_minmax(0,_1fr))] gap-4 max-xl:grid-cols-[1fr]',
  ),
  dialogueEditorMood: cx(
    'pomo-dialogue-editor__mood grid grid-cols-[2.75rem_minmax(0,_1fr)] items-center',
    'gap-[0.55rem] text-muted-foreground [&_img]:w-11 [&_img]:h-11 [&_img]:object-contain',
    '[&_span]:text-foreground [&_span]:leading-[1.35]',
  ),
  dialogueEditorPanel: cx(
    'pomo-dialogue-editor__panel grid content-start gap-5',
    'border border-solid border-border rounded-[1.25rem] bg-modal-surface',
    'p-[clamp(1.1rem,_3vw,_1.5rem)] shadow-panel backdrop-blur-surface',
  ),
  dialogueEditorPreview: cx(
    'pomo-dialogue-editor__preview grid gap-3 [&_>_div]:flex [&_>_div]:justify-between',
    '[&_>_div]:gap-4 [&_>_div]:text-[0.8rem] [&_span]:text-muted-foreground',
  ),
  dialogueEditorSectionHeading: cx(
    'pomo-dialogue-editor__section-heading flex items-start gap-3 [&_>_span]:grid [&_>_span]:w-8',
    '[&_>_span]:h-8 [&_>_span]:flex-none [&_>_span]:place-items-center [&_>_span]:rounded-full',
    '[&_>_span]:bg-highlight [&_>_span]:text-background [&_>_span]:text-[0.8rem]',
    '[&_>_span]:font-extrabold [&_h2]:m-0 [&_h2]:text-[1.05rem] [&_p]:m-[0.3rem_0_0]',
    '[&_p]:text-muted-foreground [&_p]:text-[0.8rem] [&_p]:leading-[1.5]',
  ),
  dialogueEditorSegmentButton: cx(
    'pomo-dialogue-editor__segment-button min-h-9 px-[0.9rem] text-xs whitespace-nowrap',
    'flex-none max-sm:ml-auto',
  ),
  dialogueEditorSegmentContent: cx(
    'pomo-dialogue-editor__segment-content grid min-w-0',
    'grid-cols-[minmax(0,_1fr)_auto] items-center gap-3 max-xl:grid-cols-[1fr]',
  ),
  dialogueEditorSegmentMeta: cx(
    'pomo-dialogue-editor__segment-meta flex min-w-0 items-center justify-between gap-3',
    'max-sm:flex-wrap',
  ),
  dialogueEditorSegments: cx(
    'pomo-dialogue-editor__segments grid gap-[0.6rem] m-0 p-0 list-none [&_li]:grid',
    '[&_li]:grid-cols-[3.5rem_minmax(0,_1fr)] [&_li]:items-center [&_li]:gap-3',
    '[&_li]:rounded-xl [&_li]:bg-content-surface [&_li]:p-3 [&_span]:text-highlight',
    '[&_span]:text-xs [&_span]:font-[750] [&_p]:m-0 [&_p]:text-foreground [&_p]:text-[0.85rem]',
    '[&_p]:leading-[1.6]',
  ),
  dialogueEditorSelects: cx(
    'pomo-dialogue-editor__selects grid grid-cols-[repeat(3,_minmax(0,_1fr))] gap-3',
    'max-sm:grid-cols-[1fr]',
  ),
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
  const sceneStyleController = usePSceneStyle()
  const editorProps: UsePDialogueEditorProps = {dialogueId: () => props.dialogueId}
  const editor = usePDialogueEditor(editorProps)
  const [draftGenerationBusy, setDraftGenerationBusy] = createSignal(false)
  const [audioDownloadConsentOpen, setAudioDownloadConsentOpen] = createSignal(false)
  const [audioDownloadError, setAudioDownloadError] = createSignal<string | null>(null)
  const [isCheckingAudioModel, setIsCheckingAudioModel] = createSignal(false)
  const modelDownload = useModelDownload()
  let isDisposed = false
  onCleanup(() => {
    isDisposed = true
  })
  const isAudioBusy = () => {
    const {status} = editor.state()
    return (
      status === 'generating' ||
      status === 'analyzing' ||
      status === 'loading' ||
      status === 'preparing' ||
      status === 'saving'
    )
  }
  const isModelDownloading = () => modelDownload.state().status === 'loading'
  const isAudioModelDownloading = () => {
    const downloadState = modelDownload.state()
    return (
      downloadState.status === 'loading' &&
      downloadState.target.kind === 'voice' &&
      downloadState.target.modelId === editor.modelId()
    )
  }
  const isBusy = () =>
    isAudioBusy() || draftGenerationBusy() || isCheckingAudioModel() || isModelDownloading()
  const audioProgress = () => {
    const downloadState = modelDownload.state()

    if (
      downloadState.status === 'loading' &&
      downloadState.target.kind === 'voice' &&
      downloadState.target.modelId === editor.modelId()
    ) {
      return downloadState.percentage
    }

    return editor.state().status === 'preparing' ? editor.progress() : null
  }
  const audioMessage = () => {
    const downloadError = audioDownloadError()

    if (downloadError !== null) {
      return downloadError
    }

    const downloadState = modelDownload.state()

    if (
      downloadState.status === 'loading' &&
      downloadState.target.kind === 'voice' &&
      downloadState.target.modelId === editor.modelId()
    ) {
      return '음성 모델 파일을 백그라운드에서 내려받고 있어요.'
    }

    return editor.state().message
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
  const handleAudioGenerate = async () => {
    if (isBusy() || !editor.canGenerate()) {
      return
    }

    const selectedModelId = editor.modelId()
    setAudioDownloadError(null)
    setIsCheckingAudioModel(true)
    const isDownloaded = await isSupertonicModelDownloaded({modelId: selectedModelId})

    if (isDisposed) {
      return
    }

    setIsCheckingAudioModel(false)

    if (isDownloaded) {
      await editor.generate()
      return
    }

    setAudioDownloadConsentOpen(true)
  }
  const handleConfirmAudioDownload = async () => {
    const selectedModelId = editor.modelId()
    setAudioDownloadConsentOpen(false)
    const result = await modelDownload.startVoiceModel(selectedModelId)

    if (isDisposed) {
      return
    }

    if (result.status === 'complete') {
      await editor.generate()
      return
    }

    if (result.status === 'error') {
      setAudioDownloadError(result.message)
    }
  }

  return (
    <main class={CLASSES.dialogueEditor}>
      <header class={CLASSES.dialogueEditorHeader}>
        <h1>{props.dialogueId === null ? '새 대화 만들기' : '대화 편집하기'}</h1>
        <A class={CLASSES.dialogueEditorBack} href="/">
          <span aria-hidden="true" class="i-tabler-arrow-left size-5" />
          Pomofi로
        </A>
      </header>

      <div class={CLASSES.dialogueEditorLayout}>
        <section aria-labelledby="dialogue-content-title" class={CLASSES.dialogueEditorPanel}>
          <div class={CLASSES.dialogueEditorSectionHeading}>
            <span>1</span>
            <div>
              <h2 id="dialogue-content-title">대사 입력</h2>
            </div>
          </div>

          <PDialogueDraftGenerator
            disabled={isAudioBusy()}
            onBusyChange={setDraftGenerationBusy}
            onGenerated={editor.setText}
          />

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
              placeholder="원하는 대사를 입력하세요"
              value={editor.text()}
            />
          </label>
        </section>

        <section aria-labelledby="dialogue-voice-title" class={CLASSES.dialogueEditorPanel}>
          <div class={CLASSES.dialogueEditorSectionHeading}>
            <span>2</span>
            <div>
              <h2 id="dialogue-voice-title">목소리 선택과 음성 만들기</h2>
              <p>
                AI 생성 음성을 타인 사칭이나 괴롭힘 등에 악용할 수 없으며, 공개할 때는 AI 생성
                음성임을 밝혀야 해요.
              </p>
            </div>
          </div>

          <div class={CLASSES.dialogueEditorSelects}>
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
          </div>

          <PGenerationStatus
            kind="voice"
            message={audioMessage()}
            onCancel={isAudioModelDownloading() ? modelDownload.cancel : undefined}
            progress={audioProgress()}
            progressLabel="음성 모델 준비 진행률"
          />

          <div class={CLASSES.dialogueEditorVoiceActions}>
            <button
              class={cx(CLASSES.dialogueEditorButton, CLASSES.dialogueEditorButtonPrimary)}
              disabled={isBusy() || !editor.canGenerate()}
              onClick={handleAudioGenerate}
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
                <PAudioPreview src={audioUrl()} title="전체 미리 듣기" />
              </div>
            )}
          </Show>
          <PModelDownloadConsent
            actionLabel="음성 만들기"
            downloadSize={formatModelDownloadSize(getSupertonicModel(editor.modelId()).size)}
            isOpen={audioDownloadConsentOpen()}
            onCancel={() => setAudioDownloadConsentOpen(false)}
            onConfirm={handleConfirmAudioDownload}
          />
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
              <h2 id="dialogue-timeline-title">말풍선 확인</h2>
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
                    <div class={CLASSES.dialogueEditorSegmentContent}>
                      <p>{segment.text}</p>
                      <div class={CLASSES.dialogueEditorSegmentMeta}>
                        <Show when={segment.mood}>
                          {(mood) => {
                            const definition = getPrimaryMood(mood().primary.id)

                            return (
                              <div class={CLASSES.dialogueEditorMood}>
                                <PFaceIcon
                                  alt=""
                                  mood={definition.id}
                                  sceneStyle={sceneStyleController.sceneStyle()}
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
                          disabled={isBusy() || !editor.canRegenerateSegments()}
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
                      </div>
                    </div>
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
          disabled={isBusy() || !editor.canSave()}
          onClick={handleSave}
          type="button"
        >
          대화 저장
        </button>
      </footer>
    </main>
  )
}
