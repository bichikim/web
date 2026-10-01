import type {JSX} from 'solid-js'

export interface CardPlaceholderProps {
  readonly children?: JSX.Element
}

export const CardPlaceholder = (props: CardPlaceholderProps) => (
  <div
    class="h-full w-full box-border rounded-[5%] border border-solid border-[#96855e]
      bg-[#142922] p-2"
  >
    <div
      class="h-full flex items-center justify-center rounded-[4%] border border-solid
        border-[#96855e80] bg-[radial-gradient(ellipse_at_center,#365043_0%,#142922_75%)]"
    >
      {props.children ?? (
        <span
          aria-hidden="true"
          class="flex size-14 items-center justify-center rounded-full border border-solid
            border-[#b9a16c80] text-[#d8b97e] sm:size-20"
        >
          <span class="i-tabler-moon-stars size-7 sm:size-10" />
        </span>
      )}
    </div>
  </div>
)
