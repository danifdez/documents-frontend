<template>
  <component :is="component" :to="to || undefined" class="list-row group"
    :class="{ 'cursor-pointer text-left w-full': interactive }"
    @click="$emit('click', $event)">
    <slot />
  </component>
</template>

<script setup lang="ts">
import { computed, useAttrs } from 'vue';
import { RouterLink } from 'vue-router';

const props = defineProps<{
  to?: string | Record<string, unknown>;
  button?: boolean;
}>();

defineEmits<{
  click: [event: MouseEvent];
}>();

const attrs = useAttrs();

const component = computed(() => {
  if (props.to) return RouterLink;
  return props.button ? 'button' : 'div';
});

const interactive = computed(() => props.button || !!props.to || !!attrs.onClick);
</script>
