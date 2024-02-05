<template>
  <Story>
    <variant>
      <div class="header" />
      <div ref="targetRef" class="target" />
      <div class="footer" />
      <h-dialog v-model="show" class="dialog" :for="targetRef">
        <div>hello world</div>
        <div>hello world</div>
        <div>hello world</div>
        <div>hello world</div>
        <div>hello world</div>
      </h-dialog>
    </variant>
  </Story>
</template>

<script setup lang="ts">
import {ref} from 'vue'
import {HDialog} from '../HDialog'
const targetRef = ref(null)
const show = ref(true)
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
