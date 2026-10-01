import type {PreferenceOptions} from 'src/hooks/use-preference/use-preference'
import type {PreferenceStorage} from 'src/utils/preference-storage'
export type PreferenceCallbacks = Pick<PreferenceOptions<unknown>, 'onError' | 'onSaved'>
export interface StoredPreferenceOptions<Value> extends PreferenceOptions<Value> {
  readonly storage: PreferenceStorage
}
export interface PreferenceDefinition<Value> extends Omit<
  StoredPreferenceOptions<Value>,
  'onError' | 'onSaved'
> {}
/** Combines a fixed preference definition with subscriber callbacks. */
export const createPreferenceOptions =
  <Value>(fixed: PreferenceDefinition<Value>) =>
  (callbacks: PreferenceCallbacks = {}): StoredPreferenceOptions<Value> => ({
    ...fixed,
    ...callbacks,
  })
