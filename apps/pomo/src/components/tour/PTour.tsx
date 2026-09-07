import {type TourEvent} from '@winter-love/solid-use/tour'
import {createUniqueId} from 'solid-js'
import {HTour} from './headless'
import {type PTourStep} from './step'
import {PTourBody} from './Body'

export interface PTourProps<Step extends PTourStep> {
  readonly getStepElement: (stepId: string) => Element | null
  readonly initialStepId?: string
  readonly isOpen: boolean
  readonly maskPadding?: number
  readonly onEvent?: (event: TourEvent<Step>) => void
  readonly onOpenChange?: (isOpen: boolean) => void
  readonly steps: ReadonlyArray<Step>
}

/** 헤드리스 투어 프리미티브를 Pomo의 안내 패널과 마스크로 구성합니다. */
export const PTour = <Step extends PTourStep>(props: PTourProps<Step>) => {
  const titleId = createUniqueId()

  return (
    <HTour.Root
      getStepElement={(stepId) => props.getStepElement(stepId)}
      initialStepId={props.initialStepId}
      isOpen={props.isOpen}
      onEvent={(event) => props.onEvent?.(event)}
      onOpenChange={(isOpen) => props.onOpenChange?.(isOpen)}
      steps={props.steps}
    >
      {(tour) => <PTourBody maskPadding={props.maskPadding} titleId={titleId} tour={tour} />}
    </HTour.Root>
  )
}

export type {PTourStep} from './step'
