/**
 * sfc 에서 컴포넌트를 많들지 않을때 유용한 Slot 함수 입니다
 * @example
 * import {defineComponent, h} from 'vue'
 * const Foo = defineComponent({
 *   setup(_, {slots}) {
 *     return () => h('div', [
 *       slot('foo', slots, {slotDefault: 'default slot'}),
 *     ])
 *   }
 * })
 */

export interface SlotOptions {
  args?: any[]
  slotDefault?: any
}
export const slot = (name: string, slots: any, options: SlotOptions = {}) => {
  const {slotDefault, args = []} = options
  const slot = slots[name]

  return slot ? slot(...args) : (slotDefault ?? null)
}
