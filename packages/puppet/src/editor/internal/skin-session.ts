import {createContext, createSignal, useContext} from 'solid-js'
import {getDocumentScene, type PuppetDocument, type PuppetSkinBinding} from '../../player'
import {findNode} from './scene-tree'

export const createSkinSession = () => {
  const [partId, setPartId] = createSignal<string | null>(null)
  const [jointId, setJointId] = createSignal<string | null>(null)
  return {
    jointId,
    partId,
    setJointId,
    pick: (document: PuppetDocument, id?: string | null) => {
      if (partId() === null) {
        return false
      }
      const node = findNode(getDocumentScene(document).roots, id ?? '')
      if (node?.kind === 'deformer' && node.deformerType === 'rotation') {
        setJointId(node.id)
      }
      return true
    },
    start: (id: string) => {
      setPartId(id)
      setJointId(null)
    },
    stop: () => {
      setPartId(null)
      setJointId(null)
    },
  }
}
export const SkinSessionContext = createContext<ReturnType<typeof createSkinSession>>()
export const useSkinSession = () => useContext(SkinSessionContext)

export const useSkinSessionControls = (
  part: () => string | undefined,
  binding: () => PuppetSkinBinding | undefined,
) => {
  const session = useSkinSession()
  const [localEnabled, setLocalEnabled] = createSignal(false)
  const [localTarget, setTarget] = createSignal(0)
  return {
    enabled: () =>
      session === undefined
        ? localEnabled()
        : session.partId() !== null && session.partId() === part(),
    setEnabled: (value: boolean) => {
      setLocalEnabled(value)
      const id = part()
      if (value && id !== undefined) {
        session?.start(id)
      } else {
        session?.stop()
      }
    },
    target: () => {
      const id = session?.jointId()
      return id === undefined || id === null
        ? localTarget()
        : (binding()?.influences.findIndex((item) => item.nodeId === id) ?? -1)
    },
    setTarget,
  }
}
