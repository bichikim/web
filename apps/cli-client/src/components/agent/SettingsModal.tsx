import {Show} from 'solid-js'

const FIELD_SHARED = [
  'w-full',
  'rounded-[10px]',
  'border',
  'border-[#2c3642]',
  'bg-[#121922]',
  'text-inherit',
  'font-inherit',
  'focus:outline',
  'focus:outline-2',
  'focus:outline-[#5b8cff]',
  'focus:outline-offset-1',
].join(' ')

interface SettingsModalProperties {
  readonly isOpen: boolean
  readonly isRunning: boolean
  readonly postUrl: string
  readonly workingDirectory: string
  readonly onClose: () => void
  readonly onInputPostUrl: (value: string) => void
  readonly onInputWorkingDirectory: (value: string) => void
}

export function SettingsModal(properties: SettingsModalProperties) {
  return (
    <Show
      when={properties.isOpen}
      children={
        <div class="fixed inset-0 z-40">
          <button
            type="button"
            class="absolute inset-0 bg-[#040a14]/70"
            aria-label="설정 닫기"
            onClick={properties.onClose}
          />
          <section
            class={
              'absolute left-1/2 top-[4.75rem] w-[min(720px,calc(100vw-1.5rem))] ' +
              '-translate-x-1/2 rounded-[12px] border border-[#2c3642] bg-[#0f1823] p-3'
            }
          >
            <h2 class="mt-0 mb-2 text-[0.9rem] font-[650]">설정</h2>
            <label for="post-url-input" class="mb-1 block text-[0.78rem] text-[#8b99a8]">
              요청 API 주소
            </label>
            <input
              id="post-url-input"
              class={`${FIELD_SHARED} px-[0.85rem] py-[0.6rem] text-[0.86rem]`}
              value={properties.postUrl}
              onInput={(event) => properties.onInputPostUrl(event.currentTarget.value)}
              placeholder="예: http://localhost:3040/agent"
              disabled={properties.isRunning}
              aria-label="요청 API 주소"
            />
            <label
              for="working-directory-input"
              class="mt-3 mb-1 block text-[0.78rem] text-[#8b99a8]"
            >
              CLI 작업 폴더
            </label>
            <input
              id="working-directory-input"
              class={`${FIELD_SHARED} px-[0.85rem] py-[0.6rem] text-[0.86rem]`}
              value={properties.workingDirectory}
              onInput={(event) => properties.onInputWorkingDirectory(event.currentTarget.value)}
              placeholder="/ (서버 루트)"
              disabled={properties.isRunning}
              aria-label="CLI 작업 폴더"
            />
          </section>
        </div>
      }
    />
  )
}
