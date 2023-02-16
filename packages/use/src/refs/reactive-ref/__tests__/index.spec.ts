import {reactive, ref} from 'vue'

/**
 * reactive to ref 작동 되는지 확인 여부
 */
describe('reactive to ref', () => {
  it('should convert reactive to ref', () => {
    const fooRef = ref('foo')
    const barRef = ref('bar')
    const rootRef = ref(
      reactive({
        bar: barRef,
        foo: fooRef,
      }),
    )

    expect(rootRef.value).toEqual({
      bar: 'bar',
      foo: 'foo',
    })
    fooRef.value = 'foo1'
    expect(rootRef.value).toEqual({
      bar: 'bar',
      foo: 'foo1',
    })
  })
})
