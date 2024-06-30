/**
 * @jest-environment jsdom
 */
import {useLegacyClipboard} from '../legacy'
import {mount} from '@vue/test-utils'
import {defineComponent, h, ref} from 'vue'
import {beforeEach, describe, expect, it, vi} from 'vitest'

describe('legacy', () => {
  const mock = vi.fn(() => 'bar')
  beforeEach(() => {
    const _window: any = window

    _window.document.execCommand = mock
  })
  it('should copy value', async () => {
    const Component = defineComponent({
      setup() {
        const inputValue = ref()
        const legacyClipboard = useLegacyClipboard()

        const onWrite = () => {
          legacyClipboard.write('foo')
        }

        const onRead = () => {
          inputValue.value = legacyClipboard.read()
        }

        return () =>
          h('div', [
            h('div', {id: 'value'}, inputValue.value),
            h('button', {id: 'write', onClick: onWrite}, 'write'),
            h('button', {id: 'read', onClick: onRead}, 'read'),
          ])
      },
    })

    const wrapper = mount(Component)

    await wrapper.get('#write').trigger('click')

    expect(mock).toBeCalledWith('copy')
  })
})
