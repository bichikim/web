<template>
  <div>
    <div class="row" :style="{marginTop: '16px'}">
      <q-space></q-space>
      <q-toggle v-model="show" :label="title" />
    </div>
    <q-slide-transition>
      <div v-show="show">
        <slot></slot>
      </div>
    </q-slide-transition>
  </div>
</template>

<script lang="ts" setup>
import {ref, defineProps, toRef} from 'vue'
const props = defineProps({
  title: {type: String, default: 'show code'}
})
const title = toRef(props, 'title')
const show = ref(false)
</script>
