<template>
  <Story>
    <variant>
      <div
        ref="scrollRef"
        class="scroll"
        :style="{width: `${containerWidthRef}px`, height: `${containerHeightRef}px`}"
      >
        <div ref="containerRef" class="container">
          <div
            ref="itemRef"
            :style="{width: `${widthRef}px`, height: `${heightRef}px`}"
            class="item"
          />
        </div>
      </div>
      <div>{{ size }}</div>
    </variant>
    <template #controls>
      <hst-slider v-model="widthRef" :min="0" :max="200" title="width" />
      <hst-slider v-model="heightRef" :min="0" :max="200" title="height" />
      <hst-slider
        v-model="containerWidthRef"
        :min="0"
        :max="800"
        title="container width"
      />
      <hst-slider
        v-model="containerHeightRef"
        :min="0"
        :max="800"
        title="container height"
      />
    </template>
  </Story>
</template>

<script setup lang="ts">
import {ref} from 'vue'
import {useSize} from '../index'

const itemRef = ref(null)
const scrollRef = ref(null)
const size = useSize(itemRef, scrollRef)
const widthRef = ref(100)
const heightRef = ref(100)
const containerWidthRef = ref(400)
const containerHeightRef = ref(400)
</script>

<style scoped>
.scroll {
  width: 400px;
  height: 400px;
  background: #eee;
  position: relative;
  overflow: auto;
}

.container {
  position: relative;
  left: 0;
  top: 0;
  width: 10000px;
  height: 10000px;
}

.item {
  position: absolute;
  left: 400px;
  top: 400px;
  width: 50px;
  height: 50px;
  background: red;
}
</style>
