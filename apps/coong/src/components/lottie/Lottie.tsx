import {LottieJson} from './LottieJson'
import {LottieFile} from './LottieFile'
import type {LottieSharedProps} from './types'
import {Show, mergeProps} from 'solid-js'

export type LottieProps = LottieSharedProps & {
  type?: 'json' | 'file'
}

export const Lottie = (props: LottieProps) => {
  const type = () => props.type ?? 'json'

  return (
    <Show when={type() === 'json'} fallback={<LottieFile {...props} />}>
      <LottieJson {...props} />
    </Show>
  )
}
