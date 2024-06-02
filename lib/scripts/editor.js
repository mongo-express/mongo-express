import { basicSetup } from 'codemirror';
import {
  EditorView, highlightActiveLine, keymap, lineNumbers,
} from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { indentUnit } from '@codemirror/language';
import { oneDark } from '@codemirror/theme-one-dark';
import {
  amy,
  cobalt,
  coolGlow,
  barf,
  bespin,
  clouds,
  ayuLight,
  dracula,
  boysAndGirls,
  espresso,
  smoothy,
  solarizedLight,
  tomorrow,
  noctisLilac,
  rosePineDawn,
  birdsOfParadise,
// eslint-disable-next-line import/no-unresolved
} from 'thememirror';

const themes = {
  // light
  ayuLight,
  clouds,
  espresso,
  smoothy,
  solarizedLight,
  tomorrow,
  noctisLilac,
  rosePineDawn,
  // dark
  oneDark,
  dracula,
  boysAndGirls,
  amy,
  barf,
  bespin,
  birdsOfParadise,
  cobalt,
  coolGlow,
};

const editor = (textarea, options) => {
  // TODO: Fix editor highlight
  // TODO: Add support for light and dark theme modes
  const selectedThemeName = options.theme;
  const selectedTheme = themes[selectedThemeName];

  const state = EditorState.create({
    doc: textarea.value,
    extensions: [
      basicSetup,
      highlightActiveLine(),
      selectedTheme,
      history(),
      lineNumbers(),
      keymap.of([...defaultKeymap, ...historyKeymap]),
      indentUnit.of(' '),
      EditorState.readOnly.of(options.readOnly),
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
