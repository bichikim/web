import {defineComponent, h, withDirectives} from 'vue'
import {mount} from '@vue/test-utils'
import {provideTrackPayload, trackDirective, useTrack} from '../'

describe('analytics', () => {
  const _window: any = window
  beforeEach(() => {

    _window.dataLayer = {
      push: jest.fn(),
    }
  })
  afterEach(() => {
    _window.dataLayer = {}
  })
  describe('useTrack', () => {
    it('should use the provided payload', async () => {
      const dataLayer: any = _window.dataLayer
      const Root = defineComponent({
        setup: () => {
          provideTrackPayload({
            foo: 'foo',
          })
          return () => (
            h(Component)
          )
        },
      })

      const Component = defineComponent({
        setup: () => {
          const track = useTrack()

          const onAddPayloadTrack = () => {
            track('click', {
              bar: 'bar',
            })
          }

          const onOverrideTrack = () => {
            track('click', {
              foo: 'bar',
            })
          }

          return () => (
            h('div', [
              h('button', {id: 'add-payload', onClick: onAddPayloadTrack}, 'add-payload'),
              h('button', {id: 'override-payload', onClick: onOverrideTrack}, 'override-payload'),
            ])
          )
        },
      })

      const wrapper = mount(Root)

      await wrapper.get('#add-payload').trigger('click')

      expect(dataLayer.push).toBeCalled()
      expect(dataLayer.push).toBeCalledWith({
        bar: 'bar',
        event: 'track.click',
        foo: 'foo',
      })

      const push: jest.Mock = dataLayer.push
      push.mockRestore()

      await wrapper.get('#override-payload').trigger('click')

      expect(dataLayer.push).toBeCalled()
      expect(dataLayer.push).toBeCalledWith({
        event: 'track.click',
        foo: 'bar',
      })
    })
  })
  describe('directive', () => {
    it('should track event', async () => {
      const dataLayer: any = _window.dataLayer
      const Root = defineComponent({
        setup: () => {
          provideTrackPayload({provided: 'provided'})
          return () => (
            withDirectives(h(Component, {id: 'target'}, () => [
              'test',
            ]), [[trackDirective, {custom: 'custom'}, 'click']])
          )
        },
      })

      const Component = defineComponent({
        setup: () => {
          return () => (
            h('img', {alt: 'myAlt'})
          )
        },
      })

      const wrapper = mount(Root, {})

      expect(wrapper.get('#target').isVisible()).toBe(true)
      await wrapper.get('#target').trigger('click')

      expect(dataLayer.push).toBeCalled()
      expect(dataLayer.push).toBeCalledWith({
        alt: 'myAlt',
        altKey: false,
        ctrlKey: false,
        custom: 'custom',
        event: 'track.click',
        id: 'target',
        provided: 'provided',
        tagName: 'IMG',
        title: '',
      })
    })
  })
})
