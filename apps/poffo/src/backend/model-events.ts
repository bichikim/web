import jsonPatch, {type Operation} from 'fast-json-patch'
const {applyPatch, compare} = jsonPatch
import {cloneDeep} from 'es-toolkit'
import type {ModelView} from '@winter-love/puppet/model'
import type {PuppetDocument} from '@winter-love/puppet/player'

export interface ModelEvent {
  readonly sequence: number
  readonly view: Omit<ModelView, 'document'>
  readonly document?: PuppetDocument
  readonly patch?: ReadonlyArray<Operation>
}

/** Sends a full document on attachment and only changed fields thereafter. */
export const encodeModelEvent = (
  view: ModelView,
  sequence: number,
  previous?: ModelView,
): ModelEvent => {
  const {document, ...metadata} = view
  return previous === undefined
    ? {document, sequence, view: metadata}
    : {patch: compare(previous.document, document), sequence, view: metadata}
}

export const applyModelEvent = (previous: ModelView | undefined, event: ModelEvent): ModelView => {
  if (event.document !== undefined) {
    return {...event.view, document: event.document}
  }
  if (previous === undefined || event.patch === undefined) {
    throw new Error('Missing initial model snapshot')
  }
  const document =
    event.patch.length === 0
      ? previous.document
      : applyPatch(cloneDeep(previous.document), [...event.patch], true, true, true).newDocument
  return {...event.view, document}
}
