import {scrollIntoViewIfNeeded} from '@winter-love/utils'
import {type Accessor, createMemo, createSignal} from 'solid-js'

/** 투어가 순서대로 활성화할 수 있는 최소 단계 데이터입니다. */
export interface TourStep {
  /** 투어 안에서 단계를 식별하는 고유 값입니다. */
  readonly id: string
  /** 활성화할 때 대상이 가려져 있으면 스크롤 가능한 범위 안에서 노출합니다. */
  readonly scrollIntoView?: boolean
}

/** 투어가 유효한 단계에서 시작됐을 때 발생합니다. */
export interface TourStartedEvent<Step extends TourStep> extends TourStepEvent<Step> {
  readonly type: 'started'
}

/** 이전 또는 다음 단계로 이동했을 때 발생합니다. */
export interface TourStepChangedEvent<Step extends TourStep> extends TourStepEvent<Step> {
  readonly previousStep: Step
  readonly type: 'step-changed'
}

/** 마지막 단계에서 다음 이동을 요청해 투어가 완료됐을 때 발생합니다. */
export interface TourCompletedEvent<Step extends TourStep> extends TourStepEvent<Step> {
  readonly type: 'completed'
}

/** 진행 중인 투어를 사용자가 닫았을 때 발생합니다. */
export interface TourDismissedEvent<Step extends TourStep> extends TourStepEvent<Step> {
  readonly type: 'dismissed'
}

/** 단계 이벤트가 발생한 시점의 단계와 DOM 요소입니다. */
export interface TourStepEvent<Step extends TourStep> {
  /** 이벤트의 단계에 대응하며, 해당 시점에 찾을 수 없으면 `null`입니다. */
  readonly activeElement: Element | null
  readonly step: Step
}

/** 투어 생명주기에서 발생하는 이벤트입니다. */
export type TourEvent<Step extends TourStep> =
  | TourCompletedEvent<Step>
  | TourDismissedEvent<Step>
  | TourStartedEvent<Step>
  | TourStepChangedEvent<Step>

/** `useTour`가 단계와 DOM 대상을 연결하는 데 필요한 설정입니다. */
export interface UseTourProps<Step extends TourStep> {
  /** 단계 ID에 대응하는 현재 DOM 요소를 반환하며, 아직 없으면 `null`을 반환합니다. */
  readonly getStepElement: (stepId: string) => Element | null
  /** 투어 시작, 단계 이동, 완료 및 닫기 이벤트를 받습니다. */
  readonly onEvent?: (event: TourEvent<Step>) => void
  /** 현재 사용할 순서가 보존된 단계 목록입니다. */
  readonly steps: Accessor<ReadonlyArray<Step>>
}

/** 투어 상태를 읽고 진행을 제어하는 headless 컨트롤러입니다. */
export interface TourController<Step extends TourStep> {
  /** 현재 단계의 DOM 요소를 읽을 때마다 다시 탐색합니다. */
  readonly activeElement: Accessor<Element | null>
  /** 현재 단계이며, 투어가 닫혔으면 `null`입니다. */
  readonly activeStep: Accessor<Step | null>
  /** 진행 중인 투어를 닫고 `dismissed` 이벤트를 발생시킵니다. */
  readonly dismiss: () => void
  /** 유효한 현재 단계가 있으면 `true`입니다. */
  readonly isOpen: Accessor<boolean>
  /** 다음 단계로 이동했을 때만 `true`이며, 마지막 단계에서는 완료 후 `false`입니다. */
  readonly next: () => boolean
  /** 이전 단계로 이동했을 때만 `true`입니다. */
  readonly previous: () => boolean
  /** 첫 단계 또는 지정한 단계에서 시작하며, 해당 단계가 있을 때만 `true`입니다. */
  readonly start: (stepId?: string) => boolean
  /** 최신 단계 목록의 전체 개수입니다. */
  readonly stepCount: Accessor<number>
  /** 현재 단계의 위치이며, 활성 단계가 없으면 `-1`입니다. */
  readonly stepIndex: Accessor<number>
}

/** UI를 렌더링하지 않고 반응형 투어 상태와 이동 명령을 만듭니다. */
export const useTour = <Step extends TourStep>(props: UseTourProps<Step>): TourController<Step> => {
  const [activeStepId, setActiveStepId] = createSignal<string | null>(null)
  const getOnEvent = () => props.onEvent
  const activeStep = (): Step | null => {
    const stepId = activeStepId()

    if (stepId === null) {
      return null
    }

    const step = props.steps().find((item) => item.id === stepId)

    if (step === undefined) {
      setActiveStepId(null)
      return null
    }

    return step
  }
  const stepIndex = createMemo(() => {
    const step = activeStep()

    if (step === null) {
      return -1
    }

    return props.steps().findIndex((item) => item.id === step.id)
  })
  const activateStep = (step: Step, includeActiveElement: boolean) => {
    setActiveStepId(step.id)

    if (step.scrollIntoView !== true && !includeActiveElement) {
      return null
    }

    const element = props.getStepElement(step.id)

    if (step.scrollIntoView === true && element !== null) {
      // 숨겨진 overflow는 사용자가 이동할 수 있는 스크롤 영역이 아니므로 건드리지 않습니다.
      scrollIntoViewIfNeeded(element, {skipOverflowHiddenElements: true})
    }

    return element
  }

  const start = (stepId?: string) => {
    const steps = props.steps()
    const step = stepId === undefined ? steps[0] : steps.find((item) => item.id === stepId)

    if (step === undefined) {
      return false
    }

    const onEvent = getOnEvent()
    const activeElement = activateStep(step, onEvent !== undefined)

    onEvent?.({activeElement, step, type: 'started'})

    return true
  }

  const previous = () => {
    const steps = props.steps()
    const currentStep = activeStep()

    if (currentStep === null) {
      return false
    }

    const currentIndex = steps.findIndex((step) => step.id === currentStep.id)
    const previousStep = steps[currentIndex - 1]

    if (previousStep === undefined) {
      return false
    }

    const onEvent = getOnEvent()
    const activeElement = activateStep(previousStep, onEvent !== undefined)

    onEvent?.({activeElement, previousStep: currentStep, step: previousStep, type: 'step-changed'})

    return true
  }

  const next = () => {
    const steps = props.steps()
    const currentStep = activeStep()

    if (currentStep === null) {
      return false
    }

    const currentIndex = steps.findIndex((step) => step.id === currentStep.id)
    const nextStep = steps[currentIndex + 1]

    if (nextStep === undefined) {
      const onEvent = getOnEvent()
      const activeElement = onEvent === undefined ? null : props.getStepElement(currentStep.id)

      setActiveStepId(null)
      onEvent?.({activeElement, step: currentStep, type: 'completed'})

      return false
    }

    const onEvent = getOnEvent()
    const activeElement = activateStep(nextStep, onEvent !== undefined)

    onEvent?.({activeElement, previousStep: currentStep, step: nextStep, type: 'step-changed'})

    return true
  }

  const dismiss = () => {
    const currentStep = activeStep()

    if (currentStep === null) {
      return
    }

    const onEvent = getOnEvent()
    const activeElement = onEvent === undefined ? null : props.getStepElement(currentStep.id)

    setActiveStepId(null)
    onEvent?.({activeElement, step: currentStep, type: 'dismissed'})
  }

  return {
    activeElement: () => {
      const step = activeStep()

      return step === null ? null : props.getStepElement(step.id)
    },
    activeStep,
    dismiss,
    isOpen: () => activeStep() !== null,
    next,
    previous,
    start,
    stepCount: () => props.steps().length,
    stepIndex,
  }
}
