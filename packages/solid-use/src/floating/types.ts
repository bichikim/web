import {FloatingElement, Middleware, MiddlewareData, Placement, ReferenceElement, Strategy} from '@floating-ui/dom'

export interface FloatingOptions<T extends ReferenceElement = ReferenceElement> {
  autoUpdate?: (reference: T, floating: FloatingElement, update: () => void) => () => void
  middleware?: Middleware[]
  open?: boolean
  placement?: Placement
  strategy?: Strategy
  transform?: boolean
}

export interface FloatingReturn {
  isPositioned: boolean
  middlewareData: MiddlewareData
  placement: Placement
  strategy: Strategy
  x: number
  y: number
}
