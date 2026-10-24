import type {TourStep} from '@winter-love/solid-use/tour'
import type {Accessor} from 'solid-js'

export interface TourTargetBounds {
  readonly bottom: number
  readonly height: number
  readonly left: number
  readonly right: number
  readonly top: number
  readonly viewportHeight: number
  readonly viewportWidth: number
  readonly width: number
}

export interface HTourController<Step extends TourStep> {
  readonly activeElement: Accessor<Element | null>
  readonly activeStep: Accessor<Step | null>
  readonly dismiss: () => void
  readonly isFirstStep: Accessor<boolean>
  readonly isLastStep: Accessor<boolean>
  readonly isOpen: Accessor<boolean>
  readonly next: () => boolean
  readonly previous: () => boolean
  readonly stepCount: Accessor<number>
  readonly stepIndex: Accessor<number>
}
