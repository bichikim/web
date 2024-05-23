import {computePosition, FloatingElement, ReferenceElement} from '@floating-ui/dom'
import {Accessor, createMemo, createResource} from 'solid-js'
import {FloatingOptions, FloatingReturn} from 'src/use/floating/types'
import {resolveAccessor} from 'src/use/resolve-accessor'
import {MayBeAccessor} from 'src/use/types'

export const useFloating = <T extends ReferenceElement = ReferenceElement>(
  reference: MayBeAccessor<Element>,
  floating: MayBeAccessor<FloatingElement>,
  options: MayBeAccessor<FloatingOptions<T>>,
): Accessor<FloatingReturn> => {
  const optionsAccessor = resolveAccessor(options)
  const referenceAccessor = resolveAccessor(reference)
  const floatingAccessor = resolveAccessor(floating)

  const updatePayload = createMemo(() => {
    return {
      floating: floatingAccessor(),
      options: optionsAccessor(),
      reference: referenceAccessor(),
    }
  })

  const [position] = createResource(
    updatePayload,
    ({options, reference, floating}) => {
      return computePosition(reference, floating, options)
    },
    {
      initialValue: {
        middlewareData: {},
        placement: optionsAccessor().placement ?? 'bottom',
        strategy: optionsAccessor().strategy ?? 'absolute',
        x: 0,
        y: 0,
      },
    },
  )

  return createMemo(() => {
    return {
      ...position(),
      isPositioned: !position.loading,
    }
  })
}
