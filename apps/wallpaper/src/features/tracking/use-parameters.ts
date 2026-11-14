import {type Accessor, createResource, createSignal} from 'solid-js'
import {modelParameters} from './model-parameters'
import {SAMPLE_PUPPET_ID} from '../background/constants'
import type {TrackingParameter} from './types'
import {modelActions} from '../semantics/model-actions'
import type {CharacterAction} from '../semantics/types'

export interface ParameterSource {
  readonly actions?: Accessor<readonly CharacterAction[]>
  readonly error: Accessor<string | null>
  readonly loading: Accessor<boolean>
  readonly parameters: Accessor<readonly TrackingParameter[]>
}

interface UseParametersProps {
  readonly assetId: Accessor<string | null>
  readonly enabled: Accessor<boolean>
  readonly load: (id: string) => Promise<string | Blob>
}
export const useParameters = (props: UseParametersProps): ParameterSource => {
  const [error, setError] = createSignal<string | null>(null)
  const [parameters] = createResource(
    () => props.enabled() && props.assetId(),
    async (id) => {
      setError(null)
      try {
        const {preparePuppetDocument, createDemoDocument} =
          await import('@winter-love/puppet/player')
        const prepared = await preparePuppetDocument(
          id === SAMPLE_PUPPET_ID
            ? {document: createDemoDocument()}
            : {source: await props.load(id)},
        )
        if (!prepared.ok) {
          throw new Error('Invalid Poffo document')
        }
        return {
          actions: modelActions(prepared.document),
          parameters: modelParameters(prepared.document),
        }
      } catch (cause) {
        console.error('Poffo parameters could not be loaded', cause)
        setError('파라미터를 불러올 수 없어요.')
        return {actions: [], parameters: []}
      }
    },
    {initialValue: {actions: [], parameters: []}},
  )
  return {
    actions: () => parameters().actions,
    error,
    loading: () => parameters.loading,
    parameters: () => parameters().parameters,
  }
}
