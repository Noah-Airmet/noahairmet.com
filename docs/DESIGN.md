# Design Direction

## Chosen direction

The site uses a bright civic-modernist systems journal. It combines public
interest editorial design with visible technical structure: strong type,
rules, numbered labels, an institutional blue, and a small red risk signal.

The visual exploration rejected two alternatives:

- a warm portrait-led editorial direction was polished but too close to a
  familiar personal-portfolio template;
- a dark operational direction was powerful but felt too much like a cyber
  command center and risked making governance seem secretive or militarized.

The chosen direction stays memorable without sci-fi gradients, glass,
dashboards, cards, glowing objects, generic AI imagery, or decorative motion.

## Core system

- Display: Libre Caslon Display.
- Body/UI: DM Sans Variable.
- Metadata: Space Mono.
- Paper: `#f5f4ef`.
- Ink: `#11110f`.
- Institutional blue: `#1648c7`.
- Risk red: `#e7472d`.
- Review gold: `#f0c84c`.

Color is semantic. Blue indicates systems, action, and institutional structure.
Red marks risk or challenge. Gold marks indexes, reviewed context, and points of
orientation. None of the accents should become general decoration.

## Interaction

The site should feel excellent before JavaScript runs. Motion is reserved for
state change and relationships. There are no global page transitions,
scroll-jacking effects, ambient canvases, or cursor replacements.

The Build / Trace / Challenge / Govern loop is the primary interaction motif.
Hover and focus may emphasize a row, but the complete meaning must remain
visible without interaction and under reduced-motion settings.

## Photography brief

The existing 800x800 outdoor portrait is acceptable for the first release and
works when rendered as a large rectangular black-and-white editorial image. A
new portrait would materially improve the final site.

Request two coordinated photographs:

1. Vertical portrait, 3:4, at least 3000x4000 pixels. Frame from mid-torso with
   room around the shoulders. Look slightly off-camera in one version and into
   camera in another.
2. Horizontal environmental portrait, 3:2 or 16:9, at least 4500 pixels wide.
   Leave intentional negative space on one side for editorial crops.

Direction:

- natural or large-window light;
- neutral institutional, library, campus, or restrained architectural setting;
- navy, charcoal, cream, or muted blue clothing; texture is welcome, loud
  patterns are not;
- one relaxed smile and one thoughtful/neutral expression;
- no crossed arms, laptop posing, fake meeting setup, colored LED light, or
  shallow-focus office clichés;
- deliver full-resolution color files; the site will control the monochrome
  treatment in CSS.

## Project assets worth creating

- A simplified dependency map for the AI GRC field guide.
- A sanitized authority/control-flow diagram for agent-operated systems.
- One or two real artifact crops per case study: a framework map, control
  record, or public interface—not generic code screenshots.
- A redesigned one-page résumé PDF using the same type and hierarchy. The
  current PDF is accurate enough to launch but visually generic and not tagged
  for accessibility; the HTML résumé is the accessible source in the interim.

These assets matter more than animation budget or stock photography.
