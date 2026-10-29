import {createUniqueId, For, type JSX} from 'solid-js'
import type {useWidgetPreview} from '../features/widget-preview'
import {SIcon} from './SIcon'

interface SExpressionMenuProps {
  readonly preview: ReturnType<typeof useWidgetPreview>
}

const OPTION_CLASSES = `flex min-h-10 w-full items-center justify-between gap-3 rounded-2
  border-0 bg-transparent px-3 text-left text-xs hover:bg-lilac focus-visible:bg-lilac`

const handleToggle: JSX.EventHandler<HTMLDivElement, ToggleEvent> = (event) => {
  if (event.newState === 'open') {
    event.currentTarget.querySelector<HTMLButtonElement>('[aria-checked="true"]')?.focus()
  }
}
const handleKeyDown: JSX.EventHandler<HTMLDivElement, KeyboardEvent> = (event) => {
  const menu = event.currentTarget
  if (event.key === 'Tab') {
    menu.hidePopover()
    return
  }
  const choices = [...menu.querySelectorAll<HTMLButtonElement>('[role="menuitemradio"]')]
  const active = menu.ownerDocument.activeElement
  const current = choices.findIndex((choice) => choice === active)
  let next: number
  switch (event.key) {
    case 'ArrowDown':
      next = (current + 1) % choices.length
      break
    case 'ArrowUp':
      next = current <= 0 ? choices.length - 1 : current - 1
      break
    case 'Home':
      next = 0
      break
    case 'End':
      next = choices.length - 1
      break
    default:
      return
  }
  event.preventDefault()
  choices[next]?.focus()
}

export const SExpressionMenu = (props: SExpressionMenuProps) => {
  const menuId = `expressions-${createUniqueId()}`
  return (
    <>
      <button
        type="button"
        popovertarget={menuId}
        aria-label="표정 선택"
        aria-haspopup="menu"
        title={props.preview.expressionId() ?? '표정'}
        class="flex h-[var(--control-size)] w-[var(--control-size)] shrink-0 items-center justify-center
          rounded-full border-0 bg-transparent hover:bg-lilac"
        classList={{'bg-lilac! text-violet': props.preview.expressionId() !== null}}
      >
        <SIcon name="face" />
      </button>
      <div
        id={menuId}
        popover="auto"
        role="menu"
        aria-label="표정·행동"
        onToggle={handleToggle}
        onKeyDown={handleKeyDown}
        class="fixed left-1/2 right-auto top-auto
          bottom-[calc(max(1.25rem,env(safe-area-inset-bottom))_+_4.5rem)]
          m-0 max-h-[min(24rem,calc(100dvh-8rem))] w-[min(18rem,calc(100vw-1.5rem))]
          -translate-x-1/2 overflow-y-auto overscroll-contain rounded-5 border border-solid
          border-white/80 bg-white/95 p-2 text-ink shadow-[0_12px_40px_-12px_#35244745] backdrop-blur-xl"
      >
        <button
          type="button"
          role="menuitemradio"
          aria-checked={props.preview.expressionId() === null}
          tabIndex={props.preview.expressionId() === null ? 0 : -1}
          popovertarget={menuId}
          popovertargetaction="hide"
          onClick={() => props.preview.selectExpression(null)}
          class={OPTION_CLASSES}
          classList={{'bg-lilac! text-violet': props.preview.expressionId() === null}}
        >
          없음
          <span aria-hidden="true" classList={{'opacity-0': props.preview.expressionId() !== null}}>
            <SIcon name="check" class="h-4 w-4" />
          </span>
        </button>
        <For each={props.preview.expressionGroups}>
          {(group) => (
            <div role="group" aria-label={group.name} class="mt-3">
              <p aria-hidden="true" class="px-3 pb-1 pt-1 text-[11px] font-600 text-muted">
                {group.name}
              </p>
              <div class="pl-3">
                <For each={group.expressions}>
                  {(expression) => (
                    <button
                      type="button"
                      role="menuitemradio"
                      aria-checked={props.preview.expressionId() === expression}
                      tabIndex={props.preview.expressionId() === expression ? 0 : -1}
                      popovertarget={menuId}
                      popovertargetaction="hide"
                      onClick={() => props.preview.selectExpression(expression)}
                      class={OPTION_CLASSES}
                      classList={{
                        'bg-lilac! text-violet': props.preview.expressionId() === expression,
                      }}
                    >
                      {expression}
                      <span
                        aria-hidden="true"
                        classList={{'opacity-0': props.preview.expressionId() !== expression}}
                      >
                        <SIcon name="check" class="h-4 w-4" />
                      </span>
                    </button>
                  )}
                </For>
              </div>
            </div>
          )}
        </For>
      </div>
    </>
  )
}
