import type {SemanticBinding} from '@winter-love/wallpaper/settings/semantics'

interface SPoffoSemanticDescriptionProps {
  readonly value: SemanticBinding
  readonly label: string
  readonly onChange?: (value: SemanticBinding) => void | Promise<void>
}
export const SPoffoSemanticDescription = (props: SPoffoSemanticDescriptionProps) => {
  const handleText = (event: InputEvent & {currentTarget: HTMLTextAreaElement}) =>
    props.onChange?.({...props.value, text: event.currentTarget.value})
  const handleExclusions = (event: InputEvent & {currentTarget: HTMLTextAreaElement}) =>
    props.onChange?.({...props.value, excludeText: event.currentTarget.value || undefined})
  return (
    <>
      <textarea
        aria-label={`${props.label} 감정·행동·내용`}
        placeholder={'예: 정리해서 작성했어요.\n문서에 기록해 두었어요.'}
        value={props.value.text}
        maxLength={1000}
        rows={2}
        onInput={handleText}
        disabled={props.onChange === undefined}
        class="box-border w-full resize-y rounded-md border border-solid border-stone-300 bg-white
        px-2 py-1.5 font-inherit text-inherit"
      />
      <details class="text-xs text-stone-600">
        <summary class="cursor-pointer" title="이 예문이 더 가까우면 연결하지 않아요.">
          제외 예문
        </summary>
        <textarea
          aria-label={`${props.label} 제외 예문`}
          placeholder="예: 슬프지만 울지는 않았어요."
          value={props.value.excludeText ?? ''}
          maxLength={1000}
          rows={2}
          onInput={handleExclusions}
          disabled={props.onChange === undefined}
          class="mt-2 box-border w-full resize-y rounded-md border border-solid border-stone-300 bg-white
          px-2 py-1.5 font-inherit text-inherit"
        />
      </details>
    </>
  )
}
