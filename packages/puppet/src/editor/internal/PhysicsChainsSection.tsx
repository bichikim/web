import {Show} from 'solid-js'
import {EditorButton} from '../../design-system'
import type {PuppetDocument, PuppetPhysicsChain} from '../../player'
import {
  addPhysicsChain,
  getParameterChains,
  removePhysicsChain,
  updatePhysicsChain,
} from './physics-chains'
import {KeyedFor} from './KeyedFor'
import type {PhysicsChainsSectionProps} from './physics-chains/types'
import {PhysicsChainInputs} from './physics-chains/PhysicsChainInputs'
import {PhysicsChainPendulums} from './physics-chains/PhysicsChainPendulums'
import {PhysicsChainOutputs} from './physics-chains/PhysicsChainOutputs'
import {PhysicsChainNormalization} from './physics-chains/PhysicsChainNormalization'
import {PhysicsWorldSettings} from './physics-chains/PhysicsWorldSettings'

/** Pendulum chains whose inputs include the selected parameters, with shared world settings. */
export const PhysicsChainsSection = (props: PhysicsChainsSectionProps) => {
  const chains = () => getParameterChains(props.document, props.inputParameterIds)
  const commit = (document: PuppetDocument | undefined) => {
    if (document !== undefined && !props.disabled) {
      props.onDocumentChange?.(document)
    }
  }
  const firstInput = () => props.inputParameterIds?.[0] ?? props.document.parameters?.[0]?.id
  return (
    <>
      <div class="physics-header">
        <span>체인 {chains().length}개</span>
        <EditorButton
          class="physics-action-button"
          disabled={props.disabled || firstInput() === undefined}
          onClick={() => {
            const input = firstInput()
            commit(
              input === undefined ? undefined : addPhysicsChain(props.document, input)?.document,
            )
          }}
        >
          <span aria-hidden="true" class="puppet-icon puppet-icon-plus" />
          진자 체인 추가
        </EditorButton>
      </div>
      <KeyedFor each={chains()} key={(chain) => chain.id}>
        {(chain) => {
          const shared = {
            get chain() {
              return chain()
            },
            get disabled() {
              return props.disabled
            },
            get document() {
              return props.document
            },
            onEditEnd: props.onEditEnd,
            onEditStart: props.onEditStart,
            update: (change: (current: PuppetPhysicsChain) => PuppetPhysicsChain) =>
              commit(updatePhysicsChain(props.document, chain().id, change)),
          }
          return (
            <article class="entry-card">
              <header class="entry-card-header">
                <h3>{chain().id}</h3>
                <EditorButton
                  aria-label={`${chain().id} 체인 삭제`}
                  class="entry-remove-button"
                  disabled={props.disabled}
                  onClick={() => commit(removePhysicsChain(props.document, chain().id))}
                >
                  <span aria-hidden="true" class="puppet-icon puppet-icon-trash" />
                </EditorButton>
              </header>
              <PhysicsChainInputs {...shared} />
              <PhysicsChainPendulums {...shared} />
              <PhysicsChainOutputs {...shared} />
              <PhysicsChainNormalization {...shared} />
            </article>
          )
        }}
      </KeyedFor>
      <Show when={(props.document.physics?.chains?.length ?? 0) > 0}>
        <PhysicsWorldSettings {...props} />
      </Show>
    </>
  )
}

export type {PhysicsChainsSectionProps} from './physics-chains/types'
