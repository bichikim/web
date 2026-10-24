import type {Element} from '@xmldom/xmldom'
import {child, elementChildren, field, guid, resolve, scalar} from './cmo3-xml'

export interface Cmo3Keyform {
  readonly form: Element
  readonly values: ReadonlyArray<number>
}

export interface Cmo3Keyforms {
  readonly parameterGuids: ReadonlyArray<string>
  readonly forms: ReadonlyArray<Cmo3Keyform>
}

const listForms = (list: Element | undefined, references: ReadonlyMap<string, Element>) =>
  list === undefined ? [] : elementChildren(list).map((form) => resolve(form, references)!)

const keyformGrid = (source: Element, references: ReadonlyMap<string, Element>) => {
  const original = resolve(field(source, 'KeyformGridSource', 'keyformGridSource'), references)
  const axes = original === undefined ? undefined : child(original, 'array_list', 'keyformBindings')
  const extended = listForms(axes, references).some((binding) => {
    const type = child(
      binding,
      'ExtendedInterpolationType',
      'extendedInterpolationType',
    )?.getAttribute('v')
    return type !== undefined && type !== null && type !== 'LINEAR'
  })
  const forms = listForms(child(source, 'carray_list', 'keyforms'), references)
  if (!extended) {
    return {forms, grid: original}
  }
  const extensions = field(source, 'carray_list', '_extensions')
  const extension = listForms(extensions, references).find(
    (entry) => entry.tagName === 'CExtendedInterpolationExtension',
  )
  const grid =
    extension === undefined
      ? undefined
      : resolve(child(extension, 'KeyformGridSource', 'extendedKeyformGridSource'), references)
  if (grid === undefined) {
    throw new Error(
      'CMO3 extended interpolation is missing its generated keyforms; save the model in Cubism Editor first',
    )
  }
  // SDK와 같은 궤적을 유지하도록 Editor가 저장한 중간 키폼을 그대로 사용한다.
  return {
    forms: [
      ...forms,
      ...listForms(child(extension!, 'carray_list', 'normalExtendedKeyforms'), references),
    ],
    grid,
  }
}

/** 객체의 키폼과 파라미터 축 참조를 해석한다. */
export const readCmo3Keyforms = (
  source: Element,
  references: ReadonlyMap<string, Element>,
): Cmo3Keyforms => {
  const {forms, grid} = keyformGrid(source, references)
  const formsByGuid = new Map(
    forms.map((form) => [guid(field(form, 'CFormGuid', 'guid'), references), form]),
  )
  const axes = grid === undefined ? undefined : child(grid, 'array_list', 'keyformBindings')
  const bindings =
    axes === undefined
      ? []
      : elementChildren(axes).map((binding) => {
          const resolved = resolve(binding, references)
          if (resolved === undefined) {
            throw new Error('CMO3 keyform binding is missing')
          }
          const interpolation = child(
            resolved,
            'InterpolationType',
            'interpolationType',
          )?.getAttribute('v')
          if (interpolation !== undefined && interpolation !== 'LINEAR') {
            throw new Error(`CMO3 interpolation ${interpolation} is not supported`)
          }
          const parameterGuid = guid(child(resolved, 'CParameterGuid', 'parameterGuid'), references)
          const keys = child(resolved, 'array_list', 'keys')
          if (parameterGuid === undefined || keys === undefined) {
            throw new Error('CMO3 keyform binding has no parameter or keys')
          }
          return {
            guid: parameterGuid,
            source: resolved,
            values: elementChildren(keys).map((key) => scalar(key)!),
          }
        })
  const entries = grid === undefined ? undefined : child(grid, 'array_list', 'keyformsOnGrid')
  if (entries === undefined) {
    return {forms: forms.map((form) => ({form, values: []})), parameterGuids: []}
  }
  return {
    forms: elementChildren(entries).map((candidate) => {
      const entry = resolve(candidate, references)!
      const formGuid = guid(child(entry, 'CFormGuid', 'keyformGuid'), references)
      const form = formsByGuid.get(formGuid)
      const key = resolve(child(entry, 'KeyformGridAccessKey', 'accessKey'), references)
      const indices =
        key === undefined
          ? []
          : Array.from(key.getElementsByTagName('KeyOnParameter')).map(
              (entry) => resolve(entry, references)!,
            )
      if (form === undefined) {
        throw new Error('CMO3 keyform grid refers to a missing form')
      }
      const values = bindings.map((binding) => {
        const index = indices.find(
          (candidate) =>
            resolve(child(candidate, 'KeyformBindingSource', 'binding'), references) ===
            binding.source,
        )
        const keyIndex = index === undefined ? undefined : scalar(child(index, 'i', 'keyIndex'))
        const value = keyIndex === undefined ? undefined : binding.values[keyIndex]
        if (value === undefined || !Number.isFinite(value)) {
          throw new Error('CMO3 keyform grid has an invalid key index')
        }
        return value
      })
      return {form, values}
    }),
    parameterGuids: bindings.map((binding) => binding.guid),
  }
}
