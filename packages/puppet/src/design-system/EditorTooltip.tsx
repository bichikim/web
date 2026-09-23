import {useTooltip} from './use-tooltip'

export const EditorTooltip = () => {
  const tooltip = useTooltip()
  return (
    <div
      ref={tooltip.setSurface}
      id={tooltip.id}
      role="tooltip"
      popover="manual"
      hidden={!tooltip.text()}
      class="editor-tooltip"
      data-side={tooltip.side()}
      style={{
        '--editor-tooltip-anchor': tooltip.anchor,
        '--editor-tooltip-arrow-x': `${tooltip.arrow()}px`,
      }}
    >
      <span class="editor-tooltip-arrow" data-side={tooltip.side()} aria-hidden="true" />
      {tooltip.text()}
    </div>
  )
}
