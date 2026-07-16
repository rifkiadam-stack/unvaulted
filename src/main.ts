import "./theme/theme.css";
import { createEditor } from "./editor";
import { keymap } from "@codemirror/view";
import { EditorView } from "@codemirror/view";
import { tauriPlatform } from "./session/platform";
import { getCurrentWindow } from "@tauri-apps/api/window";
import {
  emptySession,
  loadFile,
  updateText,
  windowTitle,
  serializeForSave,
  afterSave,
  onCloseRequested,
  inlineTitle,
  SessionState,
  dirOf
} from "./session/fileSession";

import { Compartment } from "@codemirror/state";
import { uvBasePath } from "./preview/widgets/image";

import { initialMode, nextMode, ThemeMode } from "./theme/themeMode";

let session = emptySession();
const platform = tauriPlatform();

const currentTheme = initialMode(localStorage.getItem('uv-theme'));
document.documentElement.dataset.theme = currentTheme;

const appDiv = document.querySelector('#app') as HTMLElement;
appDiv.innerHTML = '';
appDiv.style.position = 'relative';
appDiv.style.display = 'flex';
appDiv.style.flexDirection = 'column';
appDiv.style.height = '100vh';

const headerRow = document.createElement('div');
headerRow.className = 'uv-app-header';

const themeToggle = document.createElement('button');
themeToggle.className = 'uv-theme-toggle';
themeToggle.ariaLabel = 'Toggle theme';
themeToggle.textContent = currentTheme === 'dark' ? '☀' : '🌙';
themeToggle.onclick = () => {
  const current = (document.documentElement.dataset.theme as ThemeMode) || 'dark';
  const next = nextMode(current);
  document.documentElement.dataset.theme = next;
  localStorage.setItem('uv-theme', next);
  themeToggle.textContent = next === 'dark' ? '☀' : '🌙';
};
headerRow.appendChild(themeToggle);

appDiv.appendChild(headerRow);

const titleDiv = document.createElement('div');
titleDiv.className = 'uv-inline-title';
titleDiv.style.display = 'none';
titleDiv.style.flex = '0 0 auto';
appDiv.appendChild(titleDiv);

const editorContainer = document.createElement('div');
editorContainer.style.flex = '1';
editorContainer.style.minHeight = '0';
appDiv.appendChild(editorContainer);

const emptyHint = document.createElement('div');
emptyHint.className = 'uv-empty-hint';
emptyHint.textContent = 'Ctrl+O to open a file — or drop one here';
appDiv.appendChild(emptyHint);

let view: EditorView;

async function updateState(newState: SessionState) {
  session = newState;
  try {
    await platform.setTitle(windowTitle(session));
  } catch (e) {
    console.error("Failed to set window title:", e);
  }
  
  const iTitle = inlineTitle(session);
  if (iTitle) {
    titleDiv.textContent = iTitle;
    titleDiv.style.display = 'block';
  } else {
    titleDiv.style.display = 'none';
  }
  
  if (session.path || session.currentText.length > 0) {
    emptyHint.style.display = 'none';
  } else {
    emptyHint.style.display = 'block';
  }
}

async function doOpen() {
  const path = await platform.showOpenDialog();
  if (path) {
    await loadPath(path);
  }
}

const baseCompartment = new Compartment();

async function loadPath(path: string) {
  try {
    const text = await platform.readFile(path);
    const newState = loadFile(path, text);
    
    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: newState.currentText },
      effects: baseCompartment.reconfigure(uvBasePath.of(dirOf(path)))
    });
    
    await updateState(newState);
  } catch (e) {
    console.error("Failed to load file", e);
  }
}

async function doSave(): Promise<boolean> {
  let targetPath = session.path;
  if (!targetPath) {
    const picked = await platform.showSaveDialog();
    if (picked) {
      targetPath = picked;
    } else {
      return false; // cancelled
    }
  }
  
  try {
    const textToSave = serializeForSave(session);
    await platform.saveAtomic(targetPath, textToSave);
    const newState = afterSave(session);
    newState.path = targetPath; // in case it was untitled
    await updateState(newState);
    return true;
  } catch (e) {
    console.error("Failed to save", e);
    // In a real app we'd show an error dialog here
    return false;
  }
}

async function attemptClose(): Promise<boolean> {
  if (onCloseRequested(session) === 'ask') {
    const basename = inlineTitle(session) || 'Untitled';
    const decision = await platform.confirmClose(basename);
    if (decision === 'save') {
      return await doSave();
    } else if (decision === 'discard') {
      return true;
    } else {
      return false; // cancel
    }
  }
  return true;
}

document.addEventListener('keydown', (e) => {
  const isMod = navigator.platform.toLowerCase().includes('mac') ? e.metaKey : e.ctrlKey;
  if (isMod && !e.shiftKey && !e.altKey) {
    switch (e.key.toLowerCase()) {
      case 's':
        e.preventDefault();
        doSave();
        break;
      case 'o':
        e.preventDefault();
        doOpen();
        break;
      case 'w':
        e.preventDefault();
        getCurrentWindow().close();
        break;
    }
  }
});

const updateListener = EditorView.updateListener.of((update) => {
  if (update.docChanged) {
    const newText = update.state.doc.toString();
    if (newText !== session.currentText) {
      updateState(updateText(session, newText));
    }
  }
});

view = createEditor(editorContainer, '', [
  updateListener,
  baseCompartment.of(uvBasePath.of(''))
]);

platform.onCloseRequested(attemptClose);
platform.onFileDrop(loadPath);

platform.getCliOpenPath().then(path => {
  if (path) {
    loadPath(path);
  } else {
    updateState(emptySession());
  }
});
