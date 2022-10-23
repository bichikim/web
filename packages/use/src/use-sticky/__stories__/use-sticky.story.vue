<template>
  <story>
    <variant>
      <div ref="container" class="container">
        <div class="content" />
        <div ref="root" class="root" />
        <div ref="modal" class="modal" />
      </div>
    </variant>
  </story>
</template>

<script setup lang="ts">
import {reactive, ref, watch} from 'vue'
import {useSticky, UseStickyPosition} from '../'
const root = ref(null)
const modal = ref(null)
const container = ref(null)
const position = ref<UseStickyPosition>('bottom')
const value = useSticky(modal, root, reactive({container}))
watch(value, (value) => {
  if (modal.value && modal.value.style) {
    modal.value.style.top = `${value.y}px`
    modal.value.style.left = `${value.x}px`
    modal.value.style.minWidth = value.width ? `${value.width}px` : null
  }
})
</script>

<style scoped>
.modal {
  position: fixed;
  width: 100px;
  height: 100px;
  background-color: blue;
  opacity: 0.5;
}
.root {
  position: absolute;
  left: 500px;
  top: 500px;
  width: 300px;
  height: 50px;
  background-color: red;
}
.content {
  height: 8000px;
  width: 3000px;
  background-color: green;
}
.container {
  height: 500px;
  width: 500px;
  overflow: scroll;
  position: fixed;
  background-color: green;
  left: 0;
  top: 0;
}
</style>
