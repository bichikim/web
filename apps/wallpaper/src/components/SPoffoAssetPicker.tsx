import {createMemo, createSignal, type JSX, Show} from 'solid-js'
import type {SelectOption} from '../features/select'
import {SFileInput} from './SFileInput'
import {SSelect} from './SSelect'
import {SDialog} from './SDialog'

interface SPoffoAssetPickerProps {
  readonly options?: readonly SelectOption<string>[]
  readonly value?: string
  readonly selectLabel?: string
  readonly disabled?: boolean
  readonly error?: string | null
  readonly children?: JSX.Element
  readonly onChange?: (value: string) => void | Promise<void>
  readonly onFiles?: (files: readonly File[]) => void | Promise<void>
}
export const SPoffoAssetPicker = (props: SPoffoAssetPickerProps) => {
  const [open, setOpen] = createSignal(false)
  const selection = createMemo(
    () => props.options?.find((item) => item.value === props.value)?.label ?? '선택한 캐릭터 없음',
  )
  const handleOpen = (event: MouseEvent & {currentTarget: HTMLButtonElement}) => {
    event.currentTarget.focus()
    setOpen(true)
  }
  return (
    <>
      <section aria-label="Poffo 불러오기" class="grid gap-2">
        <h2 class="m-0 text-[13px] font-medium text-stone-700">Poffo 불러오기</h2>
        <div class="flex items-center gap-3 rounded-lg border border-solid border-stone-200 px-3 py-2">
          <span
            aria-hidden="true"
            class="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-stone-100 text-stone-600"
          >
            <svg
              viewBox="0 0 24 24"
              class="h-5 w-5 fill-none stroke-current [stroke-width:1.6] [stroke-linecap:round] [stroke-linejoin:round]"
            >
              <circle cx="12" cy="8" r="4" />
              <path d="M4 21v-2a8 8 0 0 1 16 0v2" />
            </svg>
          </span>
          <span title={selection()} class="min-w-0 flex-1 truncate text-[13px] text-stone-800">
            {selection()}
          </span>
          <button
            type="button"
            aria-label="Poffo 불러오기"
            class="wallpaper-file-button"
            disabled={props.disabled}
            onClick={handleOpen}
          >
            불러오기
          </button>
        </div>
      </section>
      <Show when={open()}>
        <SDialog title="Poffo 불러오기" onClose={() => setOpen(false)}>
          <div class="grid min-h-0 gap-3 overflow-y-auto overscroll-contain p-4">
            <SSelect
              label={props.selectLabel ?? '캐릭터'}
              options={props.options ?? []}
              value={props.value}
              disabled={props.disabled || props.onChange === undefined}
              onChange={props.onChange}
            />
            <SFileInput
              label="Poffo 파일 가져오기"
              accept=".json,application/json"
              disabled={props.disabled || props.onFiles === undefined}
              onFiles={props.onFiles}
            />
            <Show when={props.error}>
              {(message) => (
                <p role="alert" class="m-0 text-xs text-red-700">
                  {message()}
                </p>
              )}
            </Show>
          </div>
          <Show when={props.children}>
            {(action) => (
              <footer class="flex shrink-0 justify-end border-0 border-t border-solid border-stone-200 px-4 py-3">
                {action()}
              </footer>
            )}
          </Show>
        </SDialog>
      </Show>
    </>
  )
}
