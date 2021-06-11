<template>
  <q-layout view="lHh Lpr lFf">
    <q-footer class="bg-transparent">
      <navigation></navigation>
    </q-footer>
    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script lang="ts">
import {Navigation} from 'src/global'

import {defineComponent, ref} from 'vue'

interface LinkItem {
  title: 'home'
  icon: 'eva-home-outline'
}

export default defineComponent({
  name: 'MainLayout',

  components: {
    Navigation,
  },

  setup() {
    const leftDrawerOpen = ref(false)

    return {
      leftDrawerOpen,
      toggleLeftDrawer() {
        leftDrawerOpen.value = !leftDrawerOpen.value
      },
    }
  },
})
</script>
