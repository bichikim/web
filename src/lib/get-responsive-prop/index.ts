import {ResponsiveValue} from '@winter-love/style-system'
import {PropType} from 'vue'

export const getResponsiveProp = <T>() => ({type: [String, Array, Object, Number] as PropType<ResponsiveValue<T>>})
