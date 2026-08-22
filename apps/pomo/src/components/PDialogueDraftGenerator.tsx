import {cx} from 'class-variance-authority'
import {
  type Accessor,
  createEffect,
  createMemo,
  createSignal,
  onCleanup,
  Show,
  untrack,
} from 'solid-js'

import {type DialogueWriterController, useDialogueWriter} from '../features/dialogue-writer'
import {
  calculateDialogueScriptProgress,
  createDialogueScriptRequest,
  DEFAULT_DIALOGUE_SCRIPT_LENGTH,
  MAXIMUM_DIALOGUE_SCRIPT_LENGTH,
  MINIMUM_DIALOGUE_SCRIPT_LENGTH,
} from '../features/focus-room-dialogue'
import {getTextModel, isTextModelDownloaded} from '../features/text-generation'
import {PGenerationStatus} from './PGenerationStatus'
import {PModelDownloadConsent} from './PModelDownloadConsent'

const DEFAULT_TOPIC = '오늘 힘이 나는 말 한마디'
const GEMMA_MODEL_ID = 'gemma-4-e2b'
const GEMMA_MODEL = getTextModel(GEMMA_MODEL_ID)
const MAXIMUM_PROGRESS = 100
const GENERATED_CONTENT_PROGRESS = 96
const FINAL_GENERATING_PROGRESS = 99
const FINISHING_PROGRESS_INTERVAL_MS = 700
const FINISHING_PROGRESS_STEPS = [
  GENERATED_CONTENT_PROGRESS + 1,
  GENERATED_CONTENT_PROGRESS + 2,
  FINAL_GENERATING_PROGRESS,
] as const
const BUTTON_CLASSES = cx(
  'min-h-11 cursor-pointer border-0 rounded-full bg-[#d6b585] py-0 px-[1.2rem]',
  'font-[750] text-[#241a12] [&:disabled]:[cursor:not-allowed] [&:disabled]:[opacity:0.4]',
  '[&:focus-visible]:[outline:2px_solid_#d6b585] [&:focus-visible]:[outline-offset:2px]',
)
const FIELD_CLASSES = cx(
  'grid gap-2 text-[#eee4d9] text-[0.82rem] font-bold',
  '[&_input[type=text]]:min-h-12 [&_input[type=text]]:w-full [&_input[type=text]]:box-border',
  '[&_input[type=text]]:[border:1px_solid_rgb(255_255_255_/_12%)]',
  '[&_input[type=text]]:rounded-xl [&_input[type=text]]:bg-[#17130f]',
  '[&_input[type=text]]:px-[0.9rem] [&_input[type=text]]:text-[#fffaf1]',
  '[&_input[type=text]]:[font:inherit] [&_input[type=text]]:font-[500]',
  '[&_input[type=text]]:outline-none',
  '[&_input[type=text]:focus-visible]:[outline:2px_solid_#d6b585]',
  '[&_input[type=text]:focus-visible]:[outline-offset:2px]',
)
const ACTION_CLASSES = 'flex justify-end gap-3'

export interface PDialogueDraftGeneratorProps {
  readonly disabled?: boolean
  readonly onBusyChange?: (busy: boolean) => void
  readonly onGenerated: (text: string) => void
}

interface UseDialogueGenerationStatusProps {
  readonly isCheckingModel: Accessor<boolean>
  readonly length: Accessor<number>
  readonly writer: DialogueWriterController
}

interface DialogueGenerationStatus {
  readonly message: string
  readonly progress: number | null
}

const useDialogueGenerationStatus = (props: UseDialogueGenerationStatusProps) => {
  const calculatedProgress = createMemo(() => {
    const currentState = props.writer.state()

    switch (currentState.status) {
      case 'complete':
        return calculateDialogueScriptProgress({
          completed: true,
          generatedLength: props.writer.output().length,
          targetLength: props.length(),
        })
      case 'generating':
        return calculateDialogueScriptProgress({
          completed: false,
          generatedLength: props.writer.output().length,
          targetLength: props.length(),
        })
      case 'error':
      case 'idle':
      case 'loading':
      case 'ready':
      case 'unsupported':
        return null
    }

    currentState satisfies never
  })
  const [progress, setProgress] = createSignal<number | null>(null)

  createEffect(() => {
    const nextProgress = calculatedProgress()
    setProgress(nextProgress)

    if (nextProgress !== GENERATED_CONTENT_PROGRESS) {
      return
    }

    const timers = FINISHING_PROGRESS_STEPS.map((step, index) =>
      setTimeout(() => setProgress(step), FINISHING_PROGRESS_INTERVAL_MS * (index + 1)),
    )
    onCleanup(() => timers.forEach(clearTimeout))
  })

  const status = createMemo((): DialogueGenerationStatus => {
    if (props.isCheckingModel()) {
      return {message: '저장된 대사 모델을 확인하고 있어요.', progress: null}
    }

    const currentState = props.writer.state()
    const currentProgress = progress()

    switch (currentState.status) {
      case 'complete':
        return {message: '완성된 초안을 대사 입력창에 반영했어요.', progress: currentProgress}
      case 'error':
        return {message: currentState.message, progress: null}
      case 'generating':
        if (currentProgress === FINAL_GENERATING_PROGRESS) {
          return {
            message: '완성된 초안을 대사 입력창에 반영하고 있어요.',
            progress: currentProgress,
          }
        }

        if (currentProgress !== null && currentProgress > GENERATED_CONTENT_PROGRESS) {
          return {message: '문장을 자연스럽게 마무리하고 있어요.', progress: currentProgress}
        }

        return {message: '대사 초안을 작성하고 있어요.', progress: currentProgress}
      case 'idle':
        return {message: '주제와 분량을 정한 뒤 대사 만들기를 눌러 주세요.', progress: null}
      case 'loading':
        return {
          message:
            currentState.percentage === MAXIMUM_PROGRESS
              ? '받은 대사 모델을 실행할 준비를 하고 있어요.'
              : '대사 모델 파일을 내려받고 있어요.',
          progress: currentState.percentage,
        }
      case 'ready':
        return {message: '대사 모델이 준비됐어요.', progress: null}
      case 'unsupported':
        return {message: props.writer.statusMessage(), progress: null}
    }

    currentState satisfies never
  })

  return status
}

export default function PDialogueDraftGenerator(props: PDialogueDraftGeneratorProps) {
  const [topic, setTopic] = createSignal(DEFAULT_TOPIC)
  const [length, setLength] = createSignal(DEFAULT_DIALOGUE_SCRIPT_LENGTH)
  const [isExpanded, setIsExpanded] = createSignal(false)
  const [downloadConsentOpen, setDownloadConsentOpen] = createSignal(false)
  const [isCheckingModel, setIsCheckingModel] = createSignal(false)
  const writer = useDialogueWriter({
    modelId: GEMMA_MODEL.id,
    onComplete: (text) => props.onGenerated(text),
  })
  let isDisposed = false
  onCleanup(() => {
    isDisposed = true
  })
  const generationStatus = useDialogueGenerationStatus({isCheckingModel, length, writer})
  createEffect(() => {
    const busy = writer.isBusy() || isCheckingModel()
    untrack(() => props.onBusyChange?.(busy))
  })
  const canGenerate = () =>
    !props.disabled &&
    !writer.isBusy() &&
    !isCheckingModel() &&
    topic().trim().length > 0 &&
    writer.state().status !== 'unsupported'
  const handleGenerate = async () => {
    writer.setRequest(createDialogueScriptRequest({length: length(), topic: topic()}))

    if (writer.isModelReady()) {
      writer.generateWithPreparation()
      return
    }

    setIsCheckingModel(true)
    const isDownloaded = await isTextModelDownloaded({modelId: GEMMA_MODEL_ID})

    if (isDisposed) {
      return
    }

    setIsCheckingModel(false)

    if (isDownloaded) {
      writer.generateWithPreparation()
      return
    }

    setDownloadConsentOpen(true)
  }
  const handleConfirmDownload = () => {
    setDownloadConsentOpen(false)
    writer.generateWithPreparation()
  }

  return (
    <section aria-labelledby="dialogue-draft-title" class="rounded-xl bg-white/4">
      <button
        aria-controls="dialogue-draft-content"
        aria-expanded={isExpanded()}
        class={cx(
          'flex min-h-16 w-full cursor-pointer items-center gap-3 border-0 rounded-xl',
          'bg-transparent px-4 py-3 text-left text-[#fffaf1] outline-none',
          'hover:bg-white/4 focus-visible:outline-2 focus-visible:outline-highlight',
          'focus-visible:outline-offset-2',
        )}
        onClick={() => setIsExpanded((expanded) => !expanded)}
        type="button"
      >
        <span class="grid min-w-0 flex-1 gap-1">
          <span class="text-[0.95rem] font-[750]" id="dialogue-draft-title">
            초안 만들기
          </span>
          <span class="text-[#ad9f90] text-xs leading-[1.5]">AI 도움 · 선택 기능</span>
        </span>
        <span
          aria-hidden="true"
          class="i-tabler-chevron-down size-5 flex-none text-highlight transition-transform"
          classList={{'rotate-180': isExpanded()}}
        />
      </button>

      <div hidden={!isExpanded()} id="dialogue-draft-content">
        <div class="grid gap-4 px-4 pb-4">
          <p class="m-0 text-[#ad9f90] text-xs leading-[1.5]">
            주제와 분량을 정하면 기기 안에서 대사 초안을 작성해요.
          </p>
          <label class={FIELD_CLASSES}>
            <span>어떤 말을 만들까요?</span>
            <input
              disabled={props.disabled || writer.isBusy() || isCheckingModel()}
              maxlength="200"
              onInput={(event) => setTopic(event.currentTarget.value)}
              placeholder="예: 오늘 힘이 나는 말 한마디"
              type="text"
              value={topic()}
            />
          </label>

          <label class="grid gap-2 text-[#eee4d9] text-[0.82rem] font-bold">
            <span class="flex justify-between gap-4">
              생성 분량
              <strong class="text-[#e6c998]">{length()}자</strong>
            </span>
            <input
              aria-label="생성 분량"
              aria-valuetext={`${length()}자`}
              class="w-full accent-highlight"
              disabled={props.disabled || writer.isBusy() || isCheckingModel()}
              max={MAXIMUM_DIALOGUE_SCRIPT_LENGTH}
              min={MINIMUM_DIALOGUE_SCRIPT_LENGTH}
              onInput={(event) => setLength(event.currentTarget.valueAsNumber)}
              step="1"
              type="range"
              value={length()}
            />
            <span class="flex justify-between text-[#ad9f90] text-[0.72rem] font-[550]">
              <span>{MINIMUM_DIALOGUE_SCRIPT_LENGTH}자</span>
              <span>{MAXIMUM_DIALOGUE_SCRIPT_LENGTH}자</span>
            </span>
          </label>

          <PGenerationStatus
            kind="draft"
            message={generationStatus().message}
            progress={generationStatus().progress}
            progressLabel="대사 생성 진행률"
          />
          <div class={ACTION_CLASSES}>
            <button
              class={BUTTON_CLASSES}
              disabled={!canGenerate()}
              onClick={handleGenerate}
              type="button"
            >
              대사 만들기
            </button>
          </div>
        </div>
      </div>
      <PModelDownloadConsent
        actionLabel="대사 만들기"
        downloadSize={GEMMA_MODEL.downloadSize}
        isOpen={downloadConsentOpen()}
        onCancel={() => setDownloadConsentOpen(false)}
        onConfirm={handleConfirmDownload}
      />
    </section>
  )
}
