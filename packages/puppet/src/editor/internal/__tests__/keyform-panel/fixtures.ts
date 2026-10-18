import {createDemoDocument} from '../../../../player'
import {addParameter, insertParameterKeyform} from '../../parameter-keyforms'

const PARAMETER_MINIMUM = -30
const PARAMETER_MAXIMUM = 30

export const createOneDimensionalDocument = () => {
  const added = addParameter({document: createDemoDocument(), nodeIds: ['mesh-preview']})
  if (added === undefined) {
    throw new Error('Expected a one-dimensional parameter')
  }

  const withMinimum = insertParameterKeyform({
    bindingId: added.binding.id,
    document: added.document,
    values: [PARAMETER_MINIMUM],
  })
  const withMaximum =
    withMinimum === undefined
      ? undefined
      : insertParameterKeyform({
          bindingId: added.binding.id,
          document: withMinimum,
          values: [PARAMETER_MAXIMUM],
        })
  if (withMaximum === undefined) {
    throw new Error('Expected one-dimensional keyforms')
  }

  return {bindingId: added.binding.id, document: withMaximum}
}

interface DispatchPointerEventOptions {
  readonly target: EventTarget
  readonly type: string
  readonly pointerId: number
  readonly clientX: number
  readonly clientY?: number
}

export const dispatchPointerEvent = (options: DispatchPointerEventOptions) => {
  const event = new MouseEvent(options.type, {
    bubbles: true,
    button: 0,
    clientX: options.clientX,
    clientY: options.clientY ?? 0,
  })
  Object.defineProperty(event, 'pointerId', {value: options.pointerId})
  options.target.dispatchEvent(event)
}
