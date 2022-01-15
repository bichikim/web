import {defineComponent, h} from 'vue'
import {QCard, QDialog, useDialogPluginComponent} from 'quasar'

export const SignIn = defineComponent({
  emits: [
    ...useDialogPluginComponent.emits,
  ],
  name: 'SignIn',
  render() {
    const {onDialogHide} = this
    return (
      h(QDialog, {onHide: onDialogHide, ref: 'dialogRef'}, () => [
        h(QCard, () => [
          'hello',
        ]),
      ])
    )
  },
  setup() {
    const {dialogRef, onDialogHide, onDialogOK, onDialogCancel} = useDialogPluginComponent()

    const onOKClick = () => {
      onDialogOK()
    }

    return {
      dialogRef,
      onDialogCancel,
      onDialogHide,
      onOKClick,
    }
  },
})
