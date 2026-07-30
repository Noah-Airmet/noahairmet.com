# Content guide

## Adding a field note

Create `src/content/field-notes/<slug>.md`:

```markdown
---
title: "Plain title, sentence case"
date: 2026-09-14
tag: agents          # optional, one word, lowercase
description: "One honest sentence. Appears as the lede, in RSS, and in search results."
---

The note.
```

That is the whole workflow. Numbering (001, 002, …) is computed from date
order at build time — never write numbers into titles or slugs. Slug =
filename; keep slugs short, lowercase, hyphenated, and permanent (they are
URLs).

## Voice — the part that matters

Noah is a cybersecurity student and junior developer studying toward
technical AI governance. The site's credibility comes from never claiming
otherwise. When writing or editing copy:

- State what happened, what was learned, what is still unknown. First
  person, plain sentences.
- Uncertainty is stated, not performed. "I don't know yet whether X" is
  good writing here; "one can't help but wonder about the profound
  implications of X" is banned.
- No melodrama, no "journey", no "passionate", no "deep dive", no
  "delve", no thought-leader cadence.
- Claims about skills or work require the work to exist and be linkable.
- AI assistance in producing a note gets disclosed in the note when it
  was substantive (see note 001 for the pattern).

Drafts written by an agent are proposals: Noah edits and owns every
published word. Do not publish a note Noah has not read.

## Home page

`src/pages/index.astro` holds the bio and links. The bio is three
sentences and should stay three sentences. Update facts when they change
(role, class year); do not add adjectives. The "recent" list shows the
last five notes; the full log lives at `/field-notes/`.

## What does not belong on this site

Project pages for unfinished work, a /now page that will go stale,
testimonials, analytics, newsletter capture, or anything that needs a
backend. Pulpit is linked once, as independent work, and that is enough.
