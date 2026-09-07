import {Show} from 'solid-js'

interface LayerContainerIconProps {
  readonly pin?: boolean
  readonly bone?: boolean
  readonly curve?: boolean
  readonly kind: 'deformer' | 'group'
}

export const LayerContainerIcon = (props: LayerContainerIconProps) => (
  <Show
    when={props.kind === 'deformer'}
    fallback={
      <span
        aria-hidden="true"
        class="puppet-icon puppet-icon-squares layer-container-icon puppet-layer-container-icon group"
        data-layer-icon="group"
      />
    }
  >
    <span
      aria-hidden="true"
      class="puppet-icon layer-container-icon puppet-layer-container-icon deformer"
      classList={{
        'puppet-icon-pin': props.pin,
        'puppet-icon-bone': props.bone,
        'puppet-icon-curve': props.curve,
        'puppet-icon-mesh': !props.curve && !props.bone && !props.pin,
      }}
      data-layer-icon="deformer"
    />
  </Show>
)
