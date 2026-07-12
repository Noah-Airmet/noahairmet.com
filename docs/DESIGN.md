# Design Direction

## Soft modularism

The site should feel like a small interactive desk, not a miniature consultancy.
It uses a warm paper canvas, editorial rules, direct language, and one dark
data-instrument panel. Desktop stays a two-column composition at every wide
breakpoint; narrow, short, and zoomed viewports may scroll and reflow.

## Core system

- Display/body: Space Grotesk Variable.
- Metadata: Space Mono.
- Paper: `#e9e1d2`.
- Ink: `#171716`.
- Instrument surface: `#151619`.
- Signal accents: coral `#ff6b60`, blue `#4c9cff`, violet `#a77bff`.
- Geometry: one-pixel rules, 4–6px corners, compact eight-pixel rhythm.

Avoid neo-brutalist clichés and AI-template tells: oversized offset shadows,
rainbow card systems, repeated rounded containers, pixel fonts, fake
operating-system chrome, and arbitrary roughness. Only the dark instrument is a
contained panel. The other regions are composed with spacing and rules.

## Interaction rules

- All important content is visible or reachable without drag, hover, or motion.
- Project details use native dialogs rather than new pages.
- Links reveal useful secondary labels before activation.
- The signal panel's sourced marks brighten on hover, but every value and label
  remains visible without interaction.
- Motion is short, local, and disabled under `prefers-reduced-motion`.
- No custom cursor, scroll hijacking, sound, WebGL, or loading screen.

## Dither use

The charts present two sourced facts: the public Pulpit archive snapshot and
the U.S. Bureau of Labor Statistics information-security analyst projection.
The latter is labeled as broader field context, not as an AI GRC forecast. The
renderer borrows the ordered-dither approach demonstrated by the MIT-licensed
dither-kit project while remaining plain TypeScript and canvas.

Sparse Braille and point-cloud sprites may move in the outer page margins. They
are ambient, non-interactive, hidden on constrained layouts, and stopped under
reduced motion. They should never become a mascot system or another content box.

Do not add availability dots, pulsing status indicators, generic pill badges,
gratuitous arrows in boxes, or repeated horizontal rules. These are common
portfolio-template tells and compete with the page's actual hierarchy.

## Content ceiling

The homepage carries one introduction, two selected projects, four primary
links, and one independent-project reference. Additions should replace or
consolidate existing material before increasing the page's footprint.
