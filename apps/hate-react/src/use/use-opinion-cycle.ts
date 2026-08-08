import {createMemo, createSignal} from 'solid-js'

const DEFAULT_MESSAGE =
  'React: Where every component is a function, every state is a hook, ' +
  'and every developer questions their life choices. ' +
  'Real opinions from real people about a JavaScript library which unfortunately is also real.'

/**
 * Get next index in circular fashion
 */
const nextIndex = (current: number, length: number): number => {
  return length <= 0 ? 0 : (current + 1) % length
}

/**
 * Get message at index, or default if empty
 */
const getMessageAt =
  (messages: string[], fallback: string) =>
  (index: number): string => {
    return messages.length > 0 ? (messages[index] ?? fallback) : fallback
  }

/**
 * Opinion cycle state and handlers
 */
export const useOpinionCycle = (messages: () => string[]) => {
  const [index, setIndex] = createSignal(0)

  const messagesList = createMemo(() => messages() ?? [])

  const currentMessage = createMemo(() => {
    const list = messagesList()
    const getMessage = getMessageAt(list, DEFAULT_MESSAGE)

    return getMessage(index())
  })

  const goToNext = () => {
    setIndex((currentIndex) => nextIndex(currentIndex, messagesList().length))
  }

  return {currentMessage, goToNext, messagesList}
}
