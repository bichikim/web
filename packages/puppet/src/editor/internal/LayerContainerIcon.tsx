import {Show} from 'solid-js'

interface LayerContainerIconProps {
  readonly rotation?: boolean
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
        'puppet-icon-bone': props.bone && !props.rotation,
        'puppet-icon-pin': props.pin,
        'puppet-icon-curve': props.curve,
        'puppet-icon-rotation': props.rotation,
        'puppet-icon-mesh': !props.curve && !props.bone && !props.pin && !props.rotation,
      }}
      data-layer-icon="deformer"
    />
  </Show>
)
