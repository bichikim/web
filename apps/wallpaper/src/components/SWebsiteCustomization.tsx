import {text as uiText} from '../features/localization'
import {createEffect, createMemo, createSignal, on} from 'solid-js'
import type {WebsiteWallpaper} from '@winter-love/wallpaper/settings/model'
import {SSelect} from './SSelect'

interface SWebsiteCustomizationProps {
  readonly content: WebsiteWallpaper
  readonly monitorId?: string
  readonly busy?: boolean
  readonly onApply: (content: WebsiteWallpaper) => Promise<void>
}

export const SWebsiteCustomization = (props: SWebsiteCustomizationProps) => {
  const [css, setCss] = createSignal('')
  const [script, setScript] = createSignal('')
  const [start, setStart] = createSignal('')
  const [dom, setDom] = createSignal('')
  const loaded = {
    edit: setScript,
    id: 'load',
    get label() {
      return uiText('로드 완료 후 스크립트')
    },
    read: script,
  }
  const stages = [
    {
      edit: setStart,
      id: 'start',
      get label() {
        return uiText('페이지 시작 전 스크립트')
      },
      read: start,
    },
    {
      edit: setDom,
      id: 'dom',
      get label() {
        return uiText('DOM 준비 후 스크립트')
      },
      read: dom,
    },
    loaded,
  ]
  const [stage, setStage] = createSignal(loaded)
  createEffect(
    on(
      () => ({content: props.content, monitorId: props.monitorId}),
      (next, previous) => {
        const reset =
          previous === undefined ||
          next.monitorId !== previous.monitorId ||
          next.content.url !== previous.content.url
        setCss((draft) =>
          reset || draft === (previous?.content.css ?? '') ? (next.content.css ?? '') : draft,
        )
        setScript((draft) =>
          reset || draft === (previous?.content.script ?? '') ? (next.content.script ?? '') : draft,
        )
        setStart((draft) =>
          reset || draft === (previous?.content.scriptStart ?? '')
            ? (next.content.scriptStart ?? '')
            : draft,
        )
        setDom((draft) =>
          reset || draft === (previous?.content.scriptDom ?? '')
            ? (next.content.scriptDom ?? '')
            : draft,
        )
      },
    ),
  )
  const changed = createMemo(
    () =>
      css() !== (props.content.css ?? '') ||
      script() !== (props.content.script ?? '') ||
      start() !== (props.content.scriptStart ?? '') ||
      dom() !== (props.content.scriptDom ?? ''),
  )
  const handleStage = (value: string) => {
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
    <details class="wallpaper-disclosure-panel">
      <summary class="wallpaper-disclosure">{uiText('사용자 코드')}</summary>
      <form class="wallpaper-disclosure-content" onSubmit={handleApply}>
        <label class="wallpaper-label">
          {uiText('사용자 CSS')}
          <textarea
            aria-label={uiText('사용자 CSS')}
            class="wallpaper-field min-h-28 resize-y font-mono text-xs"
            rows={5}
            spellcheck={false}
            value={css()}
            onInput={(event) => setCss(event.currentTarget.value)}
          />
        </label>
        <div class="wallpaper-label">
          <span>{uiText('스크립트 실행 시점')}</span>
          <SSelect
            label={uiText('스크립트 실행 시점')}
            value={stage().id}
            options={stages.map((entry) => ({label: entry.label, value: entry.id}))}
            onChange={handleStage}
          />
        </div>
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
          {uiText('저장 후 새로고침')}
        </button>
      </form>
    </details>
  )
}
