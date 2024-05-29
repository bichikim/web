/**
 * @vitest-environment jsdom
 */
import {useTheme, useThemeName} from '../'
import {defineComponent, h} from 'vue'
import {mount} from '@vue/test-utils'
import {describe, it, expect, vi} from 'vitest'
describe.skip('theme', () => {
  const Children = defineComponent({
    setup() {
      const themeName = useThemeName()

      const toggleThemeName = () => {
        themeName.value === 'dark'
          ? (themeName.value = 'light')
          : (themeName.value = 'dark')
      }
      return () => h('button', {onClick: toggleThemeName})
    },
  })
  const Component = defineComponent({
    setup() {
      useTheme()

      return () => h(Children)
    },
  })

  describe('useTheme', () => {
    it('should ', () => {
      mount(Component)
      expect(document.body.className).toBe('light-theme')
    })
  })
})
