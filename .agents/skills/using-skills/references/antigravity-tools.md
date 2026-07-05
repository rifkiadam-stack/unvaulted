# Antigravity CLI (`agy`) Tool Mapping

Skills speak in actions ("dispatch a subagent", "create a todo", "read a file"). On the Antigravity CLI (`agy`) these resolve to the tools below.

| Action skills request | Antigravity CLI equivalent |
|----------------------|----------------------|
| Dispatch a subagent for a browser/UI task (testing, web navigation) | `browser_subagent` — see [Subagent support](#subagent-support) |
| Dispatch a subagent for a general coding task (parallel implementation, research) | **No equivalent.** Antigravity has no general-purpose coding subagent — execute the task directly in the main session instead. |
| Task tracking ("create a todo", "mark complete") | a **task artifact** — `write_to_file` with `IsArtifact: true` and `ArtifactType: "task"` (see [Task tracking](#task-tracking)). **Not** `manage_task`, which manages background processes. |

## Task tracking

Antigravity has **no todo tool** (`manage_task` manages background
processes — `list`/`kill`/`status`/`send_input` — it is *not* a checklist). When a
skill says to create a todo list or track tasks, maintain a **task artifact**: a
markdown checklist saved with `write_to_file` (`IsArtifact: true`,
`ArtifactMetadata.ArtifactType: "task"`), edited with `replace_file_content` /
`multi_replace_file_content` as you go.

At the start of any multi-step task, create the task artifact listing every step of
your plan. As you complete each step, edit the artifact to mark it done (`- [x]`).
If the plan changes, update the checklist. Keep it current — it is your source of
truth for what remains; once the conversation gets long, re-read it before starting
each step.

## Subagent support

Antigravity uses the `browser_subagent` tool to run tasks inside a browser window. To invoke a subagent:
1. Specify a descriptive, capitalized `TaskName`.
2. Provide a clear, actionable, detailed `Task` description containing all necessary context and criteria.
3. Provide a `RecordingName` (lowercase with underscores) to record the browser session.

**Scope limit:** `browser_subagent` only runs actions inside a browser window. It is not a substitute for general-purpose coding-task delegation — there is no such mechanism on Antigravity. When a skill says to fan out coding or research work to subagents, execute those tasks directly in the main session instead.

