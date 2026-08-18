import {cx} from 'class-variance-authority'
import {Show} from 'solid-js'

import {type DialogueWriterController, useDialogueWriter} from '../features/dialogue-writer'
import {getTextModel, type TextModelDefinition} from '../features/text-generation'

const MAXIMUM_REQUEST_LENGTH = 800
const INITIAL_REQUEST = '삶의 행복에 대해 이야기해줘'
const SECTION_CLASSES = cx(
  'relative w-full overflow-hidden rounded-8 border border-white/10',
  'bg-#211a2b/88 p-5 shadow-[0_28px_100px_rgba(5,2,10,0.45)] backdrop-blur-xl sm:p-8',
)
const TEXTAREA_CLASSES = cx(
  'min-h-44 w-full resize-y box-border rounded-5 border border-white/10 bg-#17131f p-4',
  'text-base leading-7 text-#f8edf1 outline-none transition',
  'placeholder:text-#655b6c focus:border-#9ed6bb/70',
)
const PRIMARY_BUTTON_CLASSES = cx(
  'h-13 rounded-full bg-#9ed6bb px-7 font-750 text-#14251d',
  'shadow-[0_10px_28px_rgba(158,214,187,0.2)] transition hover:bg-#b8e8d0',
  'disabled:cursor-not-allowed disabled:opacity-35',
)
const SECONDARY_BUTTON_CLASSES = cx(
  'h-10 rounded-full border border-white/12 bg-white/5 px-4 text-sm font-650 text-#d9cfdd',
  'transition hover:bg-white/9 disabled:cursor-not-allowed disabled:opacity-35',
)

const DirectAnswerHeader = () => (
  <header class="relative flex items-start justify-between gap-5">
    <div>
      <p class="m-0 text-xs font-700 tracking-[0.24em] text-#9ed6bb uppercase">
        Local direct answer lab
      </p>
      <h1 class="mb-0 mt-3 text-2xl font-750 tracking--0.02em sm:text-3xl">
        같은 요청으로 다섯 모델을 비교해 보세요
      </h1>
      <p class="mb-0 mt-3 max-w-2xl text-sm leading-6 text-#bdb2c4 sm:text-base">
        Qwen 3종과 Gemma 4 E2B의 q4·모바일 q2f16 결과를 나란히 확인할 수 있어요.
      </p>
    </div>
    <div class="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-#9ed6bb text-lg font-800 text-#14251d">
      Aa
    </div>
  </header>
)

interface ModelStatusProps {
  readonly model: TextModelDefinition
  readonly percentage: number
  readonly status:
    | 'complete'
    | 'error'
    | 'generating'
    | 'idle'
    | 'loading'
    | 'ready'
    | 'unsupported'
  readonly statusMessage: string
}

const ModelStatus = (props: ModelStatusProps) => (
  <div aria-live="polite" class="rounded-4 border border-white/8 bg-white/4 p-4">
    <div class="flex items-center justify-between gap-4">
      <div class="flex items-center gap-2.5 text-sm">
        <span
          class={cx(
            'h-2 w-2 rounded-full',
            props.status === 'ready' || props.status === 'complete'
              ? 'bg-#9ed6bb'
              : props.status === 'error' || props.status === 'unsupported'
                ? 'bg-#ff9aa8'
                : 'bg-#f2a7b8',
          )}
        />
        <span class="font-650 text-#eee5ef">{props.model.label} · WebGPU</span>
      </div>
      <span class="text-xs text-#9f93a7">
        {props.status === 'loading' ? `${props.percentage}%` : props.model.downloadSize}
      </span>
    </div>
    <Show when={props.status === 'loading'}>
      <div
        aria-label={`모델 준비 ${props.percentage}%`}
        aria-valuemax="100"
        aria-valuemin="0"
        aria-valuenow={props.percentage}
        class="mt-3 h-1.5 overflow-hidden rounded-full bg-white/8"
        role="progressbar"
      >
        <div
          class="h-full rounded-full bg-#9ed6bb transition-[width]"
          style={{width: `${props.percentage}%`}}
        />
      </div>
    </Show>
    <p
      class={cx(
        'mb-0 mt-2 text-xs leading-5',
        props.status === 'error' || props.status === 'unsupported'
          ? 'text-#ff9aa8'
          : 'text-#9f93a7',
      )}
    >
      {props.statusMessage}
    </p>
  </div>
)

interface DirectAnswerOutputProps {
  readonly canCopy: boolean
  readonly isGenerating: boolean
  readonly onCopy: () => void
  readonly output: string
  readonly title: string
  readonly titleId: string
}

const DirectAnswerOutput = (props: DirectAnswerOutputProps) => (
  <section aria-labelledby={props.titleId} class="grid gap-2.5">
    <div class="flex items-center justify-between gap-4">
      <h2 class="m-0 text-sm font-650 text-#eee5ef" id={props.titleId}>
        {props.title}
      </h2>
      <button
        class={SECONDARY_BUTTON_CLASSES}
        disabled={!props.canCopy}
        onClick={() => props.onCopy()}
        type="button"
      >
        복사하기
      </button>
    </div>
    <div
      aria-busy={props.isGenerating}
      class={cx(
        'min-h-52 whitespace-pre-wrap rounded-5 border p-5 text-[15px] leading-7',
        props.output.length > 0
          ? 'border-#9ed6bb/20 bg-#9ed6bb/6 text-#edf8f2'
          : 'border-white/8 bg-#17131f/70 text-#776c7f',
      )}
    >
      {props.output || '생성한 답변이 여기에 나타나요.'}
      <Show when={props.isGenerating}>
        <span aria-hidden="true" class="ml-1 inline-block h-4 w-0.5 animate-pulse bg-#9ed6bb" />
      </Show>
    </div>
  </section>
)

interface ModelPanelProps {
  readonly disabled: boolean
  readonly model: TextModelDefinition
  readonly onActivate: () => void
  readonly writer: DialogueWriterController
}

const activateModel = (
  writer: DialogueWriterController,
  otherWriters: ReadonlyArray<DialogueWriterController>,
) => {
  if (writer.isModelReady()) {
    writer.generate()
    return
  }

  for (const otherWriter of otherWriters) {
    otherWriter.release()
  }
  writer.prepare()
}

const ModelPanel = (props: ModelPanelProps) => {
  const canActivate = () =>
    !props.disabled &&
    (props.writer.isModelReady() ? props.writer.canGenerate() : props.writer.canPrepare())
  const buttonLabel = () => {
    const {status} = props.writer.state()

    switch (status) {
      case 'loading': {
        return '모델 준비 중…'
      }
      case 'generating': {
        return '답변 만드는 중…'
      }
      case 'complete':
      case 'ready': {
        return '이 모델로 답변 만들기'
      }
      case 'error': {
        return props.writer.isModelReady()
          ? '이 모델로 답변 만들기'
          : `${props.model.label} 준비하기`
      }
      case 'idle':
      case 'unsupported': {
        return `${props.model.label} 준비하기`
      }
    }

    status satisfies never
  }

  return (
    <article class="grid content-start gap-5 rounded-6 border border-white/8 bg-white/3 p-4 sm:p-5">
      <div>
        <ModelStatus
          model={props.model}
          percentage={props.writer.progress()}
          status={props.writer.state().status}
          statusMessage={props.writer.statusMessage()}
        />
        <p class="mb-0 mt-2 px-1 text-xs leading-5 text-#8f8297">{props.model.description}</p>
      </div>

      <DirectAnswerOutput
        canCopy={props.writer.canCopy()}
        isGenerating={props.writer.state().status === 'generating'}
        onCopy={props.writer.copyOutput}
        output={props.writer.output()}
        title={`${props.model.label} 결과`}
        titleId={`${props.model.id}-output-title`}
      />

      <button
        class={PRIMARY_BUTTON_CLASSES}
        disabled={!canActivate()}
        onClick={() => props.onActivate()}
        type="button"
      >
        {buttonLabel()}
      </button>
    </article>
  )
}

const DialogueWriter = () => {
  const compactModel = getTextModel('qwen-0.8b')
  const qualityModel = getTextModel('qwen-2b')
  const largerModel = getTextModel('qwen-4b')
  const gemmaModel = getTextModel('gemma-4-e2b')
  const mobileGemmaModel = getTextModel('gemma-4-e2b-mobile')
  const compactWriter = useDialogueWriter({
    initialRequest: INITIAL_REQUEST,
    modelId: compactModel.id,
  })
  const qualityWriter = useDialogueWriter({
    initialRequest: INITIAL_REQUEST,
    modelId: qualityModel.id,
  })
  const largerWriter = useDialogueWriter({
    initialRequest: INITIAL_REQUEST,
    modelId: largerModel.id,
  })
  const gemmaWriter = useDialogueWriter({
    initialRequest: INITIAL_REQUEST,
    modelId: gemmaModel.id,
  })
  const mobileGemmaWriter = useDialogueWriter({
    initialRequest: INITIAL_REQUEST,
    modelId: mobileGemmaModel.id,
  })
  const writers = [compactWriter, qualityWriter, largerWriter, gemmaWriter, mobileGemmaWriter]
  const isBusy = () => writers.some((writer) => writer.isBusy())

  const handleRequestInput = (event: InputEvent & {currentTarget: HTMLTextAreaElement}) => {
    compactWriter.setRequest(event.currentTarget.value)
    qualityWriter.setRequest(event.currentTarget.value)
    largerWriter.setRequest(event.currentTarget.value)
    gemmaWriter.setRequest(event.currentTarget.value)
    mobileGemmaWriter.setRequest(event.currentTarget.value)
  }

  return (
    <section class={SECTION_CLASSES}>
      <div class="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-#9ed6bb/10 blur-3xl" />
      <DirectAnswerHeader />

      <div class="relative mt-8 grid gap-6">
        <label class="grid gap-2.5">
          <span class="flex items-center justify-between gap-4 text-sm font-650 text-#eee5ef">
            무엇을 물어볼까요?
            <span class="text-xs font-500 text-#8f8297">
              {compactWriter.request().length} / {MAXIMUM_REQUEST_LENGTH}
            </span>
          </span>
          <textarea
            class={TEXTAREA_CLASSES}
            disabled={isBusy()}
            maxlength={MAXIMUM_REQUEST_LENGTH}
            onInput={handleRequestInput}
            placeholder="예: 삶의 행복에 대해 이야기해줘"
            value={compactWriter.request()}
          />
        </label>

        <div class="grid grid-cols-[repeat(auto-fit,_minmax(min(100%,_17rem),_1fr))] gap-4">
          <ModelPanel
            disabled={isBusy() && compactWriter.state().status !== 'loading'}
            model={compactModel}
            onActivate={() =>
              activateModel(compactWriter, [
                qualityWriter,
                largerWriter,
                gemmaWriter,
                mobileGemmaWriter,
              ])
            }
            writer={compactWriter}
          />
          <ModelPanel
            disabled={isBusy() && qualityWriter.state().status !== 'loading'}
            model={qualityModel}
            onActivate={() =>
              activateModel(qualityWriter, [
                compactWriter,
                largerWriter,
                gemmaWriter,
                mobileGemmaWriter,
              ])
            }
            writer={qualityWriter}
          />
          <ModelPanel
            disabled={isBusy() && largerWriter.state().status !== 'loading'}
            model={largerModel}
            onActivate={() =>
              activateModel(largerWriter, [
                compactWriter,
                qualityWriter,
                gemmaWriter,
                mobileGemmaWriter,
              ])
            }
            writer={largerWriter}
          />
          <ModelPanel
            disabled={isBusy() && gemmaWriter.state().status !== 'loading'}
            model={gemmaModel}
            onActivate={() =>
              activateModel(gemmaWriter, [
                compactWriter,
                qualityWriter,
                largerWriter,
                mobileGemmaWriter,
              ])
            }
            writer={gemmaWriter}
          />
          <ModelPanel
            disabled={isBusy() && mobileGemmaWriter.state().status !== 'loading'}
            model={mobileGemmaModel}
            onActivate={() =>
              activateModel(mobileGemmaWriter, [
                compactWriter,
                qualityWriter,
                largerWriter,
                gemmaWriter,
              ])
            }
            writer={mobileGemmaWriter}
          />
        </div>

        <p class="m-0 text-xs leading-5 text-#8f8297">
          입력과 결과는 서버로 보내지 않아요. 모델을 바꾸면 이전 실행 세션만 종료하고 완성된 결과는
          비교할 수 있도록 유지해요.
        </p>
      </div>
    </section>
  )
}

export default DialogueWriter
