import { ref } from 'vue';
import { useRoute } from 'vue-router';
import { useCommentCreate } from '../../../services/comments/useCommentCreate';
import { useMarkCreate, type AnnotationAnchor } from '../../../services/marks/useMarkCreate';
import { useMarks } from '../../../services/marks/useMarks';
import type { MarkType } from '../extensions/markTypes';

interface Selection {
  from: number;
  to: number;
}

interface MarkSelection extends Selection {
  text: string;
  type: MarkType;
}

const ANCHOR_CONTEXT = 120;

/**
 * Cita y contexto del fragmento en el texto llano del editor. Lo usa el
 * navegador para volver a localizar la anotación fuera de documents.
 */
function anchorFromEditor(editor: { value: any }, quote: string): AnnotationAnchor {
  const instance = editor.value;
  if (!instance || !quote) return { quote };
  const text: string = instance.state.doc.textContent;
  const at = text.indexOf(quote);
  if (at < 0) return { quote };
  return {
    quote,
    prefix: text.slice(Math.max(0, at - ANCHOR_CONTEXT), at),
    suffix: text.slice(at + quote.length, at + quote.length + ANCHOR_CONTEXT),
    position: at,
  };
}

/**
 * Composable for managing editor annotations (comments and marks).
 * Extracts the comment/mark logic from EditorContent.vue.
 */
export function useEditorAnnotations(
  editor: { value: any },
  emit: (event: any, ...args: any[]) => void,
  props: { context?: string },
) {
  const route = useRoute();

  // Comment state
  const showComments = ref(false);
  const showCommentModal = ref(false);
  const selectedCommentText = ref('');
  const currentSelection = ref<Selection | null>(null);
  const { createComment, isLoading: isCommentLoading } = useCommentCreate();

  // Mark state
  const markContentMap = ref(new Map<string, string>());
  const { createMark, isLoading: isMarkLoading } = useMarkCreate();
  const { loadMarks } = useMarks();

  function entityType(): 'doc' | 'resource' {
    return props.context === 'resource' ? 'resource' : 'doc';
  }

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

      const newComment = await createComment(
        String(route.params.id),
        commentText,
        entityType(),
        anchorFromEditor(editor, selectedCommentText.value),
      );

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
  async function applyMark(selection: MarkSelection) {
    try {
      if (!route.params.id || route.params.id === 'new') return;

      const type: MarkType = selection.type || 'highlight';
      const newMark = await createMark(
        route.params.id as string,
        selection.text,
        entityType(),
        type,
        anchorFromEditor(editor, selection.text),
      );

      if (newMark && newMark.id) {
        markContentMap.value.set(newMark.id, selection.text);
      }

      if (editor.value) {
        const { from, to } = selection;
        editor.value.commands.setTextSelection({ from, to });
        editor.value.commands.setTextMark(newMark.id, type);
      }
    } catch (error) {
      console.error('Error creating mark:', error);
    }
  }

  async function loadDocumentMarks() {
    try {
      if (route.params.id && route.params.id !== 'new') {
        const loadedMarks = await loadMarks(route.params.id as string, entityType());

        if (editor.value && loadedMarks.length > 0) {
          loadedMarks.forEach((mark: Record<string, any>) => {
            markContentMap.value.set(mark.id, mark.content);
          });
          setTimeout(() => {
            loadedMarks.forEach((mark: Record<string, any>) => {
              try {
                if (!mark.content || !mark.id) {
                  console.warn('Invalid mark data:', mark);
                  return;
                }
                const content = editor.value.state.doc.textContent;
                const position = content.indexOf(mark.content);
                if (position !== -1) {
                  editor.value.commands.setTextSelection({
                    from: position,
                    to: position + mark.content.length,
                  });
                  editor.value.commands.setTextMark(mark.id, mark.type || 'highlight');
                } else {
                  console.warn(`Mark content not found in document: ${mark.content}`);
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
    isMarkLoading,
    markContentMap,
    applyMark,
    loadDocumentMarks,
    // Shared
    currentSelection,
  };
}
