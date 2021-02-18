import {parallelArray} from 'src/utils'
import interactJs from 'interactjs'
import {easing, keyframes, styler} from 'popmotion'
import {KeyframesProps, Values} from 'popmotion/src/animations/keyframes/types'
import {computed, onBeforeUnmount, onMounted, Ref, ref, ComputedRef} from 'vue'
import debounce from 'lodash/debounce'

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
  wait?: number
  onTap?: (event) => any
  onDoubleTap?: (event) => any
  onMounted?: ($el) => any
  onHover?: (event) => any
  onLeave?: (event) => any
  onInput?: (event) => any
  onBeforeUnmounted?: ($el) => any
}

export interface AnimateOptions extends EventOptions {
  hoverAni?: Animation | AnimationKeys
  tapAni?: Animation | AnimationKeys
  mountAni?: Animation | AnimationKeys
  leaveAni?: Animation | AnimationKeys
  inputAni?: Animation | AnimationKeys
}

export const easyAni = (
  ani?: Animation | AnimationKeys,
): ComputedRef<KeyframesProps | undefined> => {
  return computed(() => {
    if (!ani) {
      return
    }

    if (ani.values) {
      const values = ani.values

      return {
        ...ani,
        values: parallelArray(values),
      }
    }

    return {
      values: parallelArray(ani),
    }
  })
}

const defaultOptions: Omit<KeyframesProps, 'values'> = {
  duration: 500,
  ease: easing.easeInOut as any,
}

const action = (
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

export const events = (root: Ref<any>, options: EventOptions = {}): void => {
  const {
    onHover,
    onMounted: _onMounted,
    onTap,
    onBeforeUnmounted: _onBeforeUnmounted,
    onDoubleTap,
    onLeave,
    onInput,
    wait = 75,
  } = options

  const interact = computed(() => {
    const el = getEl(root)
    if (el) {
      return interactJs(el)
    }
    return undefined
  })

  const hover = debounce((event) => {
    onHover && onHover(event)
  }, wait)

  const leave = debounce((event) => {
    onLeave && onLeave(event)
  }, wait)

  const tap = debounce((event) => {
    onTap && onTap(event)
  })

  const doubleTap = debounce((event) => {
    onDoubleTap && onDoubleTap(event)
  })

  const input = debounce((event) => {
    onInput && onInput(event)
  }, wait)

  onMounted(() => {
    const el = getEl(root)
    el.addEventListener('mouseover', hover)
    el.addEventListener('mouseout', leave)
    el.addEventListener('input', input)
    if (interact.value) {
      interact.value.on('tap', tap)
      interact.value.on('doubletap', doubleTap)
    }
    _onMounted && _onMounted(root.value?.$el)
  })

  onBeforeUnmount(() => {
    const el = getEl(root)
    el.removeEventListener('mouseover', hover)
    el.removeEventListener('mouseout', leave)
    el.removeEventListener('input', input)
    if (interact.value) {
      interact.value.off('tap', tap)
      interact.value.off('doubletap', doubleTap)
    }
    _onBeforeUnmounted && _onBeforeUnmounted(el)
  })
}

export const animate = (root: Ref<HTMLElement | null>, options: AnimateOptions): void => {
  const {onHover, onTap, onLeave, onInput} = options
  const mountAni: any = easyAni(options.mountAni)
  const mountAction = action(mountAni)
  const hoverAni: any = easyAni(options.hoverAni)
  const hoverAniPlayback: any = ref(null)
  const leaveAni: any = easyAni(options.leaveAni)
  const leaveActon = action(leaveAni)
  const leaveAniPlayback: any = ref(null)
  const inputAni: any = easyAni(options.inputAni)
  const inputAction = action(inputAni)
  const inputAniPlayback: any = ref(null)
  const hoverAction = action(hoverAni)
  const tapAni: any = easyAni(options.tapAni)
  const tapAction: any = action(tapAni)

  const elStyler = computed(() => {
    const el = getEl(root)
    if (el) {
      return styler(el)
    }

    return undefined
  })

  events(root, {
    onMounted: () => {
      if (mountAction?.value && elStyler.value) {
        hoverAniPlayback.value = mountAction.value.start(elStyler.value.set)
      }
    },
    onInput: (event) => {
      onInput && onInput(event)
      if (inputAniPlayback.value) {
        inputAniPlayback.value?.stop?.()
        inputAniPlayback.value = null
      }
      if (inputAction?.value && elStyler.value) {
        inputAniPlayback.value = inputAction.value.start(elStyler.value.set)
      }
    },
    onLeave: (event) => {
      onLeave && onLeave(event)
      // stop hover animation
      if (hoverAniPlayback.value) {
        hoverAniPlayback.value?.stop?.()
        hoverAniPlayback.value = null
      }
      if (leaveActon?.value && elStyler.value) {
        leaveAniPlayback.value = leaveActon.value.start(elStyler.value.set)
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
      // stop leave animation
      if (hoverAniPlayback.value) {
        leaveAniPlayback.value?.stop?.()
        leaveAniPlayback.value = null
      }
      if (hoverAction?.value && elStyler.value) {
        hoverAction.value.start(elStyler.value.set)
      }
    },
  })
}
