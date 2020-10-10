import {parallelArray} from 'src/utils'
import {ComputedRef} from '@vue/reactivity'
import interactJs from 'interactjs'
import {easing, keyframes, styler} from 'popmotion'
import {KeyframesProps, Values} from 'popmotion/src/animations/keyframes/types'
import {computed, onBeforeUnmount, onMounted, Ref} from 'vue'

type AnimationKeys = Record<string, any | any[]>

type Animation = Omit<KeyframesProps, 'values'> & {
  values?: AnimationKeys
}

const defaultStyle = {
  scale: 1,
  x: 0,
  y: 0,
}

interface EventOptions {
  onTap?: (event) => any
  onDoubleTap?: (event) => any
  onMounted?: ($el) => any
  onHover?: (event) => any
  onBeforeUnmounted?: ($el) => any
}

export interface AnimateOptions extends EventOptions {
  hoverAni?: Ref<Animation | AnimationKeys>
  tapAni?: Ref<Animation | AnimationKeys>
  mountAni?: Ref<Animation | AnimationKeys>
}

export const useEasyAni = (
  ani?: Ref<Animation | AnimationKeys>,
): ComputedRef<KeyframesProps | undefined> => {
  return computed(() => {
    if (!ani?.value) {
      return
    }

    if (ani.value.values) {
      const values = ani.value.values

      return {
        ...ani.value,
        values: parallelArray(values),
      }
    }

    return {
      values: parallelArray(ani.value),
    }
  })
}

const defaultOptions: Omit<KeyframesProps, 'values'> = {
  duration: 500,
  ease: easing.easeInOut as any,
}

const useAction = (
  keyframeAni: Ref<any>,
  defaults: Omit<KeyframesProps, 'values'> = defaultOptions,
) => {
  return computed(() => {
    if (!keyframeAni?.value) {
      return
    }

    const values: Values = [defaultStyle]

    return keyframes({
      ...defaults,
      values,
      ...keyframeAni.value,
    })
  })
}

const getEl = (ref: Ref) => {
  if (ref.value.addEventListener) {
    return ref.value
  }
  if (ref.value.$el && ref.value.$el.addEventListener) {
    return ref.value.$el
  }
}

export const useEvent = (root: Ref<any>, options: EventOptions = {}): void => {
  const {
    onHover,
    onMounted: _onMounted,
    onTap,
    onBeforeUnmounted: _onBeforeUnmounted,
    onDoubleTap,
  } = options

  const interact = computed(() => {
    const el = getEl(root)
    if (el) {
      return interactJs(el)
    }
  })

  const hover = (event) => {
    onHover && onHover(event)
  }

  const tap = (event) => {
    onTap && onTap(event)
  }

  const doubleTap = (event) => {
    onDoubleTap && onDoubleTap(event)
  }

  onMounted(() => {
    _onMounted && _onMounted(root.value?.$el)
  })

  onMounted(() => {
    const el = getEl(root)
    el.addEventListener('mouseover', hover)
    if (interact.value) {
      interact.value.on('tap', tap)
      interact.value.on('doubletap', doubleTap)
    }
  })

  onBeforeUnmount(() => {
    const el = getEl(root)
    el.removeEventListener('mouseover', hover)
    if (interact.value) {
      interact.value.off('tap', tap)
      interact.value.off('doubletap', doubleTap)
    }
    _onBeforeUnmounted && _onBeforeUnmounted(el)
  })
}

export const useAnimate = (root: Ref<any>, options: AnimateOptions): void => {
  const {onHover, onTap} = options
  const mountAni: any = useEasyAni(options.mountAni)
  const mountAction = useAction(mountAni)
  const hoverAni: any = useEasyAni(options.hoverAni)
  const hoverAction = useAction(hoverAni)
  const tapAni: any = useEasyAni(options.tapAni)
  const tapAction: any = useAction(tapAni)

  const elStyler = computed(() => {
    const el = getEl(root)
    if (el) {
      return styler(el)
    }
  })

  useEvent(root, {
    onMounted: () => {
      if (mountAction?.value && elStyler.value) {
        mountAction.value.start(elStyler.value.set)
      }
    },
    onTap: (event) => {
      onTap && onTap(event)
      if (tapAction?.value && elStyler.value) {
        tapAction.value.start(elStyler.value.set)
      }
      // empty
      event.preventDefault()
    },
    onHover: (event) => {
      onHover && onHover(event)
      if (hoverAction?.value && elStyler.value) {
        hoverAction.value.start(elStyler.value.set)
      }
    },
  })
}
