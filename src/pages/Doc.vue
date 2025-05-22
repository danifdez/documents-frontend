<template>
  <div class="p-5 max-w-7xl mx-auto">
    <Breadcrumb :items="breadcrumbItems" />
    <div>
      <div class="relative mb-4">
        <input id="docName" v-model="docData.name" type="text" required
          class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
      </div>
      <div class="mt-5 h-[500px]">
        <div class="flex flex-col w-full">
          <EditorContent ref="editorContentRef" :content="docData?.content" :isSaving="isSaving"
            :savedSuccessfully="savedSuccessfully" @content-change="handleEditorContentChange" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useDocument } from '../services/documents/useDocument';
import { useThread } from '../services/threads/useThread';
import { ref, onMounted, computed } from 'vue';
import { useRoute } from 'vue-router';
import EditorContent from '../components/editor/EditorContent.vue';
import Breadcrumb from '../components/ui/Breadcrumb.vue';
import { useProjectStore } from '../store/projectStore';

const htmlContent = ref('');
const editorContentRef = ref(null);
const docData = ref({ name: '', content: '' });
const route = useRoute();
const isSaving = ref(false);
const savedSuccessfully = ref(false);
const saveTimeout = ref(null);
const { loadDocument, saveDocument, createDocument } = useDocument();
const { loadThread } = useThread();
const thread = ref(null);
const projectStore = useProjectStore();
const isNewDocument = computed(() => route.params.id === 'new');

const breadcrumbItems = computed(() => {
  const items = [];

  items.push({
    name: projectStore.currentProject.name,
    path: `/project/${projectStore.currentProject._id}`
  });

  if (thread.value) {
    items.push({
      name: thread.value.name,
      path: `/thread/${thread.value._id}`
    });
  }

  if (isNewDocument.value) {
    items.push({
      name: 'New Document'
    });
  } else if (docData.value) {
    items.push({
      name: docData.value.name
    });
  }

  return items;
});

onMounted(async () => {
  const id = route.params.id;

  if (!isNewDocument.value) {
    docData.value = await loadDocument(id);
  }

  let threadId = route.query.threadId || docData.value?.thread;
  let projectId = projectStore.currentProject._id;

  try {
    if (threadId) {
      thread.value = await loadThread(threadId);

      if (thread.value && thread.value.project) {
        projectId = thread.value.project;
      }
    }
  } catch (error) {
    console.error('Error loading hierarchy data for breadcrumbs:', error);
  }

  if (isNewDocument.value) {
    docData.value = {
      name: '',
      content: '',
      thread: threadId,
      project: projectId
    };
  }

  htmlContent.value = docData.value.content;
});

const handleEditorContentChange = (content) => {
  if (!docData.value.name) {
    return;
  }

  htmlContent.value = content;

  if (saveTimeout.value) {
    clearTimeout(saveTimeout.value);
  }

  isSaving.value = true;
  savedSuccessfully.value = false;

  saveTimeout.value = setTimeout(async () => {
    if (docData.value && htmlContent.value !== docData.value.content) {
      try {
        if (isNewDocument.value) {
          await createDocument(docData.value);
        } else {
          await saveDocument(docData.value._id, { content: htmlContent.value });
        }
        savedSuccessfully.value = true;
      } catch (error) {
        console.error('Error saving document:', error);
      } finally {
        isSaving.value = false;

        setTimeout(() => {
          savedSuccessfully.value = false;
        }, 3000);
      }
    } else {
      isSaving.value = false;
    }
  }, 1000);
};
</script>
