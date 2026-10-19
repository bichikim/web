import type {PuppetBreathParameter, PuppetDocument, PuppetLookParameter} from '../../player'
import {addBreathParameter, removeBreathParameter, updateBreathParameter} from './breath'
import {addLookParameter, removeLookParameter, updateLookParameter} from './look'

/** A numeric field of an effect entry. */
export interface ParameterEffectField<Key extends string> {
  readonly key: Key
  readonly label: string
  readonly minimum?: number
  readonly unit?: string
}

/**
 * A list of automatic effects that each drive one parameter, such as breathing and looking:
 * the entries of a document and the edits the inspector offers on them.
 */
export interface ParameterEffect<
  Key extends string,
  Entry extends {readonly parameterId: string} & Readonly<Record<Key, number>>,
> {
  readonly add: (document: PuppetDocument) => PuppetDocument | undefined
  readonly addLabel: string
  readonly class: string
  readonly entries: (document: PuppetDocument) => ReadonlyArray<Entry>
  readonly fields: ReadonlyArray<ParameterEffectField<Key>>
  /** Prefix of each entry's control labels, followed by its 1-based number. */
  readonly label: string
  /** Prefix of each entry's field names. */
  readonly name: string
  readonly remove: (document: PuppetDocument, index: number) => PuppetDocument
  /** Sets entry `index`'s field `key`; `undefined` when refused. */
  readonly setField: (
    document: PuppetDocument,
    index: number,
    key: Key,
    value: number,
  ) => PuppetDocument | undefined
  /** Moves entry `index` to `parameterId`; `undefined` when refused. */
  readonly setParameter: (
    document: PuppetDocument,
    index: number,
    parameterId: string,
  ) => PuppetDocument | undefined
  readonly title: string
  /** How the entries change their parameters, shown as the group's tooltip. */
  readonly tooltip: string
}

const STEP_MINIMUM = 0.1

/** Automatic breathing (Cubism's Breath): added after motions and before physics. */
export const BREATH_EFFECT: ParameterEffect<
  'offset' | 'peak' | 'period' | 'weight',
  PuppetBreathParameter
> = {
  add: addBreathParameter,
  addLabel: '호흡 파라미터 추가',
  class: 'breath-properties',
  entries: (document) => document.breath ?? [],
  fields: [
    {key: 'offset', label: '중심'},
    {key: 'peak', label: '진폭'},
    {key: 'period', label: '주기', minimum: STEP_MINIMUM, unit: 's'},
    {key: 'weight', label: '가중치'},
  ],
  label: '호흡',
  name: 'breath',
  remove: removeBreathParameter,
  setField: (document, index, key, value) => updateBreathParameter(document, index, {[key]: value}),
  setParameter: (document, index, parameterId) =>
    updateBreathParameter(document, index, {parameterId}),
  title: '자동 호흡',
  tooltip: '값 += (중심 + 진폭 · sin(2π · 시간 / 주기)) · 가중치. 모션 다음, 물리 전에 더합니다.',
}

/**
 * Parameters that follow where the model looks (Cubism's Look), for the look point `(X, Y)` in
 * `-1..1` (x right, y up): added after motions and before breathing.
 */
export const LOOK_EFFECT: ParameterEffect<'x' | 'xy' | 'y', PuppetLookParameter> = {
  add: addLookParameter,
  addLabel: '시선 파라미터 추가',
  class: 'look-properties',
  entries: (document) => document.look ?? [],
  fields: [
    {key: 'x', label: 'X 계수'},
    {key: 'y', label: 'Y 계수'},
    {key: 'xy', label: 'XY 계수'},
  ],
  label: '시선',
  name: 'look',
  remove: removeLookParameter,
  setField: (document, index, key, value) => updateLookParameter(document, index, {[key]: value}),
  setParameter: (document, index, parameterId) =>
    updateLookParameter(document, index, {parameterId}),
  title: '시선 따라가기',
  tooltip:
    '값 += X 계수 · X + Y 계수 · Y + XY 계수 · X · Y (X, Y는 -1~1, 오른쪽·위가 +). 모션 다음, 호흡 전에 더합니다.',
}
