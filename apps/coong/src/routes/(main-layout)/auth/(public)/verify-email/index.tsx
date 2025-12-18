import tada from './_components/tada.lottie'
import {DotLottie} from 'src/components/dot-lottie/DotLottie'

export default function VerifyEmail() {
  return (
    <div class="flex flex-col items-center justify-center h-screen">
      <h1 class="text-2xl font-bold">Verified your email</h1>
      <div class="absolute top--8rem left-0 w-full h-full">
        <DotLottie src={tada} autoplay loop />
      </div>
    </div>
  )
}
