import {PTour} from '../tour/PTour'
import type {useStudioTour} from './use-tour'

interface PStudioTourProps {
  readonly tour: ReturnType<typeof useStudioTour>
}

export const PStudioTour = (props: PStudioTourProps) => (
  <PTour
    getStepElement={props.tour.getStepElement}
    isOpen={props.tour.isOpen()}
    onOpenChange={props.tour.setIsOpen}
    steps={props.tour.steps()}
  />
)
