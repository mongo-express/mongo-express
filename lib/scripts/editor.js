import { basicSetup } from 'codemirror';
import { EditorView, keymap, lineNumbers } from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { HighlightStyle, indentUnit, syntaxHighlighting } from '@codemirror/language';
import { javascript } from '@codemirror/lang-javascript';
import { oneDarkHighlightStyle, oneDarkTheme } from '@codemirror/theme-one-dark';
import { tags as t } from '@lezer/highlight';

const customHighlightStyle = HighlightStyle.define([
  {
    tag: [t.labelName],
    color: '#e06c75',
  },
]);
const customOneDark = [
  oneDarkTheme,
  syntaxHighlighting(customHighlightStyle),
  syntaxHighlighting(oneDarkHighlightStyle),
];

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
      customOneDark,
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
  view.isClean = () => state.doc.eq(view.state.doc);
  return view;
};
export default editor;
