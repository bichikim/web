import {SkinningInfluenceEditor} from './SkinningInfluenceEditor'
import {SkinningConnections} from './SkinningConnections'
import {SkinningSettings} from './SkinningSettings'
import type {PuppetSkinOptions} from '../../player/document'
import {createMemo, createSignal, Show} from 'solid-js'
import {getDocumentScene, type PuppetDocument} from '../../player'
import {
  createConfiguredSkinBinding,
  getSkinFrames,
  resetSkinWeights,
} from '../../deformation/skinning'
import {findNode} from './scene-tree'
import {isSceneNodeLocked} from './scene-graph'
import {configurePartSkinning, getPartSkinTargets, setPartSkinning} from './skinning'
import {EditorButton} from '../../design-system'

interface SkinningEditorProps {
  readonly selectedNodeIds?: ReadonlyArray<string>
  readonly document: PuppetDocument
  readonly previewDocument?: PuppetDocument
  readonly partId?: string
  readonly vertexIndex?: number
  readonly onDocumentChange?: (document: PuppetDocument) => void
  readonly onEditStart?: () => void
  readonly onEditEnd?: () => void
}

const INITIAL_OPTIONS: PuppetSkinOptions = {mode: 'joint', range: 1}

const resetPartWeights = (document: PuppetDocument, partId?: string) => {
  const part = document.parts.find((part) => part.id === partId)
  return part === undefined
    ? undefined
    : resetSkinWeights(getDocumentScene(document).roots, part.id, part.mesh.vertices)
}

const bindPart = (
  document: PuppetDocument,
  partId: string | undefined,
  nodeIds: ReadonlyArray<string>,
  options: PuppetSkinOptions,
) => {
  const part = document.parts.find((candidate) => candidate.id === partId)
  return part === undefined
    ? undefined
    : createConfiguredSkinBinding({
        nodeIds,
        nodes: getDocumentScene(document).roots,
        options,
        partId: part.id,
        vertices: part.mesh.vertices,
      })
}

export const SkinningEditor = (props: SkinningEditorProps) => {
  const node = createMemo(() => {
    const found = findNode(getDocumentScene(props.document).roots, props.partId ?? '')
    return found?.kind === 'part' ? found : undefined
  })
  const binding = () => node()?.skinning
  const [initialOptions, setInitialOptions] = createSignal<PuppetSkinOptions>(INITIAL_OPTIONS)
  const options = () => binding() ?? initialOptions()
  const frames = createMemo(() => getSkinFrames(getDocumentScene(props.document).roots))
  const targets = createMemo(() =>
    getPartSkinTargets(props.document, props.partId ?? '', options().mode),
  )
  const targetNames = () =>
    targets()
      .map((id) => frames().get(id)?.node.name ?? id)
      .join(' · ')
  const locked = () =>
    props.partId === undefined ||
    isSceneNodeLocked(props.document, props.partId) ||
    props.onDocumentChange === undefined
  const update = (skinning: ReturnType<typeof binding>) => {
    const {partId} = props
    if (partId !== undefined) {
      props.onDocumentChange?.(setPartSkinning(props.document, partId, skinning))
    }
  }
  const connect = () => {
    const skinning = bindPart(
      props.previewDocument ?? props.document,
      props.partId,
      targets(),
      options(),
    )
    if (skinning !== undefined) {
      update(skinning)
    }
  }
  const configure = (next: PuppetSkinOptions) => {
    setInitialOptions(next)
    const result = configurePartSkinning(props.document, props.partId ?? '', next)
    if (result !== undefined) {
      update(result)
    }
  }
  return (
    <>
      <SkinningConnections
        document={props.document}
        nodeIds={props.selectedNodeIds ?? []}
        onDocumentChange={(document) => props.onDocumentChange?.(document)}
      />
      <Show when={node() !== undefined}>
        <fieldset class="deformer-properties" disabled={locked()}>
          <legend>회전 스키닝</legend>
          <SkinningSettings
            options={options()}
            binding={binding()}
            onChange={configure}
            onEditStart={props.onEditStart}
            onEditEnd={props.onEditEnd}
            onSyncSeams={(syncSeams) => {
              const skin = binding()
              if (skin !== undefined) {
                update({...skin, syncSeams})
              }
            }}
          />
          <Show
            when={binding()}
            fallback={
              <>
                <span>{targetNames()}</span>
                <EditorButton
                  class="mask-action-button"
                  disabled={targets().length < 2}
                  onClick={connect}
                >
                  스키닝 적용
                </EditorButton>
              </>
            }
          >
            {(skinning) => (
              <>
                <SkinningInfluenceEditor
                  document={props.document}
                  partId={props.partId}
                  binding={skinning()}
                  vertexIndex={props.vertexIndex}
                  onChange={update}
                  onEditStart={props.onEditStart}
                  onEditEnd={props.onEditEnd}
                />
                <EditorButton
                  class="mask-action-button"
                  onClick={() => {
                    const result = resetPartWeights(props.document, props.partId)
                    if (result !== undefined) {
                      update(result)
                    }
                  }}
                >
                  자동 가중치 다시 계산
                </EditorButton>
                <EditorButton class="mask-action-button" onClick={() => update(undefined)}>
                  스키닝 해제
                </EditorButton>
              </>
            )}
          </Show>
        </fieldset>
      </Show>
    </>
  )
}
