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
  SessionState
} from "./session/fileSession";

let session = emptySession();
const platform = tauriPlatform();

const appDiv = document.querySelector('#app') as HTMLElement;
appDiv.innerHTML = '';
appDiv.style.position = 'relative';

const titleDiv = document.createElement('div');
titleDiv.className = 'uv-inline-title';
titleDiv.style.display = 'none';
appDiv.appendChild(titleDiv);

const editorContainer = document.createElement('div');
appDiv.appendChild(editorContainer);

const emptyHint = document.createElement('div');
emptyHint.className = 'uv-empty-hint';
emptyHint.textContent = 'Ctrl+O to open a file — or drop one here';
appDiv.appendChild(emptyHint);

let view: EditorView;

async function updateState(newState: SessionState) {
  session = newState;
  await platform.setTitle(windowTitle(session));
  
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

async function loadPath(path: string) {
  try {
    const text = await platform.readFile(path);
    const newState = loadFile(path, text);
    
    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: newState.currentText }
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

const shortcuts = keymap.of([
  {
    key: "Mod-s",
    preventDefault: true,
    run: () => { doSave(); return true; }
  },
  {
    key: "Mod-o",
    preventDefault: true,
    run: () => { doOpen(); return true; }
  },
  {
    key: "Mod-w",
    preventDefault: true,
    run: () => {
      attemptClose().then(allowed => {
        if (allowed) getCurrentWindow().close();
      });
      return true;
    }
  }
]);

const updateListener = EditorView.updateListener.of((update) => {
  if (update.docChanged) {
    const newText = update.state.doc.toString();
    if (newText !== session.currentText) {
      updateState(updateText(session, newText));
    }
  }
});

view = createEditor(editorContainer, '', [shortcuts, updateListener]);

platform.onCloseRequested(attemptClose);
platform.onFileDrop(loadPath);

platform.getCliOpenPath().then(path => {
  if (path) {
    loadPath(path);
  } else {
    updateState(emptySession());
  }
});
