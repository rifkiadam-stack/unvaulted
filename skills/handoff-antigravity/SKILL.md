---
name: handoff-antigravity
description: Compact the current conversation into a handoff document for a Gemini agent in Google Antigravity to execute. Use when Claude has done the planning/review and the implementation will run in Antigravity.
argument-hint: "What will the Antigravity session focus on?"
disable-model-invocation: true
---

Write a handoff document so a fresh Gemini-based agent in **Google Antigravity** can pick up and execute the work. The author of this document (Claude) is the *orchestrator*: it plans and reviews, but does not execute. Antigravity is the *executor*.

## Where to save it

Save to `docs/handoff/HANDOFF-<short-slug>-antigravity.md` **inside the repository** (create the folder if needed) — NOT the OS temp directory. Antigravity may run in a separate workspace/environment, so the handoff must live on the repo filesystem where any tool can read it. After writing, print the saved path plus a one-line kickoff instruction, e.g.:

> Open a new mission in Antigravity and reference `@docs/handoff/HANDOFF-<slug>-antigravity.md` as the spec for its Planning phase.

## What the reader is (and is not)

The reader is Gemini running inside Antigravity. It will **not** understand Claude-specific constructs — do not reference `CLAUDE.md`, Claude hooks, or Claude skills as if the reader has them. Antigravity has its own equivalents instead: project context in `GEMINI.md` and `.agents/rules/`, reusable `.agents/skills/`, and a built-in **Planning → Execution → Verification** workflow that generates its own artifacts. Write the document so Antigravity treats it as the *spec input to its Planning phase*, then lets Antigravity produce its own implementation plan / task list artifact.

## Document contents

Write everything below in plain English (Gemini reads it as human instructions), tailored to the argument if one was passed.

1. **Objective** — one or two sentences on what this session must accomplish.
2. **Current state** — a concise summary of where things stand. Do NOT duplicate content that already exists in PRDs, plans, ADRs, issues, commits, or diffs; reference those by repo path or URL instead.
3. **Task list** — ordered, concrete steps. Each step has an explicit **Definition of Done** that is verifiable (a test passes, a specific file changes, a command exits 0). Vague steps cause Gemini to improvise and drift.
4. **Verification criteria** — how Antigravity confirms the work is correct. Prefer checks Antigravity can run itself: test commands, build commands, type-checks, and (where relevant) its browser-verification capability for UI flows. Keep these in sync with the task list's Definitions of Done.
5. **Constraints & guardrails** — what must NOT be touched, conventions to follow, and a reminder to honor any existing `AGENTS.md` / `.agents/rules/` in the repo over anything in this handoff if they conflict.
6. **Return for review** — instruct Antigravity to commit per completed step (one logical commit per task) so the orchestrator (Claude) can review each diff independently rather than re-reading the whole repo. State the expected commit granularity.

## Rules

- Redact any sensitive information (API keys, passwords, tokens, PII).
- Keep the document self-contained for *understanding* but lean for *content* — link out to artifacts rather than copying them.
- If a step would benefit from an existing Antigravity skill or rule already present in `.agents/`, name it; otherwise give explicit steps instead of assuming any skill exists.
- Do not write code or make edits — this skill only produces the handoff document.
