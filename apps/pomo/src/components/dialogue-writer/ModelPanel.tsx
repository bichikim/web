import {cx} from 'class-variance-authority'
import {type DialogueWriterController} from '../../features/dialogue-writer/index'
import {type TextModelDefinition} from '../../features/text-generation/index'
import {DirectAnswerOutput} from './AnswerOutput'
import {ModelStatus} from './ModelStatus'

const PRIMARY_BUTTON_CLASSES = cx(
  'h-13 rounded-full bg-#9ed6bb px-7 font-750 text-#14251d',
  'shadow-[0_0.625rem_1.75rem_rgba(158,214,187,0.2)] transition hover:bg-#b8e8d0',
  'disabled:cursor-not-allowed disabled:opacity-35',
)

interface ModelPanelProps {
  readonly disabled: boolean
  readonly model: TextModelDefinition
  readonly onActivate: () => void
  readonly writer: DialogueWriterController
}

export const ModelPanel = (props: ModelPanelProps) => {
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
    <article class="grid content-start gap-5 rounded-6 border border-white/8 bg-white/3 p-4 xs:p-5">
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
