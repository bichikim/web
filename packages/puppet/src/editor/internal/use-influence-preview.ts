import {getBindingInfluence, type PuppetParameterValueMap} from '../../deformation'
import {getDocumentParameterBindings} from './parameter-keyforms'
import {type Accessor, createMemo, createSignal} from 'solid-js'
import type {
  PuppetDocument,
  PuppetParameterBinding,
  PuppetParameterInfluence,
} from '../../player/document'
import {setParameterInfluences} from './parameter-influences'

interface UseInfluencePreviewProps {
  readonly parameterValues: Accessor<PuppetParameterValueMap>
  readonly document: Accessor<PuppetDocument>
  readonly binding: Accessor<PuppetParameterBinding | undefined>
}

interface InfluencePreview {
  readonly source: PuppetDocument
  readonly bindingId: string
  readonly document: PuppetDocument
}

export const useInfluencePreview = (props: UseInfluencePreviewProps) => {
  const [preview, setPreview] = createSignal<InfluencePreview | null>(null)
  const previewDocument = createMemo(() => {
    const current = preview()
    const source = props.document()
    return current?.source === source && current.bindingId === props.binding()?.id
      ? current.document
      : source
  })
  const previewInfluences = (influences: ReadonlyArray<PuppetParameterInfluence> | null) => {
    const binding = props.binding()
    if (influences === null || binding === undefined) {
      setPreview(null)
      return
    }
    const source = props.document()
    const document = setParameterInfluences({bindingId: binding.id, document: source, influences})
    if (document !== undefined) {
      setPreview({bindingId: binding.id, document, source})
    }
  }
  const influence = createMemo(() => {
    const document = previewDocument()
    const bindingId = props.binding()?.id
    const binding = getDocumentParameterBindings(document).find((item) => item.id === bindingId)
    return binding === undefined
      ? 1
      : getBindingInfluence({binding, document, parameterValues: props.parameterValues()})
  })
  return {influence, previewDocument, previewInfluences}
}
