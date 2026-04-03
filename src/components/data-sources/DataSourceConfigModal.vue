<template>
    <Teleport to="body">
        <Transition name="modal">
            <div v-if="isOpen"
                class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                <div
                    class="bg-surface-elevated rounded-xl shadow-2xl shadow-black/10 border border-border max-w-2xl w-full mx-4 overflow-hidden max-h-[85vh] flex flex-col">
                    <!-- Header -->
                    <div class="px-6 py-4 border-b border-border-light flex items-center justify-between shrink-0">
                        <h3 class="text-base font-semibold text-text-primary tracking-tight">Import from External Source</h3>
                        <div class="flex items-center gap-2">
                            <span v-for="(label, i) in stepLabels" :key="i"
                                class="px-2 py-0.5 rounded-full text-[10px] font-medium"
                                :class="step === i + 1
                                    ? 'bg-accent text-white'
                                    : step > i + 1
                                        ? 'bg-green-100 text-green-700'
                                        : 'bg-surface text-text-muted border border-border'">
                                {{ label }}
                            </span>
                        </div>
                    </div>

                    <!-- Body -->
                    <div class="px-6 py-5 overflow-y-auto min-h-0 flex-1">
                        <!-- Step 1: Select Provider -->
                        <div v-if="step === 1">
                            <p class="text-xs text-text-muted mb-4">Choose a data source provider</p>
                            <DataSourceProviderPicker
                                :providers="providers"
                                :selected="selectedProvider?.type"
                                @select="handleSelectProvider" />
                        </div>

                        <!-- Step 2: Configure -->
                        <div v-if="step === 2 && selectedProvider" class="space-y-5">
                            <div>
                                <label class="block text-xs font-medium text-text-secondary mb-1.5">Name *</label>
                                <input v-model="form.name" type="text"
                                    class="block w-full rounded-lg bg-surface border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
                                    :placeholder="`e.g. ${selectedProvider.displayName} data`" />
                            </div>

                            <div>
                                <label class="block text-xs font-medium text-text-secondary mb-2">Configuration</label>
                                <DynamicSchemaForm
                                    :schema="selectedProvider.configSchema"
                                    v-model="form.config" />
                            </div>

                            <div v-if="selectedProvider.credentialsSchema">
                                <label class="block text-xs font-medium text-text-secondary mb-2">
                                    Credentials
                                    <span class="text-[10px] text-text-muted font-normal ml-1">(encrypted at rest)</span>
                                </label>
                                <DynamicSchemaForm
                                    :schema="selectedProvider.credentialsSchema"
                                    v-model="form.credentials"
                                    :secret-fields="true" />
                            </div>

                            <!-- Test connection -->
                            <div class="pt-2 border-t border-border-light">
                                <button @click="handleTest"
                                    :disabled="testing"
                                    class="inline-flex items-center gap-1.5 px-3 py-1.5 border border-border text-text-secondary text-xs font-medium rounded-lg hover:bg-surface-hover transition-colors cursor-pointer disabled:opacity-40">
                                    <svg v-if="testing" class="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                                    </svg>
                                    {{ testing ? 'Testing...' : 'Test Connection' }}
                                </button>

                                <div v-if="testResult" class="mt-3 rounded-lg p-3 text-xs" :class="testResult.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'">
                                    {{ testResult.message }}
                                </div>

                                <!-- Sample data preview -->
                                <div v-if="testResult?.sampleData?.length" class="mt-3">
                                    <label class="block text-xs font-medium text-text-secondary mb-1.5">Sample data</label>
                                    <div class="overflow-x-auto border border-border rounded-lg max-h-32">
                                        <table class="w-full text-[10px]">
                                            <thead>
                                                <tr class="bg-surface border-b border-border">
                                                    <th v-for="key in sampleHeaders" :key="key"
                                                        class="px-2 py-1 text-left font-medium text-text-muted whitespace-nowrap">
                                                        {{ key }}
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody class="divide-y divide-border-light">
                                                <tr v-for="(row, i) in testResult.sampleData.slice(0, 3)" :key="i">
                                                    <td v-for="key in sampleHeaders" :key="key"
                                                        class="px-2 py-1 text-text-primary truncate max-w-[10rem]">
                                                        {{ row[key] ?? '' }}
                                                    </td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Step 3: Schedule -->
                        <div v-if="step === 3" class="space-y-5">
                            <div>
                                <label class="block text-xs font-medium text-text-secondary mb-2">Sync Schedule</label>
                                <CronSchedulePicker v-model="form.syncSchedule" />
                            </div>

                            <div>
                                <label class="block text-xs font-medium text-text-secondary mb-2">Sync Strategy</label>
                                <div class="grid grid-cols-2 gap-2">
                                    <button @click="form.syncStrategy = 'full'"
                                        class="p-3 rounded-lg border text-left transition-all cursor-pointer"
                                        :class="form.syncStrategy === 'full'
                                            ? 'border-accent bg-accent-subtle'
                                            : 'border-border hover:bg-surface-hover'">
                                        <span class="text-sm font-medium text-text-primary block">Full Refresh</span>
                                        <span class="text-[10px] text-text-muted mt-0.5 block">Replace all data on each sync</span>
                                    </button>
                                    <button @click="form.syncStrategy = 'incremental'"
                                        class="p-3 rounded-lg border text-left transition-all cursor-pointer"
                                        :class="form.syncStrategy === 'incremental'
                                            ? 'border-accent bg-accent-subtle'
                                            : 'border-border hover:bg-surface-hover'">
                                        <span class="text-sm font-medium text-text-primary block">Incremental</span>
                                        <span class="text-[10px] text-text-muted mt-0.5 block">Only add/update new records</span>
                                    </button>
                                </div>
                            </div>

                            <div v-if="form.syncStrategy === 'incremental'">
                                <label class="block text-xs font-medium text-text-secondary mb-1.5">Incremental key field</label>
                                <!-- Select from detected fields if available -->
                                <select v-if="availableFields.length > 0" v-model="form.incrementalKey"
                                    class="block w-full rounded-lg bg-surface border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent">
                                    <option value="" disabled>Select a field...</option>
                                    <option v-for="field in availableFields" :key="field" :value="field">
                                        {{ field }}
                                    </option>
                                </select>
                                <!-- Fallback text input if no test has been done -->
                                <input v-else v-model="form.incrementalKey" type="text"
                                    class="block w-full rounded-lg bg-surface border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
                                    placeholder="e.g. date, id" />
                                <p class="text-[10px] text-text-muted mt-1">
                                    Field used to detect new/updated records.
                                    <span v-if="!availableFields.length && !testResult" class="text-amber-500">Run a test connection first to see available fields.</span>
                                    <span v-if="selectedProvider?.defaultIncrementalKey && !form.incrementalKey" class="text-accent">
                                        Suggested: {{ selectedProvider.defaultIncrementalKey }}
                                    </span>
                                </p>
                            </div>

                            <!-- Summary -->
                            <div class="p-3 rounded-lg bg-surface border border-border space-y-1">
                                <p class="text-xs font-medium text-text-primary">Summary</p>
                                <p class="text-[10px] text-text-muted"><span class="text-text-secondary">Provider:</span> {{ selectedProvider?.displayName }}</p>
                                <p class="text-[10px] text-text-muted"><span class="text-text-secondary">Name:</span> {{ form.name }}</p>
                                <p class="text-[10px] text-text-muted"><span class="text-text-secondary">Schedule:</span> {{ form.syncSchedule || 'Manual only' }}</p>
                                <p class="text-[10px] text-text-muted"><span class="text-text-secondary">Strategy:</span> {{ form.syncStrategy }}</p>
                            </div>
                        </div>
                    </div>

                    <!-- Footer -->
                    <div class="px-6 py-4 border-t border-border-light flex justify-between shrink-0">
                        <Button v-if="step > 1" @click="step--" variant="secondary" size="small">Back</Button>
                        <div v-else></div>
                        <div class="flex gap-2">
                            <Button @click="handleClose" variant="secondary" size="small">Cancel</Button>
                            <Button v-if="step < 3" @click="handleNext" variant="info" size="small"
                                :disabled="!canAdvance">
                                Next
                            </Button>
                            <Button v-else @click="handleCreate" variant="info" size="small"
                                :disabled="creating">
                                {{ creating ? 'Creating...' : 'Create & Sync' }}
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </Transition>
    </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useDataSources, type DataSourceProvider } from '../../services/data-sources/useDataSources';
import Button from '../ui/Button.vue';
import DataSourceProviderPicker from './DataSourceProviderPicker.vue';
import DynamicSchemaForm from './DynamicSchemaForm.vue';
import CronSchedulePicker from './CronSchedulePicker.vue';

const props = defineProps<{
    isOpen: boolean;
    providers: DataSourceProvider[];
    projectId?: number;
}>();

const emit = defineEmits<{
    close: [];
    created: [dataSource: any];
}>();

const { createDataSource, testConnection, triggerSync } = useDataSources();

const stepLabels = ['Source', 'Configure', 'Schedule'];
const step = ref(1);
const selectedProvider = ref<DataSourceProvider | null>(null);
const testing = ref(false);
const testResult = ref<{ success: boolean; message: string; sampleData?: any[] } | null>(null);
const creating = ref(false);

const form = ref({
    name: '',
    config: {} as Record<string, any>,
    credentials: {} as Record<string, any>,
    syncSchedule: null as string | null,
    syncStrategy: 'full' as 'full' | 'incremental',
    incrementalKey: '',
});

// Reset on open
watch(() => props.isOpen, (open) => {
    if (open) {
        step.value = 1;
        selectedProvider.value = null;
        testResult.value = null;
        form.value = { name: '', config: {}, credentials: {}, syncSchedule: null, syncStrategy: 'full', incrementalKey: '' };
    }
});

const sampleHeaders = computed(() => {
    if (!testResult.value?.sampleData?.length) return [];
    return Object.keys(testResult.value.sampleData[0]);
});

const canAdvance = computed(() => {
    if (step.value === 1) return !!selectedProvider.value;
    if (step.value === 2) return form.value.name.trim().length > 0;
    return true;
});

const availableFields = computed<string[]>(() => {
    if (!testResult.value?.sampleData?.length) return [];
    return Object.keys(testResult.value.sampleData[0]);
});

const handleSelectProvider = (provider: DataSourceProvider) => {
    selectedProvider.value = provider;
    form.value.name = provider.displayName + ' data';
    form.value.config = {};
    form.value.credentials = {};
    form.value.incrementalKey = provider.defaultIncrementalKey || '';
    testResult.value = null;
    step.value = 2;
};

const handleTest = async () => {
    if (!selectedProvider.value) return;
    testing.value = true;
    testResult.value = null;
    try {
        const creds = selectedProvider.value.credentialsSchema ? form.value.credentials : undefined;
        testResult.value = await testConnection({
            providerType: selectedProvider.value.type,
            config: form.value.config,
            credentials: creds,
        });
    } catch (err: any) {
        testResult.value = { success: false, message: err.response?.data?.message || err.message || 'Test failed' };
    } finally {
        testing.value = false;
    }
};

const handleNext = () => {
    if (canAdvance.value && step.value < 3) step.value++;
};

const handleCreate = async () => {
    if (!selectedProvider.value) return;
    creating.value = true;
    try {
        const creds = selectedProvider.value.credentialsSchema && Object.keys(form.value.credentials).length > 0
            ? form.value.credentials
            : undefined;

        const ds = await createDataSource({
            name: form.value.name.trim(),
            providerType: selectedProvider.value.type,
            config: form.value.config,
            credentials: creds,
            syncSchedule: form.value.syncSchedule || undefined,
            syncStrategy: form.value.syncStrategy,
            incrementalKey: form.value.incrementalKey || undefined,
            projectId: props.projectId,
        });

        // Trigger initial sync
        try {
            await triggerSync(ds.id);
        } catch {
            // Sync might fail, but data source is created
        }

        emit('created', ds);
        emit('close');
    } catch (err: any) {
        testResult.value = { success: false, message: err.response?.data?.message || 'Failed to create data source' };
    } finally {
        creating.value = false;
    }
};

const handleClose = () => {
    emit('close');
};
</script>

<style scoped>
.modal-enter-active { transition: opacity 0.2s ease; }
.modal-leave-active { transition: opacity 0.15s ease; }
.modal-enter-from, .modal-leave-to { opacity: 0; }
</style>
