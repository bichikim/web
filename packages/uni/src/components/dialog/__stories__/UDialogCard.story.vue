<template>
  <Story>
    <variant title="target">
      <div class="header" />
      <div ref="targetRef" class="target" />
      <div class="footer" />
      <u-dialog-card
        v-model="show"
        :for="targetRef"
        :indicator="indicator"
        x-position="center"
      >
        <div>hello world</div>
        <div>hello world</div>
        <div>hello world</div>
        <div>hello world</div>
        <div>hello world</div>
      </u-dialog-card>
    </variant>
    <variant title="no target">
      <button @click="showToggle">toggle {{ show }}</button>
      <div class="header" />
      <div ref="targetRef" class="target" />
      <div class="footer" />
      <u-dialog-card v-model="show" x-position="center" y-position="center">
        <h-dialog-close>x</h-dialog-close>
        <div>hello world</div>
        <div>hello world</div>
        <div>hello world</div>
        <div>hello world</div>
        <div>hello world</div>
      </u-dialog-card>
    </variant>
    <template #controls>
      <hst-radio
        v-model="indicatorRef"
        title="indicator"
        :options="[
          'undefined',
          'none',
          'leftTop',
          'centerTop',
          'rightTop',
          'centerBottom',
          'leftBottom',
          'rightBottom',
          'startCenter',
          'endCenter',
          'endBottom',
          'endTop',
          'startTop',
          'startBottom',
        ]"
      ></hst-radio>
      <hst-checkbox v-model="show" title="show"></hst-checkbox>
    </template>
  </Story>
</template>

<script setup lang="ts">
import {computed, ref} from 'vue'
import {UDialogCard} from '../UDialogCard'
import {HDialogClose} from '../HDialogClose'
const targetRef = ref(null)
const indicatorRef = ref('undefined')
const indicator = computed(() => {
  const indicator = indicatorRef.value
  if (indicator === 'undefined') {
    return
  }
  return indicator
})
const show = ref(true)
const showToggle = () => {
  show.value = !show.value
}
</script>

<style>
.header {
  width: 200px;
  height: 1000px;
}
.footer {
  width: 200px;
  height: 1000px;
}
.target {
  width: 200px;
  height: 50px;
  background-color: red;
}
.dialog {
  background-color: blue;
  position: fixed;
}
</style>
