import {defineComponent, h, onMounted, ref, toRef} from 'vue'
import {HDialog} from './HDialog'
import {useLocalDialog} from './use-dialog'

export const HDialogForGlobal = defineComponent({
  props: {
    id: {type: String},
  },
  setup(props, {slots}) {
    const idRef = toRef(props, 'id')
    const elementRef = ref(null)
    const [context] = useLocalDialog(idRef)
    const handleUpdateOpen = (value: boolean) => {
      context.open(value)
    }

    onMounted(() => {
      context.element = elementRef.value
    })

    return () => {
      return h(
        HDialog,
        {modelValue: context.isOpen, 'onUpdate:modelValue': handleUpdateOpen, ref: elementRef},
        () => slots.default?.(),
      )
    }
  },
})
