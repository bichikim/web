import {For, Show} from 'solid-js'
import {Portal} from 'solid-js/web'
import {ToggleButton} from '@kobalte/core/toggle-button'
import {EditorNumberField} from '../../design-system'
import type {useGridBrush} from './use-grid-brush'
import type {GridBrushMode} from './apply-grid-brush'

interface GridBrushControlsProps {
  readonly brush: ReturnType<typeof useGridBrush>
  readonly brushControlsExternal?: boolean
  readonly brushControlsMount?: HTMLDivElement
  readonly brushSettingsMount?: HTMLDivElement
  readonly disabled?: boolean
}

const modes: ReadonlyArray<{
  value: GridBrushMode | 'select'
  label: string
  name: string
  title: string
  icon: string
}> = [
  {
    icon: 'puppet-icon puppet-icon-pointer',
    label: '제어점 선택',
    name: '디포머 제어점 선택',
    title: '제어점을 개별 선택하고 이동합니다.',
    value: 'select',
  },
  {
    icon: 'puppet-icon puppet-icon-brush',
    label: '변형 브러시',
    name: '디포머 변형 브러시',
    title: '반경 안의 제어점을 드래그 방향으로 움직입니다.',
    value: 'move',
  },
  {
    icon: 'puppet-icon puppet-icon-maximize',
    label: '팽창·수축',
    name: '디포머 팽창·수축 브러시',
    title: '오른쪽 드래그는 팽창, 왼쪽이나 Shift 드래그는 수축합니다.',
    value: 'expand',
  },
  {
    icon: 'puppet-icon puppet-icon-mesh',
    label: '격자 정리',
    name: '격자 정리 브러시',
    title: '내부 제어점을 정리합니다. 바깥 경계는 유지합니다.',
    value: 'smooth',
  },
]

export const GridBrushControls = (props: GridBrushControlsProps) => {
  const fieldLabel = () => (props.brush.mode() === 'smooth' ? '격자 정리 브러시' : '디포머 브러시')
  const selector = (
    <div
      class="editor-control editor-segmented-field deform-brush-toolbar"
      data-control-size="md"
      data-size="md"
      role="group"
      aria-label="디포머 브러시 선택"
    >
      <For each={modes}>
        {(mode) => (
          <ToggleButton
            type="button"
            aria-label={mode.name}
            pressed={props.brush.mode() === mode.value}
            disabled={props.disabled || (mode.value === 'smooth' && !props.brush.canSmooth())}
            title={mode.title}
            onClick={() => props.brush.setMode(mode.value)}
          >
            <span class={mode.icon} aria-hidden="true" />
            <span class="editor-segmented-label" aria-hidden="true">
              {mode.label}
            </span>
          </ToggleButton>
        )}
      </For>
    </div>
  )
  const settings = (
    <Show when={props.brush.enabled()}>
      <fieldset
        class="deform-brush-settings"
        aria-label="디포머 브러시 설정"
        disabled={props.disabled}
      >
        <label>
          반경
          <EditorNumberField
            label={`${fieldLabel()} 반경`}
            minimum={1}
            maximum={props.brush.maximumRadius()}
            maximumFractionDigits={2}
            value={props.brush.radius()}
            onValueChange={props.brush.setRadius}
          />
        </label>
        <label>
          강도
          <EditorNumberField
            label={`${fieldLabel()} 강도`}
            minimum={1}
            maximum={100}
            maximumFractionDigits={2}
            unit="%"
            value={props.brush.strength()}
            onValueChange={props.brush.setStrength}
          />
        </label>
        <Show when={props.brush.mode() !== 'smooth'}>
          <label>
            경도
            <EditorNumberField
              label="디포머 브러시 경도"
              minimum={0}
              maximum={100}
              maximumFractionDigits={2}
              unit="%"
              value={props.brush.hardness()}
              onValueChange={props.brush.setHardness}
            />
          </label>
        </Show>
      </fieldset>
    </Show>
  )
  return (
    <Show when={props.brush.available()}>
      <Show
        when={props.brushControlsMount}
        fallback={<Show when={!props.brushControlsExternal}>{selector}</Show>}
      >
        {(mount) => <Portal mount={mount()}>{selector}</Portal>}
      </Show>
      <Show when={props.brushSettingsMount} fallback={settings}>
        {(mount) => <Portal mount={mount()}>{settings}</Portal>}
      </Show>
    </Show>
  )
}
