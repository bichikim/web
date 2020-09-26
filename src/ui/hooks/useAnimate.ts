import {easing, keyframes, styler} from 'popmotion'
import {KeyframesProps, Values} from 'popmotion/src/animations/keyframes/types'
import {computed, onMounted, onUnmounted, Ref} from 'vue'
import {parallelArray} from '@/ui/utils'
import interactjs from 'interactjs'

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
  onUnmount?: ($el) => any
}

export interface AnimateOptions extends EventOptions {
  hoverAni?: Ref<Animation | AnimationKeys>
  tapAni?: Ref<Animation | AnimationKeys>
  mountAni?: Ref<Animation | AnimationKeys>
}

export const useEasyAni = (ani?: Ref<Animation | AnimationKeys>) => {
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

const useAction = (keyframeAni: Ref<any>, defaults: Omit<KeyframesProps, 'values'> = defaultOptions) => {
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

export const useEvent = (root: Ref<any>, options: EventOptions = {}) => {
  const {onHover, onMounted: _onMounted, onTap, onUnmount: _onUnmounted, onDoubleTap} = options
  const interact = computed(() => (interactjs(root.value.$el)))

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
    _onMounted && _onMounted(root.value.$el)
  })

  onMounted(() => {
    root.value.$el.addEventListener('mouseover', hover)
    interact.value.on('tap', tap)
    interact.value.on('doubletap', doubleTap)
  })

  onUnmounted(() => {
    root.value.$el.removeEventListener('mouseover', hover)
    interact.value.off('tap', tap)
    interact.value.off('doubletap', doubleTap)
    _onUnmounted && _onUnmounted(root.value.$el)
  })
}

export const useAnimate = (root: Ref<any>, options: AnimateOptions) => {
  const {onHover, onTap} = options
  const mountAni: any = useEasyAni(options.mountAni)
  const mountAction = useAction(mountAni)
  const hoverAni: any = useEasyAni(options.hoverAni)
  const hoverAction = useAction(hoverAni)
  const tapAni: any = useEasyAni(options.tapAni)
  const tapAction: any = useAction(tapAni)

  const elStyler = computed(() => (styler(root.value.$el)))

  useEvent(root, {
    onMounted: () => {
      if (mountAction?.value) {
        mountAction.value.start(elStyler.value.set)
      }
    },
    onTap: (event) => {
      onTap && onTap(event)
      if (tapAction?.value) {
        tapAction.value.start(elStyler.value.set)
      }
      // empty
      event.preventDefault()
    },
    onHover: (event) => {
      onHover && onHover(event)
      if (hoverAction?.value) {
        hoverAction.value.start(elStyler.value.set)
      }
    },
  })
}
