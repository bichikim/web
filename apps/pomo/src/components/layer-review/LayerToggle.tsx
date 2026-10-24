import {Checkbox} from '@kobalte/core/checkbox'
import {cx} from 'class-variance-authority'

const CONTROL_CLASSES = [
  'grid size-5 shrink-0 place-items-center rounded-1 border border-#e8c795/55',
  'bg-black/20 outline-none ui-checked:bg-#e8c795 focus-visible:shadow-focus',
].join(' ')

interface LayerToggleProps {
  readonly checked: boolean
  readonly class?: string
  readonly description: string
  readonly label: string
  readonly onChange: (checked: boolean) => void
}

export const LayerToggle = (props: LayerToggleProps) => {
  return (
    <Checkbox
      checked={props.checked}
      class={cx('flex cursor-pointer items-center justify-between gap-4 py-2.5', props.class)}
      onChange={props.onChange}
    >
      <span>
        <Checkbox.Label class="block cursor-pointer text-sm font-700 text-#fffaf1">
          {props.label}
        </Checkbox.Label>
        <Checkbox.Description class="mt-1 block text-xs leading-5 text-#a99fac">
          {props.description}
        </Checkbox.Description>
      </span>
      <Checkbox.Input />
      <Checkbox.Control class={CONTROL_CLASSES}>
        <Checkbox.Indicator class="i-tabler-check size-4 text-#241b12" />
      </Checkbox.Control>
    </Checkbox>
  )
}
