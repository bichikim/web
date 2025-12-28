import {createSignal, createEffect, untrack, onCleanup, Show} from 'solid-js'
import {LottieSharedProps} from './types'
import {DotLottie} from '@lottiefiles/dotlottie-web'

if (import.meta.env.STORYBOOK !== 'true' || !import.meta.env.SSR) {
  // set the wasm url for the dotlottie-web library
  // prevent the library from loading the wasm file from the remote url
  DotLottie.setWasmUrl('/wasm/dot-lottie-player.wasm')
}

export type LottieFileProps = LottieSharedProps

/**
 * DotLottie 가 json 도 지원 하지만 일부 파일 랜더링에 깨짐이 있기 때문에 JSON 이면 LottieJson 을 사용하도록
 * @param props
 * @returns
 */
export const LottieFile = (props: LottieFileProps) => {
  const [canvas, setCanvas] = createSignal<HTMLCanvasElement | null>(null)
  const [dotLottie, setDotLottie] = createSignal<DotLottie | null>(null)
  const [lottieLoading, setLottieLoading] = createSignal(false)

  createEffect(() => {
    const _canvas = canvas()
    const _autoPlay = untrack(() => props.play === 'autoplay')
    const _loop = untrack(() => props.loop ?? false)
    const _speed = untrack(() => props.speed ?? 1)
    const _src = props.src

    if (!_canvas) {
      return
    }

    const dotLottie = new DotLottie({
      autoplay: _autoPlay,
      canvas: _canvas,

      loop: _loop,

      renderConfig: {
        autoResize: true,
        devicePixelRatio: 1,
      },

      speed: _speed,
      // layout: {
      //   fit: 'contain',
      // },
      src: _src,
    })

    setDotLottie(dotLottie)

    onCleanup(() => {
      dotLottie.destroy()
    })
  })

  // react loop
  createEffect(() => {
    const _dotLottie = dotLottie()
    const _loop = props.loop ?? false
    const isPlay = untrack(() => props.play !== false)

    if (!_dotLottie) {
      return
    }

    _dotLottie.setLoop(_loop)

    // play the animation if the play prop is true or 'autoplay'
    if (isPlay) {
      _dotLottie.play()
    }

    untrack(() => {
      setLottieLoading(true)
    })

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

    _dotLottie.addEventListener('ready', onDataReady)
    _dotLottie.addEventListener('complete', onComplete)

    onCleanup(() => {
      _dotLottie.removeEventListener('ready', onDataReady)
      _dotLottie.removeEventListener('complete', onComplete)
      _dotLottie.setLoop(_loop)
    })
  })

  // react play
  createEffect(() => {
    const _dotLottie = dotLottie()
    const _play = props.play

    if (!_dotLottie) {
      return
    }

    if (_play === 'autoplay') {
      _dotLottie.play()
    } else if (_play === true) {
      _dotLottie.play()
    } else {
      _dotLottie.pause()
    }
  })

  // react speed
  createEffect(() => {
    const _dotLottie = dotLottie()
    const _speed = props.speed ?? 1

    if (!_dotLottie) {
      return
    }

    _dotLottie.setSpeed(_speed)
  })

  const isLoaded = () => {
    return dotLottie() && !lottieLoading()
  }

  return (
    <Show when={isLoaded()} fallback={props.fallback}>
      <canvas class="w-full h-full" ref={setCanvas} />
    </Show>
  )
}
