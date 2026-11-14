import {createResource, Show} from 'solid-js'
import type {PuppetDocument} from '@winter-love/puppet/player'
import {RuntimePage} from '../../RuntimePage'
import {WorkspaceProvider} from '../../../workspace/WorkspaceProvider'
import {createModelSession} from '../../../model/create-model-session'

interface RuntimeFixtureProps {
  readonly mode?: 'studio' | 'viewer'
  readonly loadInitialDocument: () => Promise<PuppetDocument>
}

/** Restores the host input above the runtime page, as Poffo does in production. */
export const RuntimeFixture = (props: RuntimeFixtureProps) => {
  const [document] = createResource(() => props.loadInitialDocument())
  return (
    <Show when={document()}>
      {(value) => {
        const model = createModelSession({document: value(), sessionId: 'runtime-integration'})
        return (
          <WorkspaceProvider model={model} mode={props.mode ?? 'viewer'}>
            <RuntimePage mode={props.mode} />
          </WorkspaceProvider>
        )
      }}
    </Show>
  )
}
