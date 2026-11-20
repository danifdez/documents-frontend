import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MarkExtension } from '@/components/editor/extensions/MarkExtension';
import { VideoExtension } from '@/components/editor/extensions/VideoExtension';

let editor: Editor | undefined;

function mount(content: string, extensions = [MarkExtension, VideoExtension]) {
  const element = document.createElement('div');
  editor = new Editor({ content, element, extensions: [StarterKit, ...extensions] });
  return editor;
}

function parsedHtml(editor: Editor) {
  return new DOMParser().parseFromString(editor.getHTML(), 'text/html');
}

afterEach(() => editor?.destroy());

describe('research marks', () => {
  it('restores legacy annotations and serializes their IDs and types using the current format', () => {
    const editor = mount('<p><span data-marker-id="legacy" class="marker-review">Review me</span> ' +
      '<span data-mark-id="idea" data-mark-type="idea">Idea</span> ' +
      '<span data-mark-id="fallback" data-mark-type="old-type">Highlight</span></p>');
    const marks = Array.from(parsedHtml(editor).querySelectorAll('span'));
    expect(marks.map((mark) => [mark.textContent, mark.dataset.markId, mark.dataset.markType, mark.title])).toEqual([
      ['Review me', 'legacy', 'review', 'Review'],
      ['Idea', 'idea', 'idea', 'Idea'],
      ['Highlight', 'fallback', 'highlight', 'Highlight'],
    ]);
    expect(marks[0].style.borderBottom).toContain('2px solid');
  });

  it('applies and removes a mark using the editor commands', () => {
    const editor = mount('<p>Archive records</p>');
    expect(editor.commands.setTextSelection({ from: 1, to: 8 })).toBe(true);
    expect(editor.commands.setTextMark('annotation')).toBe(true);
    expect(parsedHtml(editor).querySelector('[data-mark-id="annotation"]')?.textContent).toBe('Archive');
    expect(editor.commands.unsetTextMark()).toBe(true);
    expect(parsedHtml(editor).querySelector('[data-mark-id]')).toBeNull();
    expect(editor.getText()).toBe('Archive records');
  });

  it('routes clicks on an annotation and keyboard shortcuts to the configured handlers', () => {
    const onMarkClick = vi.fn();
    const onMarkShortcut = vi.fn(() => true);
    const editor = mount('<p><span data-mark-id="a1" data-mark-type="important">Archive</span> records</p>',
      [MarkExtension.configure({ onMarkClick, onMarkShortcut }), VideoExtension]);

    const click = new MouseEvent('click');
    editor.view.someProp('handleClick', (handler) => handler(editor.view, 11, click));
    expect(onMarkClick).not.toHaveBeenCalled();
    editor.view.someProp('handleClick', (handler) => handler(editor.view, 3, click));
    expect(onMarkClick).toHaveBeenCalledExactlyOnceWith('a1', 'important');

    for (const letter of ['i', 'w', 'r', 'h']) {
      const key = new KeyboardEvent('keydown', { key: letter, ctrlKey: !/Mac|iP(hone|ad|od)/.test(navigator.platform), metaKey: /Mac|iP(hone|ad|od)/.test(navigator.platform), altKey: true });
      editor.view.someProp('handleKeyDown', (handler) => handler(editor.view, key));
    }
    expect(onMarkShortcut.mock.calls).toEqual([['idea'], ['important'], ['review'], ['highlight']]);
  });
});

describe('editor video embeds', () => {
  it.each([
    ['https://www.youtube.com/shorts/abcDEF_1234', 'https://www.youtube.com/embed/abcDEF_1234'],
    ['https://youtu.be/abcDEF_1234', 'https://www.youtube.com/embed/abcDEF_1234'],
    ['https://vimeo.com/123456', 'https://player.vimeo.com/video/123456'],
    ['https://www.dailymotion.com/video/x45example', 'https://www.dailymotion.com/embed/video/x45example'],
    ['https://video.example/embed/lecture', 'https://video.example/embed/lecture'],
  ])('renders the playable iframe for %s and keeps the input source when saving', (source, embed) => {
    const editor = mount('<p>Recorded interview</p>');
    expect(editor.commands.insertVideo(source)).toBe(true);

    expect(editor.view.dom.querySelector('iframe')?.getAttribute('src')).toBe(embed);
    const saved = parsedHtml(editor);
    expect(saved.querySelector('[data-video-embed]')?.getAttribute('data-video-src')).toBe(source);
    expect(saved.querySelector('iframe')?.getAttribute('src')).toBe(embed);
  });

  it('restores direct video from a nested source and renders a playable native video', () => {
    const url = 'https://archive.example/interview.webm?part=2';
    const editor = mount('<div data-video-embed><video><source src="' + url + '" /></video></div>');
    const playable = editor.view.dom.querySelector('video');
    expect(playable?.getAttribute('src')).toBe(url);
    expect(playable?.controls).toBe(true);
    expect(parsedHtml(editor).querySelector('video')?.getAttribute('src')).toBe(url);
    expect(parsedHtml(editor).querySelector('iframe')).toBeNull();
  });

  it('supports a stored source without an iframe child and an invalid empty video placeholder', () => {
    const url = 'https://archive.example/stream';
    const editor = mount('<div data-video-embed data-video-src="' + url + '"></div><div data-video-embed></div>',
      [MarkExtension, VideoExtension.configure({ allowFullscreen: false })]);
    expect(editor.view.dom.querySelector('iframe')?.getAttribute('src')).toBe(url);
    expect(parsedHtml(editor).querySelector('iframe')?.hasAttribute('allowfullscreen')).toBe(false);
    expect(editor.view.dom.textContent).toContain('Invalid video URL');
    expect(editor.commands.insertVideo('')).toBe(false);
  });
});
