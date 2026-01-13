/* eslint-disable no-magic-numbers */
import tada from './_components/tada.json?url'
import bg from './_components/bg.png'
import {SAuroraText} from 'src/components/text'
import {useAuth} from 'src/store/auth'
import {clientOnly} from '@solidjs/start'
import {useLocation, useNavigate} from '@solidjs/router'
import {onMount, Show} from 'solid-js'
import {queryToString} from 'src/utils/query-params'
import {cva} from 'class-variance-authority'
import {useCountdown} from 'src/use/countdown'
import {useNameNavigate} from 'src/components/anchor/name-navigator'
import {HAnchor} from 'src/components/anchor/HAnchor'

const ClientOnlyLottie = clientOnly(() =>
  import('src/components/lottie/Lottie').then((module_) => ({
    default: module_.Lottie,
  })),
)

const rootStyle = `:uno:
elative flex flex-col items-center justify-center h-screen before:content-[''] before:absolute
before:inset-0 before:bg-[linear-gradient(to_bottom,#ffffff_0px,#ffffff_30%,rgba(255,255,255,0.4)_100%)]
 before:pointer-events-none
`

const emailStyle = `:uno:
mt-1rem
text-2xl font-bold var-aurora-color-1=#00c2ff var-aurora-color-2=#33ff8c var-aurora-color-3=#ffc640
 var-aurora-color-4=#e54cff
`

const titleStyle = cva('text-3xl font-bold text-dark', {
  variants: {
    loading: {
      true: 'animate-pulse',
    },
  },
})

export default function VerifyEmail() {
  const {user, exchangeCodeForSection, exchangeCodeForSectionError, loading} = useAuth()

  const location = useLocation()
  const {code} = location.query
  const navigate = useNameNavigate()

  const afterNavigate = useCountdown(20_000, () => navigate('home'))

  onMount(async () => {
    if (!code) {
      return
    }

    await exchangeCodeForSection(queryToString(code))
    afterNavigate.start()
  })

  const countSeconds = () => {
    const count = afterNavigate.count()

    return Math.floor(count / 1000)
  }

  return (
    <div
      class={rootStyle}
      style={{
        'background-image': `url('${bg}')`,
        'background-position': 'top left',
        'background-repeat': 'repeat',
      }}
    >
      <div class="absolute top--10rem left-0 right-0 bottom-0">
        <ClientOnlyLottie src={tada} play="autoplay" loop />
      </div>
      <div class="flex flex-col items-center justify-center absolute top-0 bottom-0 left-0 right-0">
        <h1 class={titleStyle({loading: loading()})}>Verified your email</h1>
        <Show
          when={user()}
          fallback={<span class="i-tabler-loader-2 animate-spin text-2xl text-gray-400 block w-2rem h-2rem mt-1rem" />}
        >
          <SAuroraText class={emailStyle}>{user()?.email}</SAuroraText>
        </Show>
        <Show when={user()}>
          <span class="text-sm text-gray-500">
            <Show when={code} fallback={'Go to the '}>
              Redirecting to the{' '}
            </Show>
            <HAnchor hrefName="home" class="text-gray-700 underline font-bold text-lg">
              Root page
            </HAnchor>{' '}
            <Show when={code}>in {countSeconds()} seconds</Show>
          </span>
        </Show>
      </div>
    </div>
  )
}
