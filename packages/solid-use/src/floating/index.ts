import {computePosition, FloatingElement, ReferenceElement} from '@floating-ui/dom'
import {Accessor, createEffect, createMemo, createSignal, onCleanup} from 'solid-js'
import {FloatingOptions, FloatingReturn} from 'src/floating/types'
import {resolveAccessor} from 'src/resolve-accessor'
import {MaybeAccessor} from 'src/types'

export const useFloating = <T extends ReferenceElement = ReferenceElement>(
  reference: MaybeAccessor<T | null>,
  floating: MaybeAccessor<FloatingElement | null>,
  options: MaybeAccessor<FloatingOptions<T>>,
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
  const [isPositioned, setIsPositioned] = createSignal(false)
  let updateVersion = 0

  const update = async () => {
    const {floating, options, reference} = updatePayload()
    updateVersion += 1
    const version = updateVersion
    setIsPositioned(false)
    const {
      autoUpdate: _autoUpdate,
      onError,
      open = true,
      transform: _transform,
      ...positionOptions
    } = options

    if (!open || !floating || !reference) {
      return
    }

    try {
      const nextPosition = await computePosition(reference, floating, positionOptions)

      if (version !== updateVersion) {
        return
      }

      setPosition(nextPosition)
      setIsPositioned(true)
    } catch (error) {
      if (version === updateVersion) {
        onError?.(error)
      }
    }
  }

  createEffect(() => {
    const {floating, options, reference} = updatePayload()
    let cleanup: (() => void) | undefined

    setIsPositioned(false)
    update()

    if (options.open !== false && floating && reference) {
      const {autoUpdate} = options

      if (autoUpdate) {
        cleanup = autoUpdate(reference, floating, update)
      }
    }

    onCleanup(() => {
      updateVersion += 1
      cleanup?.()
    })
  })

  return createMemo(() => {
    return {
      ...position(),
      isPositioned: isPositioned(),
    }
  })
}
