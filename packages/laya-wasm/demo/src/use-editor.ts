import {createMemo, createSignal} from 'solid-js'
import type {Question} from '../../src/types'
import {createQuestion} from './create-question'
import type {Prompt} from './types'

export const useEditor = () => {
  const [type, setType] = createSignal<Question['type']>('choice')
  const [instructions, updateInstructions] = createSignal('Should this request be accepted?')
  const [state, updateState] = createSignal('Please let me change the name on my account.')
  const [choices, updateChoices] = createSignal('accept\nreject')
  const labels = createMemo(() =>
    type() === 'noul'
      ? ['false', 'true']
      : choices()
          .split('\n')
          .map((line) => line.trim())
          .filter(Boolean),
  )
  const prompt = (): Prompt => {
    if (state().trim().length === 0) {
      throw new TypeError('분류할 문장을 입력하세요.')
    }
    return {question: createQuestion(type(), instructions(), choices()), state: state()}
  }
  const changeType = (value: string): void => {
    switch (value) {
      case 'choice':
      case 'score':
      case 'noul':
        setType(value)
        return
      default:
        throw new TypeError('알 수 없는 질문 유형입니다.')
    }
  }
  return {
    changeType,
    choices,
    instructions,
    labels,
    prompt,
    state,
    type,
    updateChoices,
    updateInstructions,
    updateState,
  }
}
export type Editor = ReturnType<typeof useEditor>
