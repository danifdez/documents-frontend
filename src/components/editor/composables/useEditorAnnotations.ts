import { ref } from 'vue';
import { useRoute } from 'vue-router';
import { useCommentCreate } from '../../../services/comments/useCommentCreate';
import { useMarkCreate } from '../../../services/marks/useMarkCreate';
import { useMarks } from '../../../services/marks/useMarks';

interface Selection {
  from: number;
  to: number;
}

/**
 * Composable for managing editor annotations (comments and marks).
 * Extracts the comment/mark modal logic from EditorContent.vue.
 */
export function useEditorAnnotations(
  editor: { value: any },
  emit: (event: string, ...args: any[]) => void,
) {
  const route = useRoute();

  // Comment state
  const showComments = ref(false);
  const showCommentModal = ref(false);
  const selectedCommentText = ref('');
  const currentSelection = ref<Selection | null>(null);
  const { createComment, isLoading: isCommentLoading } = useCommentCreate();

  // Mark state
  const showMarkModal = ref(false);
  const selectedMarkText = ref('');
  const markContentMap = ref(new Map<string, string>());
  const { createMark } = useMarkCreate();
  const { loadMarks } = useMarks();

  // Comment handlers
  function toggleComments() {
    showComments.value = !showComments.value;
    emit('toggle-comments', showComments.value);
  }

  function handleAddCommentRequest(selection: { text: string; from: number; to: number }) {
    selectedCommentText.value = selection.text;
    currentSelection.value = { from: selection.from, to: selection.to };
    showCommentModal.value = true;
  }

  async function saveComment(commentText: string) {
    try {
      if (!commentText.trim() || !route.params.id || route.params.id === 'new') return;

      const newComment = await createComment(route.params.id as string, commentText);

      if (editor.value && currentSelection.value) {
        const { from, to } = currentSelection.value;
        editor.value.commands.setTextSelection({ from, to });
        editor.value.commands.setComment(newComment.id);
      }

      showCommentModal.value = false;
      currentSelection.value = null;
      emit('comment-created');

      if (!showComments.value) toggleComments();
    } catch (error) {
      console.error('Error saving comment:', error);
    }
  }

  function cancelComment() {
    showCommentModal.value = false;
    currentSelection.value = null;
    selectedCommentText.value = '';
  }

  // Mark handlers
  function handleAddMarkRequest(selection: { text: string; from: number; to: number }) {
    selectedMarkText.value = selection.text;
    currentSelection.value = { from: selection.from, to: selection.to };
    showMarkModal.value = true;
  }

  async function saveMark() {
    try {
      if (!route.params.id || route.params.id === 'new') return;

      const newMark = await createMark(route.params.id as string, selectedMarkText.value);

      if (editor.value && currentSelection.value) {
        const { from, to } = currentSelection.value;
        editor.value.commands.setTextSelection({ from, to });
        editor.value.commands.setTextMark(newMark.id);
      }

      showMarkModal.value = false;
      currentSelection.value = null;
    } catch (error) {
      console.error('Error creating mark:', error);
    }
  }

  function cancelMark() {
    showMarkModal.value = false;
    currentSelection.value = null;
  }

  async function loadDocumentMarks() {
    try {
      if (route.params.id && route.params.id !== 'new') {
        const loadedMarks = await loadMarks(route.params.id as string);

        if (editor.value && loadedMarks.length > 0) {
          loadedMarks.forEach((mark: Record<string, any>) => {
            markContentMap.value.set(mark.id, mark.content);
          });
          setTimeout(() => {
            loadedMarks.forEach((mark: Record<string, any>) => {
              try {
                if (!mark.content || !mark.id) return;
                const content = editor.value.state.doc.textContent;
                const position = content.indexOf(mark.content);
                if (position !== -1) {
                  editor.value.commands.setTextSelection({
                    from: position,
                    to: position + mark.content.length,
                  });
                  editor.value.commands.setTextMark(mark.id);
                }
              } catch (err) {
                console.error(`Error applying mark ${mark.id}:`, err);
              }
            });
          }, 500);
        }
      }
    } catch (error) {
      console.error('Error loading marks:', error);
    }
  }

  return {
    // Comment
    showComments,
    showCommentModal,
    selectedCommentText,
    isCommentLoading,
    toggleComments,
    handleAddCommentRequest,
    saveComment,
    cancelComment,
    // Mark
    showMarkModal,
    selectedMarkText,
    markContentMap,
    handleAddMarkRequest,
    saveMark,
    cancelMark,
    loadDocumentMarks,
    // Shared
    currentSelection,
  };
}
