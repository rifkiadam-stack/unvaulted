import "./theme/theme.css";
import { createEditor, markdownMode } from "./editor";
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
  dirOf,
  pastedImageName,
  imageMarkdownFor,
  frontmatterEndOffset,
  droppedPastedImages
} from "./session/fileSession";

import { Compartment } from "@codemirror/state";
import { uvBasePath } from "./preview/widgets/image";
import { setEmbedDispatch } from "./preview/embedResolver";
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
const modeCompartment = new Compartment();
let markdownActive = true;

async function loadPath(path: string) {
  try {
    const text = await platform.readFile(path);
    const newState = loadFile(path, text);
    const endOffset = frontmatterEndOffset(newState.currentText);
    
    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: newState.currentText },
      selection: { anchor: endOffset, head: endOffset },
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
    const dropped = droppedPastedImages(session.loadedText, session.currentText);
    
    await platform.saveAtomic(targetPath, textToSave);
    const newState = afterSave(session);
    newState.path = targetPath; // in case it was untitled
    await updateState(newState);
    
    if (dropped.length > 0) {
      await new Promise<void>((resolve) => {
        const overlay = document.createElement('div');
        overlay.className = 'uv-modal-overlay';
        overlay.style.position = 'fixed';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100vw';
        overlay.style.height = '100vh';
        overlay.style.backgroundColor = 'rgba(0,0,0,0.5)';
        overlay.style.display = 'flex';
        overlay.style.alignItems = 'center';
        overlay.style.justifyContent = 'center';
        overlay.style.zIndex = '9999';

        const modal = document.createElement('div');
        modal.className = 'uv-modal';
        modal.style.backgroundColor = 'var(--bg-color, #fff)';
        modal.style.color = 'var(--text-color, #000)';
        modal.style.padding = '20px';
        modal.style.borderRadius = '8px';
        modal.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
        modal.style.maxWidth = '400px';
        modal.style.fontFamily = 'system-ui, sans-serif';

        const text = document.createElement('p');
        text.innerText = `Removed image reference(s):\n${dropped.join('\n')}\n\nAlso delete these files from the asset store?`;
        text.style.margin = '0 0 20px 0';
        text.style.whiteSpace = 'pre-wrap';
        modal.appendChild(text);

        const btnContainer = document.createElement('div');
        btnContainer.style.display = 'flex';
        btnContainer.style.justifyContent = 'flex-end';
        btnContainer.style.gap = '10px';

        const yesBtn = document.createElement('button');
        yesBtn.textContent = 'Yes';
        const noBtn = document.createElement('button');
        noBtn.textContent = 'No';

        const close = async (confirmed: boolean) => {
          document.body.removeChild(overlay);
          if (confirmed) {
            await platform.deletePastedImages(dropped);
          }
          resolve();
        };

        yesBtn.onclick = () => close(true);
        noBtn.onclick = () => close(false);

        btnContainer.appendChild(yesBtn);
        btnContainer.appendChild(noBtn);
        modal.appendChild(btnContainer);
        overlay.appendChild(modal);

        document.body.appendChild(overlay);
        yesBtn.focus();
      });
    }
    
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
    
    // Frontmatter auto-spawn
    const state = update.state;
    if (state.doc.lines >= 1 && frontmatterEndOffset(newText) === 0) {
      const firstLine = state.doc.line(1);
      if (firstLine.text === "---") {
        let touchedLine1 = false;
        update.changes.iterChanges((fromA, toA, fromB, toB) => {
          if (fromB <= firstLine.to && toB >= firstLine.from) touchedLine1 = true;
        });
        
        if (touchedLine1) {
          setTimeout(() => {
            if (view.state.doc.line(1).text === "---" && frontmatterEndOffset(view.state.doc.toString()) === 0) {
              view.dispatch({
                changes: { from: view.state.doc.line(1).to, insert: "\n\n---\n" },
                selection: { anchor: view.state.doc.line(1).to + 1, head: view.state.doc.line(1).to + 1 }
              });
            }
          }, 0);
        }
      }
    }
  }
});

view = createEditor(editorContainer, '', [
  updateListener,
  baseCompartment.of(uvBasePath.of('')),
  modeCompartment.of(markdownMode())
]);

setEmbedDispatch((effect) => view.dispatch({ effects: [effect] }));

platform.onCloseRequested(attemptClose);
platform.onFileDrop(loadPath);

platform.getCliOpenPath().then(path => {
  if (path) {
    loadPath(path);
  } else {
    updateState(emptySession());
  }
});

document.addEventListener('paste', async (e) => {
  const items = e.clipboardData?.items;
  if (!items) return;
  
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (item.type.startsWith('image/')) {
      e.preventDefault();
      
      const blob = item.getAsFile();
      if (!blob) continue;
      
      try {
        const buffer = await blob.arrayBuffer();
        const base64 = arrayBufferToBase64(buffer);
        const name = pastedImageName(new Date());
        
        await platform.savePastedImage(name, base64);
        
        const markdown = imageMarkdownFor(name);
        view.dispatch(view.state.replaceSelection(markdown));
      } catch (err) {
        console.error("Failed to paste image", err);
        platform.showMessage("Failed to save image");
      }
      break;
    }
  }
});

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode.apply(null, Array.from(chunk));
  }
  return window.btoa(binary);
}
