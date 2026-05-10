import {createEffect, createSignal, onCleanup, Show, untrack} from 'solid-js'
import type {AnimationItem, LottiePlayer} from 'lottie-web'
import type {LottieSharedProps} from './types'

const getLottie = async () => {
  const module = await import('lottie-web')

  return module?.default ?? module
}

export type LottieJsonProps = LottieSharedProps

export const LottieJson = (props: LottieJsonProps) => {
  const [element, setElement] = createSignal<HTMLDivElement | null>(null)
  const [lottieModule, setLottieModule] = createSignal<LottiePlayer | null>(null)
  const [animation, setAnimation] = createSignal<AnimationItem | null>(null)
  const [lottieLoading, setLottieLoading] = createSignal(false)

  createEffect(async () => {
    const _lottie = await getLottie()

    setLottieModule(_lottie)
  })

  createEffect(() => {
    const _lottieModule = lottieModule()
    const _element = element()
    const _autoplay = untrack(() => props.play === 'autoplay')
    const _loop = untrack(() => props.loop ?? false)
    const _path = props.src

    if (!_lottieModule || !_element) {
      return
    }

    const animation = _lottieModule.loadAnimation({
      autoplay: _autoplay,
      container: _element,
      loop: _loop,
      path: _path,
      renderer: 'svg',
    })

    // setLottieLoading(true)

    const onDataReady = () => {
      untrack(() => {
        setLottieLoading(false)
        props.onDataReady?.()
      })
    }

    const onComplete = () => {
      untrack(() => {
        props.onPlay?.(false)
      })
    }

    animation.addEventListener('data_ready', onDataReady)
    animation.addEventListener('complete', onComplete)
    setAnimation(animation)

    onCleanup(() => {
      animation.removeEventListener('data_ready', onDataReady)
      animation.removeEventListener('complete', onComplete)
      animation.destroy()
    })
  })

  // react loop
  createEffect(() => {
    const _animation = animation()
    const _loop = props.loop ?? false
    const isPlay = untrack(() => props.play !== false)

    if (!_animation) {
      return
    }

    _animation.setLoop(_loop)

    // play the animation if the play prop is true or 'autoplay'
    if (isPlay) {
      _animation.play()
    }
  })

  // react play
  createEffect(() => {
    const _animation = animation()
    const _play = props.play

    if (!_animation) {
      return
    }

    if (_play === 'autoplay') {
      _animation.play()
    } else if (_play === true) {
      _animation.play()
    } else {
      _animation.pause()
    }
  })

  // react speed
  createEffect(() => {
    const _animation = animation()
    const _speed = props.speed ?? 1

    if (!_animation) {
      return
    }

    _animation.setSpeed(_speed)
  })

  const isLoaded = () => {
    return lottieModule() && !lottieLoading()
  }

  return (
    <Show when={isLoaded()} fallback={props.fallback}>
      <div class="w-full h-full" ref={setElement} />
    </Show>
  )
}
