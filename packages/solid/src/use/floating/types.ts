import {
  FloatingElement,
  Middleware,
  MiddlewareData,
  Placement,
  ReferenceElement,
  Strategy,
} from '@floating-ui/dom'

export interface FloatingOptions<T extends ReferenceElement = ReferenceElement> {
  middleware?: Middleware[]
  open?: boolean
  placement?: Placement
  strategy?: Strategy
  transform?: boolean
  whileElementsMounted?: (
    reference: T,
    floating: FloatingElement,
    update: () => void,
  ) => () => void
}

export interface FloatingReturn {
  isPositioned: boolean
  middlewareData: MiddlewareData
  placement: Placement
  strategy: Strategy
  x: number
  y: number
}
