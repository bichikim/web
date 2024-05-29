import {computePosition, FloatingElement, ReferenceElement} from '@floating-ui/dom'
import {Accessor, createEffect, createMemo, createSignal, onCleanup} from 'solid-js'
import {FloatingOptions, FloatingReturn} from 'src/use/floating/types'
import {resolveAccessor} from 'src/use/resolve-accessor'
import {MayBeAccessor} from 'src/use/types'

export const useFloating = <T extends ReferenceElement = ReferenceElement>(
  reference: MayBeAccessor<T | null>,
  floating: MayBeAccessor<FloatingElement | null>,
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

  const [position, setPosition] = createSignal({
    middlewareData: {},
    placement: optionsAccessor().placement ?? 'bottom',
    strategy: optionsAccessor().strategy ?? 'absolute',
    x: 0,
    y: 0,
  })

  const update = async () => {
    const {floating, options, reference} = updatePayload()
    if (floating && reference) {
      setPosition(await computePosition(reference, floating, options))
    }
  }

  createEffect(() => {
    const {floating, options, reference} = updatePayload()
    update()
    if (floating && reference) {
      const {autoUpdate} = options
      if (autoUpdate) {
        const cleanup = autoUpdate(reference, floating, update)
        return onCleanup(() => {
          cleanup?.()
        })
      }
    }
  })

  return createMemo(() => {
    return {
      ...position(),
      isPositioned: true,
      // isPositioned: !position.loading,
    }
  })
}
