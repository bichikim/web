import {clientOnly} from '@solidjs/start'
import type {DotLottieSolidProps} from '@lottiefiles/dotlottie-solid'

const DotLottieSolidClient = clientOnly(() =>
  import('@lottiefiles/dotlottie-solid').then((module) => {
    // Set where the wasm file is located.
    // Keep this inside client-only import so SSR never evaluates the package.
    module.setWasmUrl('/wasm/dot-lottie-player.wasm')

    return {default: module.DotLottieSolid}
  }),
)

export type DotLottieProps = DotLottieSolidProps

export const DotLottie = (props: DotLottieProps) => {
  return <DotLottieSolidClient {...props} />
}
