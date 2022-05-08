import {useCsx} from '../'
import {computed, h, ref} from 'vue-demi'

export default {
  title: 'Hyper Components/Use Csx',
}

export const Default = () => ({
  render(this: any) {
    const {
      color,
      onNextColor,
      variantColor,
      onToggleVariant,
      // eslint-disable-next-line functional/no-this-expression
    } = this
    const csx = useCsx()
    return (
      h('div', [
        h('button', {onClick: onNextColor}, 'next color'),
        h('button', {onClick: onToggleVariant}, 'toggle variant color'),
        h('span', csx({css: {color}, linearGradient: variantColor}), 'colored text'),
      ])
    )
  },
  setup() {
    const colorTypes = {
      green: 'green',
      red: 'red',
      yellow: 'yellow',
    }

    const colorTypeNumber = ref<number>(0)
    const colorTypeKeys = Object.keys(colorTypes)
    const colorTypesCount = colorTypeKeys.length
    const variantColor = ref('')

    const onNextColor = () => {
      colorTypeNumber.value += 1
      if (colorTypeNumber.value >= colorTypesCount) {
        colorTypeNumber.value = 0
      }
    }

    const onToggleVariant = () => {
      if (variantColor.value === '') {
        variantColor.value = 'hyper'
        return
      }
      variantColor.value = ''
    }

    const colorName = computed(() => {
      return colorTypeKeys[colorTypeNumber.value]
    })

    const color = computed(() => {
      return colorTypes[colorName.value]
    })

    return {
      color,
      onNextColor,
      onToggleVariant,
      variantColor,
    }
  },
})
