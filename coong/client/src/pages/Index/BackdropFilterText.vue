<template>
  <div class="root">
    <span>
      <slot />
    </span>
    <svg
      id="lockup-headline-mask"
      aria-hidden="true"
      class="headline lockup-headline-mask visually-hidden"
    >
      <clipPath id="lockup-headline-mask-path">
        <text
          dominant-baseline="hanging"
          text-anchor="middle"
          x="50%"
          y="0em"
          :dy="dy"
        >
          <slot />
        </text>
      </clipPath>
    </svg>
  </div>
</template>

<script lang="ts">
import {defineComponent} from 'vue'

export default defineComponent({
  props: {
    dy: {default: '0.35em', type: String},
  },
  setup() {
    return {}
  },
})
</script>

<style scoped>
  .root {
    position: relative;
  }
  .headline {
    width: 100%;
    font-size: 1em;
    font-weight: inherit;
    height: 150px;
  }
  @supports (backdrop-filter: blur(5px)) {
    .visually-hidden {
      position: absolute;
      top: -9999px;
      left: -9999px;
    }
    .root {
      backdrop-filter: var(--filter, blur(5px));
      background: var(--active-color, rgba(255, 255, 255, 0.2));
      color: transparent;
      clip-path: url(#lockup-headline-mask-path);
    }
  }

</style>
