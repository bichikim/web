/* eslint-disable no-magic-numbers */
import tada from './_components/tada.json?url'
import bg from './_components/bg.png'
import {SAuroraText} from 'src/components/text'
import {useAuth} from 'src/store/auth'
import {clientOnly} from '@solidjs/start'
import {A, RouteDefinition, useLocation, useNavigate} from '@solidjs/router'
import {createSignal, onMount, Show} from 'solid-js'
import {queryToString} from 'src/utils/query-params'
import {cva} from 'class-variance-authority'
import {useCountdown} from 'src/use/countdown'
import {CHANGE_PASSWORD_PATH} from 'src/requests/auth/reset-password/redirect-url'
import type {EmailOtpType} from '@supabase/supabase-js'

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

export const route = {
  info: {
    public: true,
  },
} satisfies RouteDefinition

const ALLOWED_OTP_TYPES: ReadonlySet<EmailOtpType> = new Set([
  'signup',
  'invite',
  'magiclink',
  'recovery',
  'email_change',
  'email',
])

const isEmailOtpType = (value: string): value is EmailOtpType => {
  return (ALLOWED_OTP_TYPES as ReadonlySet<string>).has(value)
}

type VerificationStatus = 'idle' | 'verifying' | 'success' | 'error'

export default function VerifyEmailPage() {
  const {user, verifyOtp} = useAuth()
  const [verificationStatus, setVerificationStatus] = createSignal<VerificationStatus>('idle')
  const [verificationError, setVerificationError] = createSignal<string | null>(null)

  const location = useLocation()
  const {token_hash: tokenHashParameter, type: typeParameter} = location.query
  const navigate = useNavigate()

  const afterNavigate = useCountdown(20_000, () => navigate('/'))

  const tokenHash = () => (tokenHashParameter ? queryToString(tokenHashParameter) : '')
  const otpType = (): EmailOtpType | null => {
    if (!typeParameter) {
      return null
    }
    const value = queryToString(typeParameter)

    return isEmailOtpType(value) ? value : null
  }

  onMount(async () => {
    const hash = tokenHash()
    const type = otpType()

    if (!hash || !type) {
      setVerificationStatus('error')
      setVerificationError('유효하지 않은 인증 링크입니다.')
      return
    }

    setVerificationStatus('verifying')

    try {
      await verifyOtp({tokenHash: hash, type})
      setVerificationStatus('success')

      if (type === 'recovery') {
        navigate(CHANGE_PASSWORD_PATH, {replace: true})
        return
      }

      afterNavigate.start()
    } catch (error) {
      setVerificationStatus('error')
      setVerificationError(error instanceof Error ? error.message : '이메일 인증에 실패했습니다.')
    }
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
        <Show
          when={verificationStatus() !== 'error'}
          fallback={
            <>
              <h1 class={titleStyle({loading: false})}>인증에 실패했습니다</h1>
              <p class="text-sm text-#d13b3b mt-1rem text-center px-1rem">{verificationError()}</p>
              <Show
                when={otpType() === 'recovery'}
                fallback={
                  <A href="/auth/sign-in" class="text-gray-700 underline font-bold text-lg mt-1rem">
                    로그인 페이지로 돌아가기
                  </A>
                }
              >
                <A
                  href="/auth/reset-password"
                  class="text-gray-700 underline font-bold text-lg mt-1rem"
                >
                  패스워드 재설정 다시 시도
                </A>
              </Show>
            </>
          }
        >
          <h1 class={titleStyle({loading: verificationStatus() === 'verifying'})}>
            Verified your email
          </h1>
          <Show
            when={verificationStatus() === 'success' && user()}
            fallback={
              <span class="i-tabler-loader-2 animate-spin text-2xl text-gray-400 block w-2rem h-2rem mt-1rem" />
            }
          >
            <SAuroraText class={emailStyle}>{user()?.email}</SAuroraText>
          </Show>
          <Show when={verificationStatus() === 'success' && user()}>
            <span class="text-sm text-gray-500">
              <Show when={tokenHash()} fallback={'Go to the '}>
                Redirecting to the{' '}
              </Show>
              <A href="/" class="text-gray-700 underline font-bold text-lg">
                Root page
              </A>{' '}
              <Show when={tokenHash()}>in {countSeconds()} seconds</Show>
            </span>
          </Show>
        </Show>
      </div>
    </div>
  )
}
