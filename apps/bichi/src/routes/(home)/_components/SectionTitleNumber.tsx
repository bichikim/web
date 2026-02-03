export interface SectionTitleNumberProps {
  number: string
}

/** Section number label (e.g. "00", "01"). */
export function SectionTitleNumber(props: SectionTitleNumberProps) {
  return <span class="section__title-number text-6xl font-bold opacity-60">{props.number}</span>
}
