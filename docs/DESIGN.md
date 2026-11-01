# Frame House / Admin Studio

Reference lock: the existing Frame House website is the primary design system. Its actual src/index.css defines Inter for UI, Montserrat for display, deep black #070505, crimson #D61E2B, warm white #F7F4EF and muted #B7B0A7. Preserve those roles. Refero live research was unavailable (NO_SUBSCRIPTION); use its bundled Craft Details reference for focus-visible, form semantics, touch targets, motion and state handling.

Direction: a creative production workspace. A permanent narrow rail provides direct access to the four existing sections, with a compact mobile navigation. Broad headings, numbered sections and thin rules give hierarchy. Crimson belongs to selected navigation and primary actions; errors retain their own red status semantics. Quiet neutral surfaces keep forms readable. No invented metrics, renamed fields, schema changes or authentication bypasses.

| Decision | Source | Role | Reason |
| --- | --- | --- | --- |
| Black / crimson / warm white | Frame House src/index.css | Canvas / primary action / text | Brand continuity |
| Inter / Montserrat | Frame House src/index.css | UI / display headings | Familiar brand, readable dense forms |
| Persistent navigation | User's ease-of-use requirement | Four existing sections | Removes need to discover navigation inside tools drawer |
| Framed motion artwork | Frame House brand and Remotion brief | Login decoration only | Memorable entrance without blocking actions |
| Reduced motion and visible focus | Refero Craft Details | Accessibility | Keyboard and mobile usability |
| Existing forms and handlers | User's preservation constraint | All data | Keep content and permissions unchanged |

Motion: UI entrances 240ms, hover 160ms, no delayed form controls. Remotion login loop is decorative, lazy loaded, paused when hidden and replaced with a static scene for reduced motion. No autoplay sound.
