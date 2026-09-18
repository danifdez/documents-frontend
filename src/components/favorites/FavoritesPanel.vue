<template>
  <Teleport to="body">
    <Transition name="favorites-panel" appear>
      <div v-if="modelValue" class="favorites-overlay" @click="close">
        <div class="favorites-container" @click.stop>
          <!-- Header -->
          <div class="favorites-header">
            <div class="flex items-center gap-3 flex-1 min-w-0">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-amber-500 shrink-0" viewBox="0 0 20 20"
                fill="currentColor">
                <path
                  d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.958a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.367 2.446a1 1 0 00-.363 1.118l1.286 3.958c.3.922-.755 1.688-1.539 1.118l-3.367-2.446a1 1 0 00-1.176 0l-3.367 2.446c-.783.57-1.838-.196-1.539-1.118l1.286-3.958a1 1 0 00-.363-1.118L2.045 9.385c-.783-.57-.38-1.81.588-1.81h4.162a1 1 0 00.95-.69l1.304-3.958z" />
              </svg>
              <h2 class="text-lg font-semibold text-text-primary tracking-tight">Favorites</h2>
              <span v-if="projectName" class="text-xs px-2 py-0.5 rounded-full bg-accent/10 text-accent truncate">
                {{ projectName }}
              </span>
            </div>
            <button @click="close"
              class="p-1.5 rounded-md text-text-muted hover:text-text-secondary hover:bg-surface-hover transition-colors cursor-pointer">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24"
                stroke="currentColor" stroke-width="1.75">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <!-- No project -->
          <div v-if="!projectId" class="flex flex-1 items-center justify-center text-sm text-text-muted">
            Select a project to manage its favorites.
          </div>

          <!-- Body -->
          <div v-else class="favorites-body">
            <!-- Left: Categories -->
            <div class="favorites-side-pane">
              <div class="px-4 py-2 border-b border-border-light">
                <p class="text-[11px] font-medium uppercase tracking-wide text-text-muted">Categories</p>
              </div>

              <div class="flex-1 overflow-y-auto py-2">
                <button
                  class="group flex w-full items-center gap-2 px-4 py-2 text-left transition-colors hover:bg-surface-hover"
                  :class="{ 'bg-amber-500/10': selection === 'all' }" @click="select('all')">
                  <span class="flex-1 truncate text-sm text-text-primary">All favorites</span>
                  <span class="shrink-0 text-[10px] text-text-muted">{{ favorites.length }}</span>
                </button>

                <button
                  class="group flex w-full items-center gap-2 px-4 py-2 text-left transition-colors hover:bg-surface-hover"
                  :class="{ 'bg-amber-500/10': selection === 'uncategorized' }" @click="select('uncategorized')">
                  <span class="flex-1 truncate text-sm text-text-primary">Uncategorized</span>
                  <span class="shrink-0 text-[10px] text-text-muted">{{ uncategorizedCount }}</span>
                </button>

                <div class="my-2 border-t border-border-light"></div>

                <template v-for="category in rootCategories" :key="category.id">
                  <div class="group flex items-center gap-2 px-4 py-2 transition-colors hover:bg-surface-hover"
                    :class="{ 'bg-amber-500/10': selection === category.id }">
                    <template v-if="editingCategoryId === category.id">
                      <input v-model="editingCategoryName" type="text"
                        class="flex-1 min-w-0 rounded-lg border border-border bg-surface px-2 py-1 text-xs text-text-primary outline-none focus:border-accent"
                        @keydown.enter="saveCategoryRename(category)" @keydown.esc="cancelCategoryRename"
                        @blur="saveCategoryRename(category)" />
                    </template>
                    <template v-else>
                      <button class="flex-1 min-w-0 truncate text-left text-sm text-text-primary"
                        @click="select(category.id)">
                        {{ category.name }}
                      </button>
                      <span class="shrink-0 text-[10px] text-text-muted">{{ subtreeCount(category.id) }}</span>
                      <span class="hidden shrink-0 items-center gap-0.5 group-hover:flex">
                        <button class="fav-action text-text-muted" title="Add subcategory"
                          @click.stop="startAddChild(category.id)">
                          <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24"
                            stroke="currentColor" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M12 5v14M5 12h14" />
                          </svg>
                        </button>
                        <button class="fav-action text-text-muted" title="Rename"
                          @click.stop="startCategoryRename(category)">
                          <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24"
                            stroke="currentColor" stroke-width="1.75">
                            <path stroke-linecap="round" stroke-linejoin="round"
                              d="M16.5 3.75l3.75 3.75L8 19.75H4.25V16L16.5 3.75z" />
                          </svg>
                        </button>
                        <button class="fav-action text-text-muted hover:text-red-500" title="Delete"
                          @click.stop="removeCategory(category)">
                          <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24"
                            stroke="currentColor" stroke-width="1.75">
                            <path stroke-linecap="round" stroke-linejoin="round"
                              d="M6 7h12M9 7V5.5A1.5 1.5 0 0110.5 4h3A1.5 1.5 0 0115 5.5V7m2 0v11a1.5 1.5 0 01-1.5 1.5h-7A1.5 1.5 0 017 18V7" />
                          </svg>
                        </button>
                      </span>
                    </template>
                  </div>

                  <!-- Subcategories -->
                  <template v-for="child in childrenOf(category.id)" :key="child.id">
                    <div class="group flex items-center gap-2 py-2 pl-8 pr-4 transition-colors hover:bg-surface-hover"
                      :class="{ 'bg-amber-500/10': selection === child.id }">
                      <template v-if="editingCategoryId === child.id">
                        <input v-model="editingCategoryName" type="text"
                          class="flex-1 min-w-0 rounded-lg border border-border bg-surface px-2 py-1 text-xs text-text-primary outline-none focus:border-accent"
                          @keydown.enter="saveCategoryRename(child)" @keydown.esc="cancelCategoryRename"
                          @blur="saveCategoryRename(child)" />
                      </template>
                      <template v-else>
                        <button class="flex-1 min-w-0 truncate text-left text-sm text-text-secondary"
                          @click="select(child.id)">
                          {{ child.name }}
                        </button>
                        <span class="shrink-0 text-[10px] text-text-muted">{{ directCount(child.id) }}</span>
                        <span class="hidden shrink-0 items-center gap-0.5 group-hover:flex">
                          <button class="fav-action text-text-muted" title="Rename" @click.stop="startCategoryRename(child)">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24"
                              stroke="currentColor" stroke-width="1.75">
                              <path stroke-linecap="round" stroke-linejoin="round"
                                d="M16.5 3.75l3.75 3.75L8 19.75H4.25V16L16.5 3.75z" />
                            </svg>
                          </button>
                          <button class="fav-action text-text-muted hover:text-red-500" title="Delete"
                            @click.stop="removeCategory(child)">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24"
                              stroke="currentColor" stroke-width="1.75">
                              <path stroke-linecap="round" stroke-linejoin="round"
                                d="M6 7h12M9 7V5.5A1.5 1.5 0 0110.5 4h3A1.5 1.5 0 0115 5.5V7m2 0v11a1.5 1.5 0 01-1.5 1.5h-7A1.5 1.5 0 017 18V7" />
                            </svg>
                          </button>
                        </span>
                      </template>
                    </div>
                  </template>

                  <!-- New subcategory inline form -->
                  <div v-if="addingChildParentId === category.id" class="flex items-center py-2 pl-8 pr-4">
                    <input v-model="childName" type="text" placeholder="Subcategory name"
                      class="flex-1 min-w-0 rounded-lg border border-border bg-surface px-2 py-1 text-xs text-text-primary outline-none placeholder:text-text-muted focus:border-accent"
                      @keydown.enter="saveChildCategory(category)" @keydown.esc="cancelAddChild"
                      @blur="saveChildCategory(category)" />
                  </div>
                </template>

                <p v-if="rootCategories.length === 0 && !creatingRoot" class="px-4 py-6 text-center text-xs text-text-muted">
                  No categories yet
                </p>
              </div>

              <!-- New root category -->
              <div class="px-3 py-2 border-t border-border-light">
                <input v-if="creatingRoot" v-model="rootName" type="text" placeholder="Category name"
                  class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary outline-none placeholder:text-text-muted focus:border-accent"
                  @keydown.enter="saveRootCategory" @keydown.esc="cancelRootCategory" @blur="saveRootCategory" />
                <button v-else
                  class="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium text-accent hover:bg-accent-subtle rounded-lg transition-colors cursor-pointer"
                  @click="startRootCategory">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd"
                      d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
                      clip-rule="evenodd" />
                  </svg>
                  New Category
                </button>
              </div>
            </div>

            <!-- Right: Favorites -->
            <div class="favorites-content-pane">
              <!-- Add favorite -->
              <div class="shrink-0 px-5 py-3 border-b border-border-light space-y-2">
                <div class="flex items-center gap-2">
                  <input v-model="newUrl" type="text" placeholder="https://example.com"
                    class="flex-1 bg-surface border border-border rounded-lg text-sm text-text-primary outline-none px-3 py-2 placeholder:text-text-muted focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all"
                    @keydown.enter="add" />
                  <select v-model="newCategoryId"
                    class="w-40 shrink-0 bg-surface border border-border rounded-lg text-xs text-text-secondary px-2.5 py-2 outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent cursor-pointer">
                    <option value="">Uncategorized</option>
                    <option v-for="option in categoryOptions" :key="option.id" :value="option.id">{{ option.label }}</option>
                  </select>
                </div>
                <div class="flex items-center gap-2">
                  <input v-model="newTitle" type="text" placeholder="Title (optional)"
                    class="flex-1 bg-surface border border-border rounded-lg text-sm text-text-primary outline-none px-3 py-2 placeholder:text-text-muted focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all"
                    @keydown.enter="add" />
                  <button :disabled="!newUrl.trim() || adding"
                    class="shrink-0 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    @click="add">
                    {{ adding ? 'Adding…' : 'Add' }}
                  </button>
                </div>
              </div>

              <!-- List -->
              <div class="flex-1 overflow-y-auto">
                <div v-if="loadingFavorites || loadingCategories" class="flex justify-center py-10">
                  <div class="animate-spin rounded-full h-5 w-5 border-2 border-accent border-t-transparent"></div>
                </div>

                <div v-else-if="visibleFavorites.length === 0" class="flex flex-col items-center justify-center py-16 text-center px-8">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 text-text-muted mb-3" fill="none"
                    viewBox="0 0 24 24" stroke="currentColor" stroke-width="1">
                    <path stroke-linecap="round" stroke-linejoin="round"
                      d="M11.48 3.5l2.3 4.66 5.14.75-3.72 3.63.88 5.12-4.6-2.42-4.6 2.42.88-5.12-3.72-3.63 5.14-.75 2.3-4.66z" />
                  </svg>
                  <p class="text-sm text-text-muted mb-1">No favorites here yet</p>
                  <p class="text-xs text-text-muted">Add one above to get started</p>
                </div>

                <div v-else class="flex flex-col">
                  <div v-for="favorite in visibleFavorites" :key="favorite.id"
                    class="group border-b border-border-light transition-colors hover:bg-surface-hover">
                    <div v-if="editingId === favorite.id" class="px-5 py-3 space-y-2">
                      <input v-model="editUrl" type="text" placeholder="https://example.com"
                        class="w-full bg-surface border border-border rounded-lg text-sm text-text-primary outline-none px-3 py-2 placeholder:text-text-muted focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all"
                        @keydown.enter="saveEdit(favorite)" @keydown.esc="cancelEdit" />
                      <input v-model="editTitle" type="text" placeholder="Title"
                        class="w-full bg-surface border border-border rounded-lg text-sm text-text-primary outline-none px-3 py-2 placeholder:text-text-muted focus:border-accent transition-all"
                        @keydown.enter="saveEdit(favorite)" @keydown.esc="cancelEdit" />
                      <div class="flex items-center gap-2">
                        <select v-model="editCategoryId"
                          class="flex-1 bg-surface border border-border rounded-lg text-xs text-text-secondary px-2.5 py-2 outline-none cursor-pointer">
                          <option value="">Uncategorized</option>
                          <option v-for="option in categoryOptions" :key="option.id" :value="option.id">{{ option.label }}
                          </option>
                        </select>
                        <button :disabled="!editUrl.trim()"
                          class="rounded-lg bg-accent px-3 py-2 text-xs font-medium text-white hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                          @click="saveEdit(favorite)">Save</button>
                        <button
                          class="rounded-lg px-3 py-2 text-xs text-text-muted hover:text-text-primary hover:bg-surface cursor-pointer"
                          @click="cancelEdit">Cancel</button>
                      </div>
                    </div>

                    <div v-else class="flex items-center gap-3 px-5 py-3">
                      <span class="w-8 h-8 rounded-md flex items-center justify-center bg-amber-500/10 text-amber-500 shrink-0">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                          <path
                            d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.958a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.367 2.446a1 1 0 00-.363 1.118l1.286 3.958c.3.922-.755 1.688-1.539 1.118l-3.367-2.446a1 1 0 00-1.176 0l-3.367 2.446c-.783.57-1.838-.196-1.539-1.118l1.286-3.958a1 1 0 00-.363-1.118L2.045 9.385c-.783-.57-.38-1.81.588-1.81h4.162a1 1 0 00.95-.69l1.304-3.958z" />
                        </svg>
                      </span>
                      <button class="min-w-0 flex-1 text-left" @click="openFavorite(favorite)">
                        <p class="text-sm text-text-primary truncate font-medium">{{ favorite.title || favorite.url }}</p>
                        <p class="text-[11px] text-text-muted truncate mt-0.5">
                          {{ hostOf(favorite.url) }}
                          <span v-if="categoryName(favorite.categoryId)"> · {{ categoryName(favorite.categoryId) }}</span>
                        </p>
                      </button>
                      <button class="fav-action text-text-muted" title="Edit" @click="startEdit(favorite)">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24"
                          stroke="currentColor" stroke-width="1.75">
                          <path stroke-linecap="round" stroke-linejoin="round"
                            d="M16.5 3.75l3.75 3.75L8 19.75H4.25V16L16.5 3.75z" />
                        </svg>
                      </button>
                      <button class="fav-action text-text-muted hover:text-red-500" title="Remove" @click="remove(favorite)">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24"
                          stroke="currentColor" stroke-width="1.75">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useProjectStore } from '../../store/projectStore';
import { useNotification } from '../../composables/useNotification';
import { useProjectFavorites } from '../../services/favorites/useProjectFavorites';
import { useFavoriteCategories } from '../../services/favorites/useFavoriteCategories';
import type { Favorite } from '../../types/Favorite';
import type { FavoriteCategory } from '../../types/FavoriteCategory';

const props = defineProps<{ modelValue: boolean }>();
const emit = defineEmits<{ (e: 'update:modelValue', value: boolean): void }>();

const projectStore = useProjectStore();
const notification = useNotification();

const {
  favorites,
  isLoading: loadingFavorites,
  loadFavoritesByProject,
  addFavorite,
  updateFavorite,
  removeFavorite,
} = useProjectFavorites();

const {
  categories,
  isLoading: loadingCategories,
  loadCategoriesByProject,
  createCategory,
  updateCategory,
  deleteCategory,
} = useFavoriteCategories();

type Selection = 'all' | 'uncategorized' | number;

const selection = ref<Selection>('all');

const newUrl = ref('');
const newTitle = ref('');
const newCategoryId = ref<number | ''>('');
const adding = ref(false);

const editingId = ref<number | null>(null);
const editUrl = ref('');
const editTitle = ref('');
const editCategoryId = ref<number | ''>('');

const creatingRoot = ref(false);
const rootName = ref('');
const addingChildParentId = ref<number | null>(null);
const childName = ref('');
const editingCategoryId = ref<number | null>(null);
const editingCategoryName = ref('');

const projectId = computed(() => projectStore.currentProject?.id ?? null);
const projectName = computed(() => projectStore.currentProject?.name ?? '');

const rootCategories = computed(() => categories.value.filter(c => c.parentId == null));

function childrenOf(parentId: number): FavoriteCategory[] {
  return categories.value.filter(c => c.parentId === parentId);
}

// Aplana el árbol en opciones "Padre / Hijo" para los selectores.
const categoryOptions = computed(() => {
  const options: { id: number; label: string }[] = [];
  for (const root of rootCategories.value) {
    options.push({ id: root.id, label: root.name });
    for (const child of childrenOf(root.id)) {
      options.push({ id: child.id, label: `${root.name} / ${child.name}` });
    }
  }
  return options;
});

function descendantIds(id: number): number[] {
  const result: number[] = [id];
  for (const child of childrenOf(id)) {
    result.push(...descendantIds(child.id));
  }
  return result;
}

function directCount(categoryId: number): number {
  return favorites.value.filter(f => f.categoryId === categoryId).length;
}

function subtreeCount(categoryId: number): number {
  const ids = new Set(descendantIds(categoryId));
  return favorites.value.filter(f => f.categoryId != null && ids.has(f.categoryId)).length;
}

const uncategorizedCount = computed(() => favorites.value.filter(f => f.categoryId == null).length);

const visibleFavorites = computed(() => {
  if (selection.value === 'all') return favorites.value;
  if (selection.value === 'uncategorized') return favorites.value.filter(f => f.categoryId == null);
  const ids = new Set(descendantIds(selection.value));
  return favorites.value.filter(f => f.categoryId != null && ids.has(f.categoryId));
});

function categoryName(categoryId: number | null): string {
  if (categoryId == null) return '';
  return categories.value.find(c => c.id === categoryId)?.name ?? '';
}

function select(value: Selection) {
  selection.value = value;
  newCategoryId.value = typeof value === 'number' ? value : '';
}

function hostOf(url: string): string {
  try {
    return new URL(url).host.replace(/^www\./, '');
  } catch {
    return url;
  }
}

function openFavorite(favorite: Favorite) {
  if (favorite?.url) window.open(favorite.url, '_blank', 'noopener,noreferrer');
}

async function load() {
  if (!projectId.value) return;
  try {
    await Promise.all([
      loadFavoritesByProject(projectId.value),
      loadCategoriesByProject(projectId.value),
    ]);
    if (typeof selection.value === 'number' && !categories.value.some(c => c.id === selection.value)) {
      selection.value = 'all';
    }
  } catch {
    notification.error('Failed to load favorites');
  }
}

async function add() {
  const url = newUrl.value.trim();
  if (!url || !projectId.value) return;
  adding.value = true;
  try {
    await addFavorite(
      projectId.value,
      url,
      newTitle.value.trim() || undefined,
      newCategoryId.value === '' ? null : Number(newCategoryId.value),
    );
    newUrl.value = '';
    newTitle.value = '';
    await load();
  } catch {
    notification.error('Failed to add favorite');
  } finally {
    adding.value = false;
  }
}

function startEdit(favorite: Favorite) {
  editingId.value = favorite.id;
  editUrl.value = favorite.url;
  editTitle.value = favorite.title || '';
  editCategoryId.value = favorite.categoryId ?? '';
}

function cancelEdit() {
  editingId.value = null;
}

async function saveEdit(favorite: Favorite) {
  try {
    await updateFavorite(favorite.id, {
      url: editUrl.value.trim(),
      title: editTitle.value.trim(),
      categoryId: editCategoryId.value === '' ? null : Number(editCategoryId.value),
    });
    editingId.value = null;
    await load();
  } catch {
    notification.error('Failed to update favorite');
  }
}

async function remove(favorite: Favorite) {
  try {
    await removeFavorite(favorite.id);
    await load();
  } catch {
    notification.error('Failed to remove favorite');
  }
}

function startRootCategory() {
  creatingRoot.value = true;
  rootName.value = '';
}

function cancelRootCategory() {
  creatingRoot.value = false;
  rootName.value = '';
}

async function saveRootCategory() {
  const name = rootName.value.trim();
  if (!name || !projectId.value) {
    creatingRoot.value = false;
    return;
  }
  creatingRoot.value = false;
  rootName.value = '';
  try {
    await createCategory({ projectId: projectId.value, name, parentId: null });
    await load();
  } catch {
    notification.error('Failed to create category');
  }
}

function startAddChild(parentId: number) {
  addingChildParentId.value = parentId;
  childName.value = '';
}

function cancelAddChild() {
  addingChildParentId.value = null;
  childName.value = '';
}

async function saveChildCategory(parent: FavoriteCategory) {
  if (addingChildParentId.value !== parent.id) return;
  const name = childName.value.trim();
  addingChildParentId.value = null;
  childName.value = '';
  if (!name || !projectId.value) return;
  try {
    await createCategory({ projectId: projectId.value, name, parentId: parent.id });
    await load();
  } catch {
    notification.error('Failed to create subcategory');
  }
}

function startCategoryRename(category: FavoriteCategory) {
  editingCategoryId.value = category.id;
  editingCategoryName.value = category.name;
}

function cancelCategoryRename() {
  editingCategoryId.value = null;
}

async function saveCategoryRename(category: FavoriteCategory) {
  if (editingCategoryId.value !== category.id) return;
  const name = editingCategoryName.value.trim();
  editingCategoryId.value = null;
  if (!name || name === category.name) return;
  try {
    await updateCategory(category.id, { name });
    await load();
  } catch {
    notification.error('Failed to rename category');
  }
}

async function removeCategory(category: FavoriteCategory) {
  try {
    await deleteCategory(category.id);
    if (selection.value === category.id) selection.value = 'all';
    await load();
  } catch {
    notification.error('Failed to delete category');
  }
}

function close() {
  emit('update:modelValue', false);
  editingId.value = null;
  editingCategoryId.value = null;
  addingChildParentId.value = null;
  creatingRoot.value = false;
}

watch(() => props.modelValue, (open) => {
  if (open) load();
});

watch(() => projectStore.currentProject?.id, (id) => {
  selection.value = 'all';
  editingId.value = null;
  if (!id) {
    if (props.modelValue) close();
    return;
  }
  if (props.modelValue) load();
});
</script>

<style scoped>
.favorites-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 50;
}

.favorites-container {
  background-color: var(--color-surface-elevated);
  border-radius: 1rem;
  box-shadow:
    0 0 0 1px rgba(0, 0, 0, 0.03),
    0 24px 48px -12px rgba(0, 0, 0, 0.15);
  width: 92%;
  max-width: 1200px;
  height: 82vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.favorites-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid var(--color-border-light);
}

.favorites-body {
  display: flex;
  flex: 1;
  min-height: 0;
}

.favorites-side-pane {
  width: 320px;
  min-width: 260px;
  border-right: 1px solid var(--color-border-light);
  display: flex;
  flex-direction: column;
}

.favorites-content-pane {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.fav-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.25rem;
  border-radius: 0.375rem;
  cursor: pointer;
  transition: color 0.15s ease, background-color 0.15s ease;
}

.fav-action:hover {
  background-color: rgba(0, 0, 0, 0.04);
}

/* Transitions */
.favorites-panel-enter-active {
  transition: opacity 0.25s ease;
}

.favorites-panel-leave-active {
  transition: opacity 0.2s ease;
}

.favorites-panel-enter-from,
.favorites-panel-leave-to {
  opacity: 0;
}

.favorites-panel-enter-active .favorites-container {
  animation: favorites-in 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}

.favorites-panel-leave-active .favorites-container {
  animation: favorites-out 0.15s ease-in forwards;
}

@keyframes favorites-in {
  from {
    opacity: 0;
    transform: scale(0.96) translateY(8px);
  }

  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

@keyframes favorites-out {
  from {
    opacity: 1;
    transform: scale(1) translateY(0);
  }

  to {
    opacity: 0;
    transform: scale(0.97) translateY(4px);
  }
}
</style>
