import type {JSX, ParentProps} from 'solid-js'

export interface HOpinionDisplayProps extends ParentProps {
  message: string
  onNext?: () => void
}

/**
 * Headless: Renders message and invokes onNext when triggered (e.g. by child click)
 */
export const HOpinionDisplay = (props: HOpinionDisplayProps): JSX.Element =>
  props.children as JSX.Element
