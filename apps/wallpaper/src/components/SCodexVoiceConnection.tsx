import {localizeMessage, text as uiText} from '../features/localization'

import {Show} from 'solid-js'
import {DEFAULT_POFFO_VOICE} from '@winter-love/wallpaper/settings/voice'
import {useCodexVoiceLogin} from '../features/voice/use-codex-voice-login'
import {useVoicePreview} from '../features/voice/use-voice-preview'

const LOGIN_LABEL = {
  get desktopOnly() {
    return uiText('데스크톱 앱에서 사용 가능')
  },
  get loginRequired() {
    return uiText('로그인 필요')
  },
  get ready() {
    return uiText('로그인 확인됨')
  },
  get unavailable() {
    return uiText('확인 실패')
  },
}
export const SCodexVoiceConnection = () => {
  const login = useCodexVoiceLogin()
  const preview = useVoicePreview(() => ({...DEFAULT_POFFO_VOICE, provider: 'chatgpt'}))
  return (
    <section aria-label={uiText('음성')} class="grid gap-2 py-3">
      <div class="flex items-center justify-between gap-3">
        <h3 class="m-0 text-[13px] font-medium">{uiText('음성')}</h3>
        <span class="text-xs text-stone-500">
          {login.status.loading ? uiText('확인 중…') : LOGIN_LABEL[login.status() ?? 'unavailable']}
        </span>
      </div>
      <Show
        when={login.status() === 'ready'}
        fallback={
          <button
            type="button"
            class="wallpaper-file-button justify-self-start"
            disabled={login.status.loading}
            onClick={() => login.refresh()}
          >
            {uiText('다시 확인')}
          </button>
        }
      >
        <div class="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
          <span>{uiText('ChatGPT 설정 음성')}</span>
          <button type="button" class="wallpaper-file-button" onClick={preview.play}>
            {preview.status() === 'idle' ? uiText('미리듣기') : uiText('중지')}
          </button>
        </div>
      </Show>
      <Show when={preview.status() !== 'idle'}>
        <span role="status" class="text-xs text-stone-500">
          {preview.status() === 'playing' ? uiText('재생 중…') : uiText('음성 준비 중…')}
        </span>
      </Show>
      <Show when={preview.error()}>
        {(message) => (
          <p role="alert" class="m-0 text-xs text-red-700">
            {localizeMessage(message() ?? '')}
          </p>
        )}
      </Show>
      <p class="m-0 text-xs text-stone-500">
        {uiText('비공식 연동 · 미리듣기 문장을 OpenAI로 전송해요.')}
      </p>
    </section>
  )
}
