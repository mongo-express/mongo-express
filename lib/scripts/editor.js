import { basicSetup } from 'codemirror';
import { EditorView, keymap, lineNumbers } from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { indentUnit } from '@codemirror/language';
import { javascript } from '@codemirror/lang-javascript';
import { oneDark } from '@codemirror/theme-one-dark';

const editor = (textarea, options) => {
  const state = EditorState.create({
    doc: textarea.value,
    extensions: [
      basicSetup,
      history(),
      lineNumbers(),
      keymap.of([...defaultKeymap, ...historyKeymap]),
      javascript(),
      indentUnit.of(' '),
      EditorState.readOnly.of(options.readOnly),
      oneDark,
    ],
  });
  const view = new EditorView();
  view.setState(state);
  textarea.parentNode.insertBefore(view.dom, textarea);
  textarea.style.display = 'none';
  if (textarea.form) {
    textarea.form.addEventListener('submit', () => {
      textarea.value = view.state.doc.toString();
    });
  }
  return view;
};
export default editor;
