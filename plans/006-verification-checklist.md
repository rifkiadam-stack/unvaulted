# Verification Checklist - Plan 006

Filled from the operator's install-test on the rebuilt (R1/R2) installer,
recorded by the reviewer 2026-07-16. The first installer (pre-R1/R2) failed
items 4/5/11; this records the passing re-test after the `Unvaulted.exe` rename
+ custom `read_file` command.

1. [x] Installer runs per-user (no UAC admin prompt) and completes.
   - Note: PASS — per-user, no UAC (R4 resolved once the binary was named correctly with `installMode: currentUser`).
2. [x] Start menu entry "Unvaulted" exists and launches the app.
   - Note: PASS.
3. [x] In Explorer, right-click a `.md` file → **Open with** lists Unvaulted.
   - Note: PASS.
4. [x] "Open with → Unvaulted" opens the app with that file loaded and rendered.
   - Note: PASS — file now loads and renders. Failed before R2; fixed by the custom `read_file` Rust command (plugin-fs static scope was refusing association/CLI paths).
5. [x] The **existing default** `.md` handler is unchanged (double-click still opens whatever it opened before installation).
   - Note: PASS — pre-install default left intact; installer registers as a handler, does not steal the default.
6. [x] Set Unvaulted as default via Windows "Open with → Always" → double-click now opens Unvaulted with the file.
   - Note: PASS.
7. [x] Open two different `.md` files → two independent windows.
   - Note: PASS (window-per-file, per plan 004).
8. [x] SmartScreen behavior on first run recorded (unsigned build — "More info → Run anyway" expected).
   - Note: Unsigned build; SmartScreen prompt as expected → "More info → Run anyway". Code signing is the known post-MVP step.
9. [x] Uninstall (Settings → Apps) completes; app gone from Start menu; `.md` files open again with the pre-install default; no orphaned "Unvaulted" entry left in "Open with".
   - Note: PASS — clean uninstall; default reverts.
10. [x] Re-run `npm run typecheck && npm test` → still green (nothing broke).
   - Note: PASS — reviewer re-ran: typecheck OK, 79/79 tests, build OK, `cargo check` OK.
11. [x] Installer EXE and the window/taskbar show the custom Unvaulted Logo icon.
   - Note: PASS — new (black) logo on installer, titlebar, and taskbar after icon-cache refresh + `Unvaulted.exe` rename (the old `app.exe` name had resolved to a stale build's icon).
