import { invoke } from '@tauri-apps/api/core';
import { open, message, ask, save } from '@tauri-apps/plugin-dialog';
import { openUrl } from '@tauri-apps/plugin-opener';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { listen } from '@tauri-apps/api/event';

export interface Platform {
  readFile(path: string): Promise<string>;
  saveAtomic(path: string, contents: string): Promise<void>;
  resolveEmbed(baseDir: string, fileName: string): Promise<string | null>;
  savePastedImage(fileName: string, contentsBase64: string): Promise<string>;
  deletePastedImages(names: string[]): Promise<void>;
  showMessage(text: string): Promise<void>;
  showOpenDialog(): Promise<string | null>;
  showSaveDialog(): Promise<string | null>;
  confirmClose(fileName: string): Promise<'save' | 'discard' | 'cancel'>;
  setTitle(title: string): Promise<void>;
  openExternal(url: string): Promise<void>;
  getCliOpenPath(): Promise<string | null>;
  onFileDrop(cb: (path: string) => void): void;
  onCloseRequested(cb: () => Promise<boolean>): void;
}

export function tauriPlatform(): Platform {
  return {
    async readFile(path: string) {
      return invoke<string>('read_file', { path });
    },
    async saveAtomic(path: string, contents: string) {
      return invoke('save_atomic', { path, contents });
    },
    async resolveEmbed(baseDir: string, fileName: string) {
      return invoke<string | null>('resolve_embed', { baseDir, fileName });
    },
    async savePastedImage(fileName: string, contentsBase64: string) {
      return invoke<string>('save_pasted_image', { fileName, contentsBase64 });
    },
    async deletePastedImages(names: string[]) {
      for (const fileName of names) {
        try {
          await invoke('delete_pasted_image', { fileName });
        } catch (e) {
          console.error(`Failed to delete pasted image ${fileName}:`, e);
        }
      }
    },
    async showMessage(text: string) {
      await message(text);
    },
    async showOpenDialog() {
      const selected = await open({
        multiple: false,
        filters: [{
          name: 'Markdown',
          extensions: ['md', 'markdown']
        }, {
          name: 'Text',
          extensions: ['txt']
        }, {
          name: 'All Files',
          extensions: ['*']
        }]
      });
      if (selected === null) return null;
      return Array.isArray(selected) ? selected[0] : selected;
    },
    async showSaveDialog() {
      return save({
        filters: [{
          name: 'Markdown',
          extensions: ['md', 'markdown']
        }, {
          name: 'Text',
          extensions: ['txt']
        }, {
          name: 'All Files',
          extensions: ['*']
        }]
      });
    },
    async confirmClose(fileName: string): Promise<'save' | 'discard' | 'cancel'> {
      return new Promise((resolve) => {
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
        text.textContent = `Do you want to save changes to ${fileName}?`;
        text.style.margin = '0 0 20px 0';
        modal.appendChild(text);

        const btnContainer = document.createElement('div');
        btnContainer.style.display = 'flex';
        btnContainer.style.justifyContent = 'flex-end';
        btnContainer.style.gap = '10px';

        const saveBtn = document.createElement('button');
        saveBtn.textContent = 'Save';
        const discardBtn = document.createElement('button');
        discardBtn.textContent = "Don't Save";
        const cancelBtn = document.createElement('button');
        cancelBtn.textContent = 'Cancel';

        const close = (result: 'save' | 'discard' | 'cancel') => {
          document.body.removeChild(overlay);
          resolve(result);
        };

        saveBtn.onclick = () => close('save');
        discardBtn.onclick = () => close('discard');
        cancelBtn.onclick = () => close('cancel');

        btnContainer.appendChild(saveBtn);
        btnContainer.appendChild(discardBtn);
        btnContainer.appendChild(cancelBtn);
        modal.appendChild(btnContainer);
        overlay.appendChild(modal);

        document.body.appendChild(overlay);
        saveBtn.focus();
      });
    },
    async setTitle(title: string) {
      await getCurrentWindow().setTitle(title);
    },
    async openExternal(url: string) {
      await openUrl(url);
    },
    async getCliOpenPath() {
      return invoke<string | null>('get_open_path');
    },
    onFileDrop(cb: (path: string) => void) {
      getCurrentWindow().onDragDropEvent((event) => {
        if (event.payload.type === 'drop' && event.payload.paths.length > 0) {
          cb(event.payload.paths[0]);
        }
      });
    },
    onCloseRequested(cb: () => Promise<boolean>) {
      const win = getCurrentWindow();
      let closing = false;
      win.onCloseRequested(async (event) => {
        if (closing) return;
        event.preventDefault();
        const allowed = await cb();
        if (allowed) {
          closing = true;
          try {
            await win.destroy();
          } catch (e) {
            console.error("Failed to destroy window:", e);
          }
        }
      });
    }
  };
}
