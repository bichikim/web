import {For} from 'solid-js'
import * as m from '@paraglide/message'
import type {PictureDiaryStroke} from '../../../features/picture-diary'
import {PSelect} from '../../PSelect'
import {PButton} from '../../PButton'
import {DRAWING_COLORS} from './brush-classes'

interface ToolsProps {
  readonly color: NonNullable<PictureDiaryStroke['color']>
  readonly thickness: NonNullable<PictureDiaryStroke['thickness']>
  readonly tool: 'pen' | 'eraser'
  readonly onColor: (color: NonNullable<PictureDiaryStroke['color']>) => void
  readonly onThickness: (thickness: NonNullable<PictureDiaryStroke['thickness']>) => void
  readonly onTool: (tool: 'pen' | 'eraser') => void
}

const colors = () =>
  [
    {label: m.drawing_ink(), value: 'ink'},
    {label: m.drawing_red(), value: 'red'},
    {label: m.drawing_orange(), value: 'orange'},
    {label: m.drawing_green(), value: 'green'},
    {label: m.drawing_blue(), value: 'blue'},
    {label: m.drawing_violet(), value: 'violet'},
  ] as const
const thicknesses = () =>
  [
    {label: m.drawing_thin(), value: 'thin'},
    {label: m.drawing_medium(), value: 'medium'},
    {label: m.drawing_thick(), value: 'thick'},
  ] as const
export const Tools = (props: ToolsProps) => {
  const handleColorChange = (color: NonNullable<PictureDiaryStroke['color']>) => {
    props.onColor(color)
    props.onTool('pen')
  }
  return (
    <div class="col-span-2 flex min-w-0 flex-wrap items-center justify-center gap-2 xl:col-span-1 xl:col-start-2">
      <div class="flex items-center gap-1">
        <PButton
          size="small"
          tone="secondary"
          bordered
          transparent
          class="aria-pressed:border-highlight aria-pressed:bg-secondary-soft"
          pressed={props.tool === 'pen'}
          icon="i-tabler-pencil"
          onPress={() => props.onTool('pen')}
        >
          {m.drawing_pen()}
        </PButton>
        <PButton
          size="small"
          tone="secondary"
          bordered
          transparent
          class="aria-pressed:border-highlight aria-pressed:bg-secondary-soft"
          pressed={props.tool === 'eraser'}
          icon="i-tabler-eraser"
          onPress={() => props.onTool('eraser')}
        >
          {m.drawing_eraser()}
        </PButton>
        <PSelect
          appearance="icon"
          hideLabel
          label={m.drawing_colors()}
          options={colors().map((color) => ({
            ...color,
            icon: `i-tabler-circle-filled ${DRAWING_COLORS[color.value]}`,
          }))}
          value={props.color}
          onChange={handleColorChange}
        />
      </div>
      <div role="group" aria-label={m.drawing_thickness()} class="flex gap-1">
        <For each={thicknesses()}>
          {(thickness) => (
            <PButton
              size="small"
              tone="secondary"
              bordered
              transparent
              class="aria-pressed:border-highlight aria-pressed:bg-secondary-soft"
              pressed={props.thickness === thickness.value}
              onPress={() => props.onThickness(thickness.value)}
            >
              {thickness.label}
            </PButton>
          )}
        </For>
      </div>
    </div>
  )
}
