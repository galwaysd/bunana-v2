# Bunana V2 Development Rules

You are my web development agent.

## Goal

Turn my natural-language requirements into working web pages inside this project.

## Workflow

Before changing code:

1. Read the relevant files.
2. Explain what currently exists.
3. Propose the smallest effective change.
4. Within the approved scope, decide necessary local implementation details and complete the work without repeated confirmation.
5. Stop only before an approval-boundary action or when a required product decision is missing.
6. Run checks that prove the stated acceptance criteria on the relevant version and environment.
7. Report the evidence and changed files.

## Execution Contract

- Codex is the execution layer. Product architecture, scope, and priority come from the user or explicitly supplied upstream decisions. Within that approved scope, Codex may choose necessary local implementation details, inspect evidence, diagnose failures, and fix regressions introduced by the current task without asking again.
- Work only within the authorized Bunana scope. Prefer the smallest usable, reversible diff. Do not opportunistically refactor adjacent code, delete features, change unrelated UI or process unrelated working-tree changes.
- If work encounters an architecture conflict, stop only the affected portion when it would cross an approval boundary. Continue safe inspection, evidence collection, and already-approved work; report the conflict and minimum decision needed. Do not self-authorize a broader redesign.
- Do not add dependencies, external services, broad abstractions, new fallbacks, compatibility layers, or artifacts without a current consumer unless explicitly required. This does not prohibit a necessary local helper, existing error handling, or a narrowly scoped implementation detail inside the approved task. Do not generate hashes or checksums without a functional, security, data-integrity, or acceptance need.
- Use targeted verification during implementation. For a code checkpoint, run the fixed acceptance gate once after the final relevant change. Do not repeat a passed check unless relevant code or environment changed, or the task explicitly requires it.
- The following actions always require explicit authorization: changing product direction; adding a new feature; changing the core data model; writing production data; deleting important files or data; adding a dependency, external service, or paid resource; commit, push, merge, or deploy; and changing security configuration. Test writes also require an explicitly identified test environment and data scope.
- Reading code or documentation, inspecting pages, ports or logs, running tests/builds, diagnosing bugs, collecting evidence, fixing a regression introduced by the current task, and choosing necessary local details within an already approved scope do not require repeated confirmation.
- Never use `git add -A` and never stage unrelated changes. When a Git, deployment, or external-configuration action is authorized, perform only the specifically approved action and scope.
- Explicit read-only or no-write instructions prohibit all file changes, including automatic Obsidian updates.
- Acceptance evidence must identify the relevant source version or working tree, runtime/deployment environment, viewport when visual, and test case when behavioral. A passed typecheck or build alone does not prove the page or business flow works.
- Once the stated acceptance criteria are met on the relevant version and environment, report the evidence and stop. Do not continue polishing or create unrequested follow-up work.
- Follow the current authorized task in `下一步.md`. Stage goals do not authorize development, testing, deployment, or continued work when the user has paused it. Defer unrelated architectural work.

## Product

Bunana is an AI fabric identification and matching platform.

Core flow:

Image or text input
→ AI fabric analysis
→ Generate Fabric DNA
→ User review and field editing
→ Save or publish
→ Market discovery and lightweight conversation

Automatic follow-up and intelligent matching are future capabilities, not current default runtime behavior.

## Visual Language

Maintain Bunana's unique visual system:

- Fabric workbench
- Fabric DNA card
- Preserve the visual baseline approved in the current task contract. Digital loom references are historical design context, not a mandatory workflow or authorization to restore it.
- Fabric data language
- Natural shadows and tactile materials
- Clear visual hierarchy
- Do not create generic AI chatbot interfaces.

## Tech Stack

- Next.js
- React
- TypeScript
- Supabase
## Windows Execution Rules

- Do not use node -e, python -c, curl pipelines, or multiline inline shell commands.
- For tests, create a temporary .mjs file and run it with Node.js.
- Run only one terminal command at a time.
- If a command is quiet longer than expected, inspect its process state and logs first. Poll known long-running builds or tests within a reasonable bounded timeout; stop and report only when it is stalled or no safe progress remains.
- Do not blindly repeat an unchanged failed command. After identifying and changing a relevant permission, environment, process, or input condition, a bounded retry is allowed.
- Prefer file reading and patch tools over shell-based code inspection.
- Do not run `next dev` and `next build` concurrently against the same `.next` directory. Stop the development server or use an isolated build directory before the final production build.

## Project Documentation Protocol

The only source of truth for Bunana project documentation is the Obsidian directory:

`C:\Users\pc\Documents\Obsidian Vault\X小布`

The Git repository retains `AGENTS.md`, application code, and the project's existing tests, scripts, and build/deployment configuration. Never create or maintain a second `00_总控/`, `01_开发记录/`, `02_审计/`, or `03_参考资料/` tree inside the Git repository.

Before starting every task, read these files from the Obsidian source of truth:

1. `C:\Users\pc\Documents\Obsidian Vault\X小布\00_总控\产品总纲.md`
2. `C:\Users\pc\Documents\Obsidian Vault\X小布\00_总控\当前状态.md`
3. `C:\Users\pc\Documents\Obsidian Vault\X小布\00_总控\下一步.md`
4. `C:\Users\pc\Documents\Obsidian Vault\X小布\00_总控\checkpoint.md`

The phrase `当前进度` refers to the existing source-of-truth file `00_总控\当前状态.md`. Do not create a second state file named `当前进度.md`.

`产品总纲.md` defines long-term direction; `当前状态.md` records dated facts and verification gaps; `下一步.md` holds the sole active authorization; `AGENTS.md` defines execution rules. Historical records and proposed candidates do not authorize work. The user's latest explicit instruction takes precedence over stale task text.

After a phase is genuinely complete, automatic documentation writes are limited to these three Vault files:

1. `00_总控\当前状态.md`
2. `00_总控\下一步.md`
3. `00_总控\checkpoint.md`

Do not automatically modify `产品总纲.md`, daily development records, audit files, or reference documents. Change them only when the user explicitly requests it.

The read-only/no-write rule in the Execution Contract takes precedence: when a task explicitly forbids writes, do not update the Vault automatically.

Follow these rules for every task:

1. After a genuinely completed development or review phase, update the Vault's `00_总控\当前状态.md` and `00_总控\checkpoint.md` with evidence from the real code, Git state, and checks actually run, unless the task is read-only/no-write or documentation writes were excluded.
2. Update the Vault's `00_总控\下一步.md` when the active task contract changes. It must contain only one `当前唯一任务`, its basis, scope, completion criteria, and paused items; never maintain parallel active candidates or use it as a backlog. A user-directed change may pause or replace an unfinished task without first completing it.
3. `当前状态.md` may only contain claims supported by current source code, Git state, or commands/tests actually run. It must keep a fixed `未验证` section. Any feature that exists in code but has not been actually tested belongs there; never guess.
4. `checkpoint.md` is a dated evidence snapshot of the latest completed phase: acceptance commands and results, Git state, and changed-file scope. It never publishes the current next task; `下一步.md` is the only task contract.
5. When a phase is complete, follow the fixed Git checkpoint workflow below.
6. Keep obsolete concepts, explanations, handoffs, and historical Markdown in the Vault's `03_参考资料\`; do not create repository copies.
7. For an external full audit, prepare only: a source-code Zip, the Vault's `00_总控\产品总纲.md`, and the Vault's `00_总控\当前状态.md`. Exclude secrets, dependencies, build caches, and local virtual environments from the Zip.
8. Do not modify the Vault's existing `产品\` or `构思\` directories unless the user explicitly requests a later archive task.
9. `.fabric-similarity-lab-staging/` is historical context only. Do not restore, rebuild, move, or otherwise process it; keep only the existing historical record.

## Code Acceptance

During implementation, prefer targeted verification for the changed surface, including runtime or browser evidence when the acceptance criteria concern behavior or layout. When a code-changing task is ready for its final checkpoint, run the fixed basic code acceptance gate once after the final relevant change:

1. `tsc --noEmit`
2. `npm run build`

On Windows, `.\\node_modules\\.bin\\tsc.cmd --noEmit` and `npm.cmd run build` are accepted command-entry equivalents when PowerShell blocks `.ps1` wrappers.

Do not repeat a passed check unless relevant code or environment changed, or the task explicitly requires it. Never run the production build while a development server is writing to the same `.next` directory. Read-only audits and no-write tasks do not trigger the fixed gate unless explicitly requested.

Lint is not an acceptance criterion at the current stage. Record lint information when useful, but a missing or failing lint command does not block basic acceptance.

## Git Checkpoint Workflow

Use this order when a code-changing phase is ready for a checkpoint:

1. Run `git status`.
2. Run `tsc --noEmit`.
3. Run `npm run build`.
4. When documentation writes are allowed, update only `00_总控\当前状态.md`, `00_总控\下一步.md` when the task contract changed, and `00_总控\checkpoint.md` in `C:\Users\pc\Documents\Obsidian Vault\X小布` with the real results.
5. If commit, push, merge, or deploy was not already authorized, stop before that action and report the checkpoint evidence. Do not request confirmation again for code or verification work already approved in the task.
6. Only after explicit authorization, perform the specifically authorized Git or deployment action.
