import { basicSetup } from 'codemirror';
import { EditorView, keymap, lineNumbers } from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { HighlightStyle, indentUnit, syntaxHighlighting } from '@codemirror/language';
import { javascript } from '@codemirror/lang-javascript';
import { lintGutter, setDiagnostics } from '@codemirror/lint';
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
      lintGutter(),
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
  view.getValue = () => view.state.doc.toString();
  // CodeMirror 6 reflows on its own; refresh() is kept as a no-op for the
  // modal callers that still invoke the CodeMirror 5 API.
  view.refresh = () => {};

  // Highlight a parse error at the given 1-based line / 0-based column:
  // red underline on the offending character, an icon in the gutter and the
  // message on hover, plus the cursor moved there.
  view.setError = (line, column, message) => {
    const { doc } = view.state;
    const safeLine = Math.min(Math.max(line || 1, 1), doc.lines);
    const lineObj = doc.line(safeLine);
    const from = Math.min(lineObj.from + Math.max(column || 0, 0), lineObj.to);
    const to = Math.min(from + 1, doc.length);
    view.dispatch({
      ...setDiagnostics(view.state, [{ from, to, severity: 'error', message }]),
      selection: { anchor: from },
      scrollIntoView: true,
    });
    view.focus();
  };

  view.clearError = () => view.dispatch(setDiagnostics(view.state, []));

  return view;
};
export default editor;
