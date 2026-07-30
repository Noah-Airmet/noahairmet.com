# Claude Design kit

A self-contained context folder for exploring visual variants of
noahairmet.com in Claude Design (or any design tool/agent) without
re-deriving the project's context.

## How to use

1. Attach this folder — or the whole repo — as the local codebase.
2. Paste `PROMPT.md` as the opening prompt.
3. The other files are the prompt's supporting context:
   - `BRIEF.md` — subject, audience, direction, tokens, signature elements
   - `CONTENT.md` — every word of real copy (nothing may be invented)
   - `CONSTRAINTS.md` — hard technical and voice limits

## Ground truth

The shipped implementation is the baseline, not a sketch: run `npm run dev`
in the repo root and view `http://localhost:4321`. Styles live in
`src/styles/site.css`; all styling is in that one file on purpose.
Variants that keep the content and constraints but move the aesthetics
are welcome; variants that add content, chrome, or dependencies are not.
