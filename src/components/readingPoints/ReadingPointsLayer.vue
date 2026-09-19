<template>
    <Teleport to="body">
        <div class="rp-layer" data-reading-point-ui>
            <div v-for="marker in markers" :key="marker.point.id" class="rp-line"
                :class="marker.point.kind === 'reading' ? 'rp-line-reading' : 'rp-line-section'"
                :style="{ top: marker.top + 'px', left: marker.left + 'px', width: marker.width + 'px' }">
                <a class="rp-label" :class="marker.point.kind === 'reading' ? 'rp-label-reading' : 'rp-label-section'"
                    href="#" draggable="false" @click.prevent="openPoint(marker.point)"
                    @contextmenu.prevent="openLabelMenu($event, marker.point)">
                    {{ labelFor(marker.point) }}
                </a>
            </div>
        </div>

        <div v-if="resumeVisible" class="rp-resume" data-reading-point-ui>
            <span class="rp-resume-text">Dejaste esta página a medias.</span>
            <button class="rp-resume-primary" @click="resumeReading">Continuar donde lo dejaste</button>
            <button class="rp-resume-secondary" @click="dismissResume">Ahora no</button>
        </div>

        <div v-if="labelMenu.visible" class="rp-menu" data-reading-point-ui
            :style="{ left: labelMenu.x + 'px', top: labelMenu.y + 'px' }">
            <button class="rp-menu-item" @click="openPoint(labelMenu.point!)">Ir al punto</button>
            <button v-if="labelMenu.point?.kind === 'section'" class="rp-menu-item"
                @click="openRenameModal(labelMenu.point!)">Renombrar…</button>
            <button class="rp-menu-item rp-menu-danger" @click="removePoint(labelMenu.point!)">Quitar</button>
        </div>

        <div v-if="modal.visible" class="rp-modal-backdrop" data-reading-point-ui @click.self="closeModal">
            <div class="rp-modal">
                <h3 class="rp-modal-title">Punto de libro</h3>
                <label class="rp-modal-label" for="rp-name">Nombre</label>
                <input id="rp-name" ref="modalInput" v-model="modal.label" class="rp-modal-input"
                    placeholder="Nombre del punto" @keydown.enter.prevent="confirmModal"
                    @keydown.esc.prevent="closeModal" />
                <div class="rp-modal-actions">
                    <button v-if="modal.point" class="rp-modal-danger" @click="removeFromModal">Quitar</button>
                    <span class="rp-modal-spacer"></span>
                    <button class="rp-modal-cancel" @click="closeModal">Cancelar</button>
                    <button class="rp-modal-save" @click="confirmModal">Guardar</button>
                </div>
            </div>
        </div>
    </Teleport>
</template>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import type { ReadingPoint } from '../../services/readingPoints/useReadingPoints';
import {
    captureAtPoint,
    captureAtTop,
    locatePoint,
    scrollToPoint,
    type ReadingPointAnchor,
} from './useReadingPointAnchors';
import type { useReadingPointsController } from './useReadingPointsController';

const props = defineProps<{
    controller: ReturnType<typeof useReadingPointsController>;
    target: HTMLElement | null;
    enabled?: boolean;
}>();

const emit = defineEmits<{ (event: 'changed'): void }>();

interface Marker {
    point: ReadingPoint;
    top: number;
    left: number;
    width: number;
}

const markers = ref<Marker[]>([]);
const resumeVisible = ref(false);
let resumeDismissed = false;

const labelMenu = reactive<{ visible: boolean; x: number; y: number; point: ReadingPoint | null }>({
    visible: false,
    x: 0,
    y: 0,
    point: null,
});

const modal = reactive<{ visible: boolean; label: string; point: ReadingPoint | null }>({
    visible: false,
    label: '',
    point: null,
});
let modalAnchor: ReadingPointAnchor = {};
const modalInput = ref<HTMLInputElement | null>(null);

let frame = 0;
let observer: MutationObserver | null = null;
let relocateTimer: ReturnType<typeof setTimeout> | null = null;

function labelFor(point: ReadingPoint): string {
    if (point.kind === 'reading') return 'Marca de lectura';
    return point.label?.trim() || 'Punto de libro';
}

function recompute() {
    const root = props.target;
    if (!root) {
        markers.value = [];
        return;
    }
    const rect = root.getBoundingClientRect();
    const result: Marker[] = [];
    for (const point of props.controller.points.value) {
        const located = locatePoint(root, point);
        if (!located) continue;
        if (located.top < -40 || located.top > window.innerHeight + 40) continue;
        result.push({ point, top: located.top, left: rect.left, width: rect.width });
    }
    markers.value = result;
}

function scheduleRecompute() {
    if (frame) return;
    frame = requestAnimationFrame(() => {
        frame = 0;
        recompute();
    });
}

function scheduleRelocate() {
    if (relocateTimer) return;
    relocateTimer = setTimeout(() => {
        relocateTimer = null;
        recompute();
    }, 300);
}

function updateResume() {
    const reading = props.controller.readingPoint.value;
    resumeVisible.value =
        !!reading && (reading.ratio ?? 0) > 0.02 && !resumeDismissed;
}

function openPoint(point: ReadingPoint) {
    closeLabelMenu();
    if (props.target) scrollToPoint(props.target, point);
}

function openLabelMenu(event: MouseEvent, point: ReadingPoint) {
    labelMenu.visible = true;
    labelMenu.x = event.clientX;
    labelMenu.y = event.clientY;
    labelMenu.point = point;
}

function closeLabelMenu() {
    labelMenu.visible = false;
    labelMenu.point = null;
}

function openRenameModal(point: ReadingPoint) {
    closeLabelMenu();
    modal.visible = true;
    modal.point = point;
    modal.label = point.label || '';
    nextTick(() => modalInput.value?.focus());
}

function closeModal() {
    modal.visible = false;
    modal.point = null;
    modal.label = '';
    modalAnchor = {};
}

async function confirmModal() {
    if (!modal.label.trim()) return;
    if (modal.point) {
        await props.controller.rename(modal.point.id, modal.label.trim());
    } else {
        await props.controller.addSection(modal.label.trim(), modalAnchor);
    }
    closeModal();
    await props.controller.load();
    recompute();
    updateResume();
    emit('changed');
}

async function removeFromModal() {
    if (!modal.point) return;
    await props.controller.remove(modal.point.id);
    closeModal();
    await props.controller.load();
    recompute();
    updateResume();
    emit('changed');
}

async function removePoint(point: ReadingPoint) {
    closeLabelMenu();
    await props.controller.remove(point.id);
    await props.controller.load();
    recompute();
    updateResume();
    emit('changed');
}

function resumeReading() {
    const reading = props.controller.readingPoint.value;
    resumeVisible.value = false;
    resumeDismissed = true;
    if (reading && props.target) scrollToPoint(props.target, reading);
}

function dismissResume() {
    resumeVisible.value = false;
    resumeDismissed = true;
}

async function saveReadingAt(x: number, y: number) {
    const root = props.target;
    if (!root) return;
    const anchor = x >= 0 && y >= 0 ? captureAtPoint(root, x, y) : captureAtTop(root);
    await props.controller.saveReading(anchor);
    recompute();
    updateResume();
    emit('changed');
}

async function saveSectionAt(x: number, y: number) {
    const root = props.target;
    if (!root) return;
    const anchor = x >= 0 && y >= 0 ? captureAtPoint(root, x, y) : captureAtTop(root);
    modalAnchor = anchor;
    modal.visible = true;
    modal.point = null;
    modal.label = (anchor.exact || '').slice(0, 60);
    nextTick(() => modalInput.value?.focus());
}

async function reload() {
    await props.controller.load();
    recompute();
    updateResume();
}

function onGlobalClick(event: MouseEvent) {
    const element = event.target as HTMLElement;
    if (!element.closest('[data-reading-point-ui]')) {
        closeLabelMenu();
    }
}

function observeTarget() {
    observer?.disconnect();
    observer = null;
    if (!props.target) return;
    observer = new MutationObserver(scheduleRelocate);
    observer.observe(props.target, { childList: true, subtree: true, characterData: true });
}

onMounted(async () => {
    await reload();
    window.addEventListener('scroll', scheduleRecompute, true);
    window.addEventListener('resize', scheduleRelocate);
    window.addEventListener('click', onGlobalClick);
    observeTarget();
});

watch(
    () => props.target,
    async () => {
        observeTarget();
        await reload();
    },
);

watch(
    () => props.enabled,
    (value) => {
        if (value) scheduleRecompute();
    },
);

// Los cambios hechos desde el panel (renombrar, quitar) llegan por el
// controlador compartido y hay que repintar.
watch(
    () => props.controller.points.value,
    () => {
        scheduleRelocate();
        updateResume();
    },
    { deep: true },
);

onBeforeUnmount(() => {
    window.removeEventListener('scroll', scheduleRecompute, true);
    window.removeEventListener('resize', scheduleRelocate);
    window.removeEventListener('click', onGlobalClick);
    observer?.disconnect();
    if (frame) cancelAnimationFrame(frame);
    if (relocateTimer) clearTimeout(relocateTimer);
});

defineExpose({
    reload,
    saveReadingAt,
    saveSectionAt,
    openPoint,
    openRenameModal,
    removePoint,
});
</script>

<style scoped>
.rp-layer {
    position: fixed;
    inset: 0;
    z-index: 2147483000;
    pointer-events: none;
    overflow: hidden;
}

.rp-line {
    position: absolute;
    left: 0;
    width: 100%;
    height: 0;
    border-top: 2px solid rgba(138, 180, 248, 0.85);
}

.rp-line-section {
    border-top: 2px dashed rgba(73, 190, 143, 0.9);
}

.rp-label {
    position: absolute;
    top: -16px;
    padding: 1px 8px;
    font-size: 11px;
    line-height: 14px;
    text-decoration: none;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 60vw;
    pointer-events: auto;
    cursor: pointer;
    user-select: none;
}

.rp-label-reading {
    right: 6px;
    color: #202124;
    background: #8ab4f8;
    border-radius: 6px 6px 0 0;
}

.rp-label-section {
    left: 0;
    color: #ffffff;
    background: #49be8f;
    border-radius: 0 6px 6px 0;
}

.rp-resume {
    position: fixed;
    left: 50%;
    bottom: 20px;
    transform: translateX(-50%);
    z-index: 2147483647;
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 14px;
    background: #202124;
    color: #e8eaed;
    border-radius: 10px;
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.35);
    font-size: 13px;
}

.rp-resume-primary {
    padding: 6px 10px;
    border-radius: 6px;
    background: #8ab4f8;
    color: #202124;
    border: none;
    cursor: pointer;
}

.rp-resume-secondary {
    padding: 6px 10px;
    border-radius: 6px;
    background: transparent;
    color: #e8eaed;
    border: 1px solid #5f6368;
    cursor: pointer;
}

.rp-menu {
    position: fixed;
    z-index: 2147483647;
    background: #ffffff;
    border: 1px solid #dadce0;
    border-radius: 6px;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
    padding: 4px 0;
    min-width: 160px;
}

.rp-menu-item {
    display: block;
    width: 100%;
    text-align: left;
    padding: 6px 14px;
    font-size: 13px;
    background: transparent;
    border: none;
    cursor: pointer;
    color: #202124;
}

.rp-menu-item:hover {
    background: #f1f3f4;
}

.rp-menu-danger {
    color: #d93025;
}

.rp-modal-backdrop {
    position: fixed;
    inset: 0;
    z-index: 2147483647;
    background: rgba(0, 0, 0, 0.35);
    display: flex;
    align-items: flex-start;
    justify-content: center;
    padding-top: 18vh;
}

.rp-modal {
    width: 300px;
    background: #ffffff;
    border-radius: 10px;
    padding: 16px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
}

.rp-modal-title {
    margin: 0 0 12px;
    font-size: 15px;
    font-weight: 600;
    color: #202124;
}

.rp-modal-label {
    display: block;
    font-size: 12px;
    color: #5f6368;
    margin-bottom: 4px;
}

.rp-modal-input {
    width: 100%;
    padding: 8px 10px;
    border: 1px solid #dadce0;
    border-radius: 6px;
    font-size: 14px;
    margin-bottom: 14px;
}

.rp-modal-actions {
    display: flex;
    align-items: center;
    gap: 8px;
}

.rp-modal-spacer {
    flex: 1;
}

.rp-modal-actions button {
    padding: 6px 12px;
    border-radius: 6px;
    font-size: 13px;
    cursor: pointer;
    border: 1px solid transparent;
}

.rp-modal-danger {
    background: transparent;
    border-color: #d93025 !important;
    color: #d93025;
}

.rp-modal-cancel {
    background: transparent;
    color: #5f6368;
}

.rp-modal-save {
    background: #1a73e8;
    color: #ffffff;
}
</style>
