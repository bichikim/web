<template>
  <div>
    <div>foo {{ foo }}</div>
    <div>wrapped foo {{ wrappedFoo }}</div>
    <div>unbind wrapped foo {{ unbindWrappedFoo }}</div>
    <div>computed foo {{ computedFoo }}</div>
    <div>computed wrapped foo {{ wrappedComputedFoo }}</div>
    <button @click="() => (foo += 1)">increase foo</button>
    <button @click="() => (wrappedFoo += 1)">increase wrapped foo</button>
    <button @click="() => (unbindWrappedFoo += 1)">increase unbind wrapped foo</button>
    <button @click="() => (wrappedComputedFoo += 1)">increase wrapped computed foo</button>
  </div>
</template>
<script setup>
import {computed, ref} from 'vue'
import {wrapRef} from '@winter-love/use'

const foo = ref(0)
const wrappedFoo = wrapRef(foo)
const unbindWrappedFoo = wrapRef(foo, {bindValue: false})
const computedFoo = computed(() => foo.value * 2)
const wrappedComputedFoo = wrapRef(computedFoo)
</script>
