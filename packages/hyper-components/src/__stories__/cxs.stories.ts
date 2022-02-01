import {useClassName} from '../'
import {computed, h, ref} from 'vue'

export default {
  title: 'HyperComponents/className(csx)',
}

export const Default = () => ({
  render(this: any) {
    const {
      color,
      onNextColor,
      variantColor,
      onToggleVariant,
    } = this
    const csx = useClassName()
    const exampleStyle = (color: string, variantColor) => csx({
      color,
    }, {
      linearGradient: variantColor,
    })
    return (
      h('div', [
        h('button', {onClick: onNextColor}, 'next color'),
        h('button', {onClick: onToggleVariant}, 'toggle variant color'),
        h('span', {class: exampleStyle(color, variantColor)}, 'colored text'),
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
