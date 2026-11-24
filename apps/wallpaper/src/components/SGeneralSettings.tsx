import {version} from '../../package.json'
import icon from '../../src-tauri/icons/icon.png?url'
import {SDictationSettings} from './SDictationSettings'
import {SSelect} from './SSelect'
import {interfaceLanguage, localizeMessage, text as uiText} from '../features/localization'
import {Show} from 'solid-js'

export const SGeneralSettings = () => (
  <section aria-label={uiText('일반')} class="grid gap-6">
    <div class="flex items-center gap-4">
      <img src={icon} alt="" class="h-12 w-12 rounded-xl" />
      <div>
        <h3 class="m-0 text-lg font-semibold">Wallpaper</h3>
        <p class="m-0 text-xs text-stone-600">
          {`${uiText('버전')} `}
          {version}
        </p>
      </div>
    </div>
    <div class="grid gap-2 text-[13px]">
      <div class="grid grid-cols-[4rem_minmax(0,1fr)] items-center gap-3">
        <span>{uiText('언어')}</span>
        <SSelect
          label={uiText('인터페이스 언어')}
          options={[
            {
              label: uiText('한국어'),
              value: 'ko',
            },
            {label: 'English', value: 'en'},
          ]}
          value={interfaceLanguage.language()}
          disabled={interfaceLanguage.busy()}
          onChange={interfaceLanguage.change}
        />
      </div>
      <Show when={interfaceLanguage.error()}>
        {(message) => (
          <p role="alert" class="m-0 text-xs text-red-700">
            {localizeMessage(message())}
          </p>
        )}
      </Show>
    </div>
    <SDictationSettings />
    <dl class="m-0 grid text-sm">
      <div class="wallpaper-row">
        <dt>{uiText('음성 시작·전송')}</dt>
        <dd class="m-0 text-right text-stone-600">{uiText('Alt+M · 전역')}</dd>
      </div>
      <div class="wallpaper-row">
        <dt>{uiText('말풍선 음성 전송')}</dt>
        <dd class="m-0 text-right text-stone-600">Ctrl/⌘+Enter</dd>
      </div>
      <div class="wallpaper-row">
        <dt>{uiText('설정 저장')}</dt>
        <dd class="m-0 text-right text-stone-600">{uiText('자동 저장')}</dd>
      </div>
      <div class="wallpaper-row">
        <dt>{uiText('파일과 설정')}</dt>
        <dd class="m-0 text-right text-stone-600">{uiText('현재 기기에 보관')}</dd>
      </div>
    </dl>
    <p class="m-0 text-xs leading-6 text-stone-600">
      {uiText('설정 창을 닫아도 배경은 계속 실행됩니다.')}
    </p>
  </section>
)
