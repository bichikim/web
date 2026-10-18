import {cx} from 'class-variance-authority'
import {Index, type JSX} from 'solid-js'
import {type AdminApiAiController, MAXIMUM_API_AI_ROUTES} from 'src/features/admin-api-ai'
import {PAdminApiAiRoute} from './PAdminApiAiRoute'
import {BUTTON_CLASSES} from './styles'

interface PAdminApiAiOrderProps {
  readonly model: AdminApiAiController
}

export const PAdminApiAiOrder = (props: PAdminApiAiOrderProps) => {
  const handleSubmit: JSX.EventHandler<HTMLFormElement, SubmitEvent> = async (event) => {
    event.preventDefault()
    await props.model.save()
  }
  return (
    <form class="grid gap-5" onSubmit={handleSubmit}>
      <fieldset
        class="m-0 min-w-0 grid gap-4 border-0 p-0"
        disabled={props.model.saving() || props.model.isLoading() || props.model.loadFailed()}
      >
        <legend class="mb-3 text-lg font-750">실행 순서 편집</legend>
        <Index each={props.model.routes()}>
          {(route, index) => <PAdminApiAiRoute index={index} model={props.model} route={route()} />}
        </Index>
        <button
          class={cx(BUTTON_CLASSES, 'justify-self-start')}
          disabled={
            props.model.routes().length >= MAXIMUM_API_AI_ROUTES ||
            (props.model.saved()?.providers.length ?? 0) === 0
          }
          type="button"
          onClick={() => props.model.addRoute()}
        >
          모델 추가
        </button>
        <p class="m-0 text-xs leading-5 text-white/60">
          모델은 최대 5개까지 지정할 수 있습니다. 모델 ID는 제공자별 등록 목록에서 선택해 주세요.
          순서를 바꾼 뒤 ‘순서 저장’을 누르면 서버에 적용됩니다.
        </p>
      </fieldset>
      <button
        class={cx(
          'min-h-11 justify-self-start rounded-2 bg-#e8bc88 px-5 py-3 text-sm font-750 text-#21180f',
          'focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-#e8bc88 disabled:opacity-45',
        )}
        disabled={props.model.saving() || props.model.isLoading() || props.model.loadFailed()}
        type="submit"
      >
        {props.model.saving() ? '저장 중…' : '순서 저장'}
      </button>
    </form>
  )
}
