import {Show} from 'solid-js'

interface LayerContainerIconProps {
  readonly rotation?: boolean
  readonly pin?: boolean
  readonly bone?: boolean
  readonly curve?: boolean
  readonly spatial?: boolean
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
        'puppet-icon-cube': props.spatial,
        'puppet-icon-curve': props.curve,
        'puppet-icon-mesh':
          !props.curve && !props.bone && !props.pin && !props.rotation && !props.spatial,
        'puppet-icon-pin': props.pin,
        'puppet-icon-rotation': props.rotation,
      }}
      data-layer-icon="deformer"
    />
  </Show>
)
