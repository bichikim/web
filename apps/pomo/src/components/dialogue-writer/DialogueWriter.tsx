import {PTextarea} from 'src/components/p-textarea/PTextarea'
import {cx} from 'class-variance-authority'

import {type DialogueWriterController, useDialogueWriter} from '../../features/dialogue-writer'
import {getTextModel} from '../../features/text-generation'
import {DirectAnswerHeader} from './AnswerHeader'
import {ModelPanel} from './ModelPanel'

const MAXIMUM_REQUEST_LENGTH = 800
const INITIAL_REQUEST = '삶의 행복에 대해 이야기해줘'
const SECTION_CLASSES = cx(
  'relative w-full overflow-hidden rounded-8 border border-white/10',
  'bg-#211a2b/88 p-5 shadow-[0_1.75rem_6.25rem_rgba(5,2,10,0.45)] backdrop-blur-xl xs:p-8',
)
const TEXTAREA_CLASSES = cx(
  'min-h-44 w-full resize-y box-border rounded-5 border border-white/10 bg-#17131f p-4',
  'text-base leading-7 text-#f8edf1 outline-none transition',
  'placeholder:text-#655b6c focus:border-#9ed6bb/70',
)

const activateModel = (
  writer: DialogueWriterController,
  writers: ReadonlyArray<DialogueWriterController>,
) => {
  if (writer.isModelReady()) {
    writer.generate()
    return
  }

  for (const otherWriter of writers.filter((candidate) => candidate !== writer)) {
    otherWriter.release()
  }
  writer.prepare()
}

export const DialogueWriter = () => {
  const models = [
    getTextModel('qwen-0.8b'),
    getTextModel('qwen-2b'),
    getTextModel('qwen-4b'),
    getTextModel('gemma-4-e2b'),
    getTextModel('gemma-4-e2b-mobile'),
  ]
  const modelWriters = models.map((model) => {
    const writer = useDialogueWriter({initialRequest: INITIAL_REQUEST, modelId: model.id})
    return {model, writer}
  })
  const writers = modelWriters.map(({writer}) => writer)
  const firstWriter = writers[0]
  const isBusy = () => writers.some((writer) => writer.isBusy())

  const handleRequestInput = (event: InputEvent & {currentTarget: HTMLTextAreaElement}) => {
    for (const writer of writers) {
      writer.setRequest(event.currentTarget.value)
    }
  }
  const modelPanels = modelWriters.map((modelWriter) => (
    <ModelPanel
      disabled={isBusy() && modelWriter.writer.state().status !== 'loading'}
      model={modelWriter.model}
      onActivate={() => activateModel(modelWriter.writer, writers)}
      writer={modelWriter.writer}
    />
  ))

  return (
    <section class={SECTION_CLASSES}>
      <div class="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-#9ed6bb/10 blur-3xl" />
      <DirectAnswerHeader />

      <div class="relative mt-8 grid gap-6">
        <label class="grid gap-2.5">
          <span class="flex items-center justify-between gap-4 text-sm font-650 text-#eee5ef">
            무엇을 물어볼까요?
            <span class="text-xs font-500 text-#8f8297">
              {firstWriter.request().length} / {MAXIMUM_REQUEST_LENGTH}
            </span>
          </span>
          <PTextarea
            unstyled
            class={TEXTAREA_CLASSES}
            disabled={isBusy()}
            maxlength={MAXIMUM_REQUEST_LENGTH}
            onInput={handleRequestInput}
            placeholder="예: 삶의 행복에 대해 이야기해줘"
            value={firstWriter.request()}
          />
        </label>

        <div class="grid grid-cols-[repeat(auto-fit,_minmax(min(100%,_17rem),_1fr))] gap-4">
          {modelPanels}
        </div>

        <p class="m-0 text-xs leading-5 text-#8f8297">
          입력과 결과는 서버로 보내지 않아요. 모델을 바꾸면 이전 실행 세션만 종료하고 완성된 결과는
          비교할 수 있도록 유지해요.
        </p>
      </div>
    </section>
  )
}
