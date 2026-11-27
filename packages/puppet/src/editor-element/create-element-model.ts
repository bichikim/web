import {
  createModelBinding,
  type CreateModelBindingOptions,
} from '../editor/model/create-model-binding'
import type {ModelBinding} from '../editor/model/types'

export interface CreateElementModelOptions extends CreateModelBindingOptions {}

/** Creates a standalone model for one custom element connection. */
export const createElementModel = (options: CreateElementModelOptions): ModelBinding =>
  createModelBinding(options)
