import {createWriteComputed} from '../write-computed'
import {computed as _computed, batch, signal} from '@preact/signals'
import {createRef} from '../ref'

describe('create write computed', () => {
  it('should return write able computed', () => {
    const ref = createRef(signal)
    const computed = createWriteComputed(_computed, batch)
    const fooRef = ref('foo')
    const barRef = ref('bar')
    const nameRef = computed({
      get: () => {
        return `${fooRef.value} ${barRef.value}`
      },
      set: (value: string) => {
        const [foo, bar] = value.split(' ')
        fooRef.value = foo
        barRef.value = bar
      },
    })

    expect(nameRef.value).toBe('foo bar')

    nameRef.value = 'foo1 bar1'
    expect(nameRef.value).toBe('foo1 bar1')
    expect(fooRef.value).toBe('foo1')
    expect(barRef.value).toBe('bar1')
    fooRef.value = 'foo2'
    barRef.value = 'bar2'
    expect(nameRef.value).toBe('foo2 bar2')
  })
})
