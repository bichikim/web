import {Dialog} from '@kobalte/core/dialog'
import {type TourEvent, type TourStep, useTour} from '@winter-love/solid-use/tour'
import {createEffect, type JSX, on, Show} from 'solid-js'

import type {HTourController} from './types'

export interface HTourRootProps<Step extends TourStep> {
  readonly children: (tour: HTourController<Step>) => JSX.Element
  readonly getStepElement: (stepId: string) => Element | null
  readonly initialStepId?: string
  readonly isOpen: boolean
  readonly modal?: boolean
  readonly onEvent?: (event: TourEvent<Step>) => void
  readonly onOpenChange?: (isOpen: boolean) => void
  readonly steps: ReadonlyArray<Step>
}

/** UI 표현과 독립적으로 투어 상태, 이동 및 모달 생명주기를 제공합니다. */
export const HTourRoot = <Step extends TourStep>(props: HTourRootProps<Step>) => {
  const tour = useTour<Step>({
    getStepElement: (stepId) => props.getStepElement(stepId),
    onEvent: (event) => props.onEvent?.(event),
    steps: () => props.steps,
  })

  const dismiss = () => {
    if (!tour.isOpen()) {
      return
    }

    tour.dismiss()
    props.onOpenChange?.(false)
  }
  const next = () => {
    const moved = tour.next()

    if (!moved && !tour.isOpen()) {
      props.onOpenChange?.(false)
    }

    return moved
  }
  const controller: HTourController<Step> = {
    activeElement: tour.activeElement,
    activeStep: tour.activeStep,
    dismiss,
    isFirstStep: () => tour.stepIndex() <= 0,
    isLastStep: () => {
      const stepIndex = tour.stepIndex()

      return stepIndex >= 0 && stepIndex === tour.stepCount() - 1
    },
    isOpen: tour.isOpen,
    next,
    previous: tour.previous,
    stepCount: tour.stepCount,
    stepIndex: tour.stepIndex,
  }

  createEffect(
    on(
      () => props.isOpen,
      (requestedOpen) => {
        if (!requestedOpen) {
          tour.dismiss()
          return
        }

        if (!tour.start(props.initialStepId)) {
          props.onOpenChange?.(false)
        }
      },
    ),
  )
  createEffect(
    on(
      () => props.steps,
      () => {
        if (props.isOpen && !tour.isOpen()) {
          props.onOpenChange?.(false)
        }
      },
      {defer: true},
    ),
  )

  return (
    <Dialog
      modal={props.modal ?? true}
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          dismiss()
        }
      }}
      open={tour.isOpen()}
    >
      <Show when={tour.activeStep()}>{props.children(controller)}</Show>
    </Dialog>
  )
}
