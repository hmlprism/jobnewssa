@AGENTS.md

## Task completion summary format

At the end of EVERY task, regardless of size, output a final summary block in this exact
structure — nothing after it, no additional prose:

---
TASK: [one line — what was asked]
BRANCH: [branch name]
FILES CHANGED: [file paths only, comma-separated]
COMMIT: [hash] — [one-line commit message]
BUILD: [PASS/FAIL — if FAIL, the exact error, nothing else]
WHAT CHANGED: [2-5 bullet points, plain language, no code, what a non-technical reader pastes
  into another conversation and has it make sense standalone]
NEEDS DECISION: [anything awaiting the person's confirmation before proceeding — or "None"]
TEST THIS: [exact URL(s) and what to look for — or "None, no live testing needed"]
---

Rules for this block:
- No tool-call transcripts, no intermediate diffs, no self-critique prose above this block unless
  explicitly asked to show reasoning.
- If multiple commits happened in one task, repeat the block once per commit, in order.
- WHAT CHANGED must be understandable with zero project context — assume the reader is pasting
  this into a separate conversation with no other history.
- Never omit this block, even for a one-line fix.
