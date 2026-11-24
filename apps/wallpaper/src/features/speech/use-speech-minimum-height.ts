import {type Accessor, createMemo, type JSX} from 'solid-js'
import {useElementRect} from './use-element-rect'

const MINIMUM_BODY_HEIGHT = 64
const MINIMUM_QUESTION_HEIGHT = 40
const MINIMUM_CHOICES_HEIGHT = 104

interface UseSpeechMinimumHeightProps {
  readonly element: Accessor<HTMLElement | null>
  readonly content: Accessor<unknown>
}

interface SpeechMinimumStyle extends JSX.CSSProperties {
  readonly '--speech-body-minimum': string
  readonly '--speech-choices-minimum': string
  readonly '--speech-minimum-height': string
}

/** Fits short content and reserves readable body space alongside the measured header and controls. */
export const useSpeechMinimumHeight = (
  props: UseSpeechMinimumHeightProps,
): Accessor<SpeechMinimumStyle> => {
  const layout = createMemo(props.content)
  const bodyElement = () => {
    layout()
    return props.element()?.querySelector<HTMLElement>('[data-speech-body]') ?? null
  }
  const frame = useElementRect({element: props.element, layout})
  const body = useElementRect({element: bodyElement, layout})
  const bodyContent = useElementRect({
    element: () => bodyElement()?.firstElementChild ?? null,
    layout,
  })
  const choicesContent = useElementRect({
    element: () => {
      layout()
      return props.element()?.querySelector<HTMLElement>('[data-speech-choices] > div') ?? null
    },
    layout,
  })
  const bodyHeight = () =>
    Math.min(
      choicesContent() === null ? MINIMUM_BODY_HEIGHT : MINIMUM_QUESTION_HEIGHT,
      bodyContent()?.height ?? 0,
    )
  const controls = useElementRect({
    element: () => bodyElement()?.parentElement?.lastElementChild ?? null,
    layout,
  })
  const frameHeight = createMemo(() => {
    frame()
    body()
    controls()
    const element = props.element()
    const content = bodyElement()
    if (element === null || content === null) {
      return 0
    }
    const {top} = element.getBoundingClientRect()
    const extent = Math.max(
      ...Array.from(
        element.children,
        (child) =>
          child.getBoundingClientRect().bottom -
          top +
          Math.max(0, child.scrollHeight - child.clientHeight),
      ),
    )
    const style = getComputedStyle(element)
    const padding =
      Number.parseFloat(style.paddingBottom) + Number.parseFloat(style.borderBottomWidth)
    return Math.ceil(extent + padding - content.clientHeight + bodyHeight())
  })
  return createMemo(() => ({
    '--speech-body-minimum': `${bodyHeight()}px`,
    '--speech-choices-minimum': `${Math.min(MINIMUM_CHOICES_HEIGHT, choicesContent()?.height ?? 0)}px`,
    '--speech-minimum-height': `${frameHeight()}px`,
  }))
}
