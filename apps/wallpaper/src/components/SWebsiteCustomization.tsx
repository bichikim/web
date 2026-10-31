import {createEffect, createMemo, createSignal} from 'solid-js'
import type {WebsiteWallpaper} from '@winter-love/wallpaper/settings/model'

interface SWebsiteCustomizationProps {
  readonly content: WebsiteWallpaper
  readonly busy?: boolean
  readonly onApply: (content: WebsiteWallpaper) => Promise<void>
}

export const SWebsiteCustomization = (props: SWebsiteCustomizationProps) => {
  const [css, setCss] = createSignal('')
  const [script, setScript] = createSignal('')
  createEffect(() => {
    setCss(props.content.css ?? '')
    setScript(props.content.script ?? '')
  })
  const changed = createMemo(
    () => css() !== (props.content.css ?? '') || script() !== (props.content.script ?? ''),
  )
  const handleApply = (event: SubmitEvent) => {
    event.preventDefault()
    return props.onApply({...props.content, css: css(), script: script()})
  }
  return (
    <details>
      <summary class="wallpaper-disclosure">사용자 코드</summary>
      <form class="grid min-w-0 gap-3 pt-3" onSubmit={handleApply}>
        <label class="wallpaper-label">
          사용자 CSS
          <textarea
            aria-label="사용자 CSS"
            class="wallpaper-field min-h-28 resize-y font-mono text-xs"
            rows={5}
            spellcheck={false}
            value={css()}
            onInput={(event) => setCss(event.currentTarget.value)}
          />
        </label>
        <label class="wallpaper-label">
          사용자 스크립트
          <textarea
            aria-label="사용자 스크립트"
            class="wallpaper-field min-h-28 resize-y font-mono text-xs"
            rows={5}
            spellcheck={false}
            value={script()}
            onInput={(event) => setScript(event.currentTarget.value)}
          />
        </label>
        <button
          type="submit"
          class="wallpaper-file-button justify-self-start"
          disabled={props.busy || !changed()}
        >
          저장 후 새로고침
        </button>
      </form>
    </details>
  )
}
