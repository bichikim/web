<template>
  <Story>
    <div>
      <div>value {{ valueRef }}</div>
      <input :value="valueRef" @input="updateInput" />
    </div>
  </Story>
</template>

<script setup>
const props = defineProps({
  value: {type: String},
})
import {toMutRef} from '../index'

const valueRef = toMutRef(props, 'value')

const updateInput = (event) => {
  valueRef.value = event.target.value
}
</script>

<style scoped></style>
