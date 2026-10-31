import {createEffect, createMemo, createSignal, For} from 'solid-js'
import type {WebsiteWallpaper} from '@winter-love/wallpaper/settings/model'

interface SWebsiteCustomizationProps {
  readonly content: WebsiteWallpaper
  readonly busy?: boolean
  readonly onApply: (content: WebsiteWallpaper) => Promise<void>
}

export const SWebsiteCustomization = (props: SWebsiteCustomizationProps) => {
  const [css, setCss] = createSignal('')
  const [script, setScript] = createSignal('')
  const [start, setStart] = createSignal('')
  const [dom, setDom] = createSignal('')
  const loaded = {edit: setScript, id: 'load', label: '로드 완료 후 스크립트', read: script}
  const stages = [
    {edit: setStart, id: 'start', label: '페이지 시작 전 스크립트', read: start},
    {edit: setDom, id: 'dom', label: 'DOM 준비 후 스크립트', read: dom},
    loaded,
  ]
  const [stage, setStage] = createSignal(loaded)
  createEffect(() => {
    setCss(props.content.css ?? '')
    setScript(props.content.script ?? '')
    setStart(props.content.scriptStart ?? '')
    setDom(props.content.scriptDom ?? '')
  })
  const changed = createMemo(
    () =>
      css() !== (props.content.css ?? '') ||
      script() !== (props.content.script ?? '') ||
      start() !== (props.content.scriptStart ?? '') ||
      dom() !== (props.content.scriptDom ?? ''),
  )
  const handleStage = (event: Event & {currentTarget: HTMLSelectElement}) => {
    const value = event.currentTarget.value
    setStage(stages.find((entry) => entry.id === value) ?? loaded)
  }
  const handleApply = (event: SubmitEvent) => {
    event.preventDefault()
    return props.onApply({
      ...props.content,
      css: css(),
      script: script(),
      ...(start() === '' && props.content.scriptStart === undefined ? {} : {scriptStart: start()}),
      ...(dom() === '' && props.content.scriptDom === undefined ? {} : {scriptDom: dom()}),
    })
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
          스크립트 실행 시점
          <select
            class="wallpaper-field"
            aria-label="스크립트 실행 시점"
            value={stage().id}
            onChange={handleStage}
          >
            <For each={stages}>{(entry) => <option value={entry.id}>{entry.label}</option>}</For>
          </select>
        </label>
        <label class="wallpaper-label">
          {stage().label}
          <textarea
            aria-label={stage().label}
            class="wallpaper-field min-h-28 resize-y font-mono text-xs"
            rows={5}
            spellcheck={false}
            value={stage().read()}
            onInput={(event) => stage().edit(event.currentTarget.value)}
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
