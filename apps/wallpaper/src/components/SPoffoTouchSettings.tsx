import {localizeMessage, text as uiText} from '../features/localization'
import {createMemo, createSignal, Show} from 'solid-js'
import {DEFAULT_POFFO_TOUCH, type PoffoTouch} from '@winter-love/wallpaper/settings/touch'
import type {ParameterSource} from '../features/tracking/use-parameters'
import {useTouchEditor} from '../features/touch'
import {SPoffoTouchOptions} from './SPoffoTouchOptions'
import {SPoffoTouchParameterPicker} from './SPoffoTouchParameterPicker'
import {SPoffoTouchParameter} from './SPoffoTouchParameter'
import {SPoffoJointChain} from './SPoffoJointChain'
import {SSettingsEditor} from './SSettingsEditor'

interface SPoffoTouchSettingsProps {
  readonly source: ParameterSource
  readonly value?: PoffoTouch
  readonly onChange?: (value: PoffoTouch) => void | Promise<void>
}

export const SPoffoTouchSettings = (props: SPoffoTouchSettingsProps) => {
  const [selected, setSelected] = createSignal<string | null>(null)
  const [panel, setPanel] = createSignal<HTMLElement | null>(null)
  const value = () => props.value ?? DEFAULT_POFFO_TOUCH
  const disabled = () => props.onChange === undefined || props.source.loading()
  const editor = useTouchEditor({
    get onChange() {
      return props.onChange
    },
    get source() {
      return props.source
    },
    value,
  })
  const actions = (edit: (id: string) => void | Promise<void>) => {
    const handleAdd = async () => {
      const id = await editor.addChain()
      await edit(id)
      const field = panel()?.querySelector<HTMLInputElement>(
        `input[aria-label=${JSON.stringify(uiText('관절 연결 이름'))}]`,
      )
      field?.focus()
      field?.select()
    }
    return (
      <div class="flex min-w-0 flex-1 flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={handleAdd}
          disabled={disabled()}
          class="wallpaper-file-button disabled:cursor-default disabled:opacity-50"
        >
          {uiText('+ 관절 연결')}
        </button>
        <div class="min-w-0 flex-1 basis-44">
          <SPoffoTouchParameterPicker
            parameters={editor.available()}
            disabled={disabled()}
            onSelect={editor.addParameter}
          />
        </div>
      </div>
    )
  }
  const renderDetail = (id: string) => {
    const item = createMemo(() => editor.items().find((item) => item.value === id))
    const chain = () => {
      const current = item()
      return current?.kind === 'chain' ? current.chain : null
    }
    const parameter = () => {
      const current = item()
      return current?.kind === 'parameter' ? current.parameter : null
    }
    return (
      <>
        <Show when={chain()}>
          {(chain) => (
            <SPoffoJointChain
              value={chain()}
              parameters={props.source.touchParameters?.() ?? []}
              disabled={disabled()}
              onChange={editor.configureChain}
              onRemove={() => editor.removeChain(chain().id)}
            />
          )}
        </Show>
        <Show when={parameter()}>
          {(parameter) => (
            <SPoffoTouchParameter
              parameter={parameter()}
              value={value().parameters?.[parameter().id]}
              disabled={disabled()}
              onChange={(binding) => editor.configureParameter(parameter().id, binding)}
              onRemove={() => editor.removeParameter(parameter().id)}
            />
          )}
        </Show>
      </>
    )
  }
  return (
    <section
      ref={setPanel}
      aria-label={uiText('캐릭터 터치')}
      class="grid min-w-0 gap-3 text-[13px]"
    >
      <Show when={selected() === null}>
        <SPoffoTouchOptions value={props.value} onChange={props.onChange} />
      </Show>
      <Show when={value().enabled}>
        <Show when={props.source.error()}>
          {(message) => (
            <p role="alert" class="m-0 text-xs text-red-700">
              {localizeMessage(message() ?? '')}
            </p>
          )}
        </Show>
        <SSettingsEditor
          label={uiText('터치')}
          options={editor.items()}
          searchable
          actions={actions}
          onSelect={setSelected}
        >
          {renderDetail}
        </SSettingsEditor>
      </Show>
    </section>
  )
}
