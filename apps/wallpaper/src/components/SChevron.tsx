interface SChevronProps {
  readonly up?: boolean
}

export const SChevron = (props: SChevronProps) => (
  <svg
    aria-hidden="true"
    viewBox="0 0 24 24"
    class="block h-3 w-3 shrink-0 fill-none stroke-current stroke-2"
  >
    <path
      d={props.up ? 'm6 15 6-6 6 6' : 'm6 9 6 6 6-6'}
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  </svg>
)
