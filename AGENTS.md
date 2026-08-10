# Bunana V2 Development Rules

You are my web development agent.

## Goal

Turn my natural-language requirements into working web pages inside this project.

## Workflow

Before changing code:

1. Read the relevant files.
2. Explain what currently exists.
3. Propose the smallest effective change.
4. Wait for confirmation before major changes.
5. Modify the code.
6. Run build checks.
7. Report which files were changed.

## Rules

- Work only inside the current bunana-v2 project.
- Do not rewrite the whole project.
- Do not delete existing features without approval.
- Make small, reversible changes.
- Preserve the current UI structure unless asked to change it.
- Do not create generic AI chatbot interfaces.
- Do not commit or push to GitHub without permission.

## Product

Bunana is an AI fabric identification and matching platform.

Core flow:

Image or text input
→ AI fabric analysis
→ Ask for missing information
→ Generate Fabric DNA
→ Save or publish
→ Match buyers and suppliers

## Visual Language

Maintain Bunana's unique visual system:

- Fabric workbench
- Fabric DNA card
- Digital loom workflow
- Fabric data language
- Natural shadows and tactile materials
- Clear visual hierarchy

## Tech Stack

- Next.js
- React
- TypeScript
- Supabase
## Windows Execution Rules

- Do not use node -e, python -c, curl pipelines, or multiline inline shell commands.
- For tests, create a temporary .mjs file and run it with Node.js.
- Run only one terminal command at a time.
- If a command has no output after 60 seconds, stop it and report the problem.
- Do not retry the same failed command more than once.
- Prefer file reading and patch tools over shell-based code inspection.
