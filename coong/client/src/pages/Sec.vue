<template>
  <div>
    <q-list>
      <q-item>
        <q-item-section>
          <q-item-label>hello</q-item-label>
          <q-item-label
            v-css="{color: 'green'}"
            caption
          >
            greeting
          </q-item-label>
        </q-item-section>
        <q-item-section side>
          <q-toggle v-model="toggle" />
        </q-item-section>
      </q-item>
    </q-list>
    <box :css="{bg: 'green', color: 'red', p: '20px'}">
      <box>sec red</box>
    </box>
    <router-link to="/">
      <q-btn>
        gogo
      </q-btn>
    </router-link>
    <div>{{ userName }}</div>
    <div
      v-for="item in postList"
      :key="item.id"
    >
      id {{ item.id }}
    </div>
    <q-btn @click="addItem" v-css="{bg: '$red1'}" v-css:bp2="{bg: 'green'}">
      add Item
    </q-btn>
    <q-btn @click="addName">
      add Name
    </q-btn>
    <q-btn @click="setBucketName">
      set Name
    </q-btn>
  </div>
</template>
<script lang="ts" setup>
import {user} from 'src/store/user'
import {setName} from 'src/store/bucket'
import {Box} from 'src/components/Box'
import {posts} from 'src/store/posts'
import {computed, ref} from 'vue'
const userName = computed(() => {
  return user.name
})
const postList = computed(() => {
  return posts.list
})
const addItem = () => {
  posts.$.addItem({id: `add ${postList.value.length}`})
}
const addName = () => {
  user.name += '1'
}
const setBucketName = () => {
  setName.$('add')
}
const toggle = ref(false)
</script>
