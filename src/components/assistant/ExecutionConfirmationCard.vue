<template>
    <div class="mx-auto w-full max-w-xl rounded-xl border border-amber-400/50 bg-amber-50/70 p-4 dark:bg-amber-950/20">
        <div class="text-sm font-semibold text-text-primary">Confirmation required</div>
        <div class="mt-1 text-sm text-text-secondary">{{ confirmation.prompt }}</div>
        <ul v-if="confirmation.effects.length" class="mt-2 space-y-1 text-xs text-text-muted">
            <li v-for="effect in confirmation.effects" :key="`${effect.resourceKey}:${effect.description}`">
                {{ effect.description }} · {{ effect.reversible ? 'reversible' : 'not reversible' }}
            </li>
        </ul>
        <div class="mt-3 flex justify-end gap-2">
            <button class="rounded-md border border-border px-3 py-1.5 text-xs text-text-secondary"
                :disabled="resolving" @click="$emit('decide', 'denied')">
                Deny
            </button>
            <button class="rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white"
                :disabled="resolving" @click="$emit('decide', 'approved')">
                {{ resolving ? 'Saving…' : 'Approve' }}
            </button>
        </div>
    </div>
</template>

<script setup lang="ts">
import type { ExecutionConfirmation } from '../../types/ExecutionConfirmation';

defineProps<{
    confirmation: ExecutionConfirmation;
    resolving: boolean;
}>();

defineEmits<{
    decide: [decision: 'approved' | 'denied'];
}>();
</script>
