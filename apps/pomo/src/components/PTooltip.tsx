import {
  HTooltipContent,
  HTooltipRoot,
  HTooltipTrigger,
  type HTooltipTriggerProps,
  TOOLTIP_SURFACE_CLASSES,
} from './tooltip'

export interface PTooltipProps extends HTooltipTriggerProps {}

export const PTooltip = (props: PTooltipProps) => (
  <HTooltipRoot>
    <HTooltipTrigger label={props.label}>{props.children}</HTooltipTrigger>
    <HTooltipContent class={TOOLTIP_SURFACE_CLASSES}>{props.label}</HTooltipContent>
  </HTooltipRoot>
)
