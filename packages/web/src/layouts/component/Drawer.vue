<template>
  <q-drawer>

  </q-drawer>
</template>

<script lang="ts">
import {defineComponent, defineProps} from 'vue'
import DrawerItem from './DrawerItem.vue'

const aa = defineProps({
  title: {type: String},
  to: {type: String},
  icon: {type: String},
})

export default defineComponent({
  name: 'Drawer',
  props: {
    list: {type: Array},
  },
  setup() {
    return {

    }
  },
})
</script>

<style scoped>

</style>
