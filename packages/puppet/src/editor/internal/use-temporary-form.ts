import {type Accessor, createMemo, createSignal} from 'solid-js'
import type {PuppetParameterValueMap, PuppetParameterValues} from '../../deformation'
import type {PuppetDocument, PuppetParameterKeyformBase} from '../../player/document'
import {getParameterBinding, getParameterTargetNodeIds} from './parameter-keyforms'
import {applyTemporaryForm, createTemporaryTarget, readTemporaryForm} from './temporary-form'

interface TemporaryFormOptions {
  readonly bindingId: Accessor<string | undefined>
  readonly document: Accessor<PuppetDocument>
  readonly enabled: Accessor<boolean>
  readonly keyformValues: Accessor<PuppetParameterValues | null>
  readonly nodeId: Accessor<string | undefined>
  readonly onDocumentChange: (document: PuppetDocument) => void
  readonly parameterValueMap?: Accessor<PuppetParameterValueMap>
  readonly parameterValues: Accessor<PuppetParameterValues>
}

export const useTemporaryForm = (options: TemporaryFormOptions) => {
  const [forms, setForms] = createSignal<ReadonlyMap<string, PuppetParameterKeyformBase>>(new Map())
  const [editing, setEditing] = createSignal<string | null>(null)
  const [preview, setPreview] = createSignal(false)
  const context = () =>
    JSON.stringify([
      options.nodeId(),
      options.bindingId(),
      options.parameterValues(),
      options.keyformValues(),
      options.enabled(),
    ])
  const form = () => forms().get(options.nodeId() ?? '')
  const selected = () => {
    const id = options.bindingId()
    const binding = id === undefined ? undefined : getParameterBinding(options.document(), id)
    return (
      options.keyformValues() !== null &&
      binding !== undefined &&
      getParameterTargetNodeIds(binding).includes(options.nodeId() ?? '')
    )
  }
  const showing = () =>
    options.enabled() &&
    form() !== undefined &&
    (preview() || (!selected() && editing() === context()))
  const target = createMemo(() => {
    const nodeId = options.nodeId()
    if (!options.enabled() || nodeId === undefined || (selected() && !preview())) {
      return undefined
    }
    const target = createTemporaryTarget({
      bindingId: options.bindingId(),
      document: options.document(),
      nodeId,
      values: options.parameterValues(),
    })
    const draft = form()
    if (target === undefined || draft === undefined || !showing()) {
      return target
    }
    const document = applyTemporaryForm({...target, form: draft, nodeId})
    return document === undefined ? target : {...target, document}
  })
  const remove = () => {
    const next = new Map(forms())
    next.delete(options.nodeId() ?? '')
    setForms(next)
    setEditing(null)
    setPreview(false)
  }
  const bindingId = () => target()?.bindingId ?? options.bindingId()
  const values = () => target()?.values ?? options.keyformValues()
  const document = () => target()?.document ?? options.document()
  const targets = () => {
    const id = bindingId()
    const binding = id === undefined ? undefined : getParameterBinding(document(), id)
    return binding === undefined ? [] : getParameterTargetNodeIds(binding)
  }
  const valueMap = () => {
    const current = target()
    const binding =
      current === undefined ? undefined : getParameterBinding(current.document, current.bindingId)
    const map = options.parameterValueMap?.() ?? {}
    return binding === undefined || current === undefined
      ? map
      : {
          ...map,
          ...Object.fromEntries(
            binding.parameterIds.map((id, index) => [id, current.values[index]]),
          ),
        }
  }
  return {
    bindingId,
    document,
    form,
    hide: () => {
      setEditing(null)
      setPreview(false)
    },
    targets,
    remove,
    valueMap,
    reset: () => {
      setForms(new Map())
      setEditing(null)
      setPreview(false)
    },
    values,
    save: () => {
      const draft = form()
      const bindingId = options.bindingId()
      const nodeId = options.nodeId()
      const values = options.keyformValues()
      if (
        draft === undefined ||
        bindingId === undefined ||
        nodeId === undefined ||
        values === null ||
        !selected()
      ) {
        return false
      }
      const document = applyTemporaryForm({
        bindingId,
        document: options.document(),
        form: draft,
        nodeId,
        values,
      })
      if (document === undefined) {
        return false
      }
      options.onDocumentChange(document)
      remove()
      return true
    },
    selected,
    setPreview,
    showing,
    target,
    update: (document: PuppetDocument) => {
      const current = target()
      const nodeId = options.nodeId()
      if (current === undefined || nodeId === undefined) {
        options.onDocumentChange(document)
        return
      }
      const draft = readTemporaryForm({...current, document, nodeId})
      const previous = readTemporaryForm({...current, nodeId})
      if (JSON.stringify(draft) === JSON.stringify(previous)) {
        const source = options.document()
        options.onDocumentChange({
          ...document,
          parameterBindings: source.parameterBindings,
          parameters: source.parameters,
        })
        return
      }
      if (draft !== undefined) {
        setForms(new Map(forms()).set(nodeId, draft))
        setEditing(context())
      }
    },
  }
}
