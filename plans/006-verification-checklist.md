# Verification Checklist - Plan 006

1. [ ] Installer runs per-user (no UAC admin prompt) and completes.
   - Note: 
2. [ ] Start menu entry "Unvaulted" exists and launches the app.
   - Note: 
3. [ ] In Explorer, right-click a `.md` file → **Open with** lists Unvaulted.
   - Note: 
4. [ ] "Open with → Unvaulted" opens the app with that file loaded and rendered.
   - Note: 
5. [ ] The **existing default** `.md` handler is unchanged (double-click still opens whatever it opened before installation).
   - Note: 
6. [ ] Set Unvaulted as default via Windows "Open with → Always" → double-click now opens Unvaulted with the file.
   - Note: 
7. [ ] Open two different `.md` files → two independent windows.
   - Note: 
8. [ ] SmartScreen behavior on first run recorded (unsigned build — "More info → Run anyway" expected).
   - Note: 
9. [ ] Uninstall (Settings → Apps) completes; app gone from Start menu; `.md` files open again with the pre-install default; no orphaned "Unvaulted" entry left in "Open with" (or note if Windows keeps a stale entry).
   - Note: 
10. [ ] Re-run `npm run typecheck && npm test` → still green (nothing broke).
   - Note: 
11. [ ] Installer EXE and the window/taskbar show the custom Unvaulted Logo icon.
   - Note: 
