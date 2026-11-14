import {type Accessor, createMemo, createSignal} from 'solid-js'
import {isEqual} from 'es-toolkit/predicate'
import {
  getParameterBindingValueMap,
  type PuppetParameterValueMap,
  type PuppetParameterValues,
} from '../../deformation'
import type {ModelCommandResult} from '../model'
import type {PuppetDocument, PuppetParameterKeyformBase} from '../../player/document'
import {getParameterBinding, getParameterTargetNodeIds} from './parameter-keyforms'
import {
  applyTemporaryForm,
  createTemporaryTarget,
  readTemporaryForm,
  type TemporaryTarget,
} from './temporary-form'

interface TemporaryFormOptions {
  readonly bindingId: Accessor<string | undefined>
  readonly document: Accessor<PuppetDocument>
  readonly enabled: Accessor<boolean>
  readonly keyformValues: Accessor<PuppetParameterValues | null>
  readonly nodeId: Accessor<string | undefined>
  readonly onDocumentChange: (document: PuppetDocument) => ModelCommandResult
  readonly parameterValueMap?: Accessor<PuppetParameterValueMap>
  readonly parameterValues: Accessor<PuppetParameterValues>
}

const getTemporaryValueMap = (
  target: TemporaryTarget | undefined,
  map: PuppetParameterValueMap,
): PuppetParameterValueMap => {
  const binding =
    target === undefined ? undefined : getParameterBinding(target.document, target.bindingId)
  return binding === undefined || target === undefined
    ? map
    : {...map, ...getParameterBindingValueMap(binding, target.values)}
}

const isTargetSelected = (
  document: PuppetDocument,
  bindingId: string | undefined,
  nodeId: string | undefined,
  values: PuppetParameterValues | null,
): boolean => {
  if (bindingId === undefined || values === null) {
    return false
  }
  const binding = getParameterBinding(document, bindingId)
  return binding !== undefined && getParameterTargetNodeIds(binding).includes(nodeId ?? '')
}

const getSavedDocument = (
  options: TemporaryFormOptions,
  draft: PuppetParameterKeyformBase | undefined,
): PuppetDocument | undefined => {
  const bindingId = options.bindingId()
  const nodeId = options.nodeId()
  const values = options.keyformValues()
  if (draft === undefined || bindingId === undefined || nodeId === undefined || values === null) {
    return undefined
  }
  return applyTemporaryForm({bindingId, document: options.document(), form: draft, nodeId, values})
}

export const useTemporaryForm = (options: TemporaryFormOptions) => {
  const [forms, setForms] = createSignal<ReadonlyMap<string, PuppetParameterKeyformBase>>(new Map())
  const [editing, setEditing] = createSignal<string | null>(null)
  const [preview, setPreview] = createSignal(false)
  const pending = new Map<string, PuppetParameterKeyformBase>()
  const context = () =>
    JSON.stringify([
      options.nodeId(),
      options.bindingId(),
      options.parameterValues(),
      options.keyformValues(),
      options.enabled(),
    ])
  const form = () => forms().get(options.nodeId() ?? '')
  const selected = () =>
    isTargetSelected(
      options.document(),
      options.bindingId(),
      options.nodeId(),
      options.keyformValues(),
    )
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
  const remove = (nodeId = options.nodeId() ?? '') => {
    const next = new Map(forms())
    next.delete(nodeId)
    setForms(next)
    if (options.nodeId() === nodeId) {
      setEditing(null)
      setPreview(false)
    }
  }
  const bindingId = () => target()?.bindingId ?? options.bindingId()
  const values = () => target()?.values ?? options.keyformValues()
  const document = () => target()?.document ?? options.document()
  const targets = () => {
    const id = bindingId()
    const binding = id === undefined ? undefined : getParameterBinding(document(), id)
    return binding === undefined ? [] : getParameterTargetNodeIds(binding)
  }
  const valueMap = createMemo(
    () => getTemporaryValueMap(target(), options.parameterValueMap?.() ?? {}),
    {},
    {equals: isEqual},
  )
  return {
    bindingId,
    document,
    form,
    hasChanges: () => forms().size > 0,
    hide: () => {
      setEditing(null)
      setPreview(false)
    },
    remove,
    reset: () => {
      setForms(new Map())
      setEditing(null)
      setPreview(false)
    },
    save: () => {
      const draft = form()
      const nodeId = options.nodeId()
      if (nodeId === undefined || !selected()) {
        return false
      }
      const document = getSavedDocument(options, draft)
      if (document === undefined || draft === undefined) {
        return false
      }
      if (pending.get(nodeId) === draft) {
        return false
      }
      pending.set(nodeId, draft)
      try {
        const result = options.onDocumentChange(document)
        if (!result.ok) {
          return false
        }
        // A synchronous host notification may already have replaced or edited this local draft.
        if (forms().get(nodeId) === draft) {
          remove(nodeId)
        }
        return true
      } finally {
        if (pending.get(nodeId) === draft) {
          pending.delete(nodeId)
        }
      }
    },
    selected,
    setPreview,
    showing,
    target,
    targets,
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
    valueMap,
    values,
  }
}
