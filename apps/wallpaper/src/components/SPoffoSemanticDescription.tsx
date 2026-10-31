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
  const handleGroup = (event: InputEvent & {currentTarget: HTMLInputElement}) =>
    props.onChange?.({
      ...props.value,
      exclusiveGroup: event.currentTarget.value.trim() || undefined,
    })
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
      <input
        aria-label={`${props.label} 선택 그룹`}
        placeholder="선택 그룹 (선택)"
        title="같은 그룹에서는 가장 잘 맞는 문장 하나만 적용해요. 같은 문장에 연결한 파라미터는 함께 적용해요."
        value={props.value.exclusiveGroup ?? ''}
        maxLength={128}
        onInput={handleGroup}
        disabled={props.onChange === undefined}
        class="box-border w-full rounded-md border border-solid border-stone-300 bg-white
        px-2 py-1.5 font-inherit text-inherit"
      />
    </>
  )
}
