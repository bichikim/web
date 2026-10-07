# Puppet Design

Puppet is a compact, canvas-first modeling and animation editor. Preserve the established dark green surfaces, mint selection accents, small controls, and direct manipulation workflow. The model is the main content; the surrounding interface helps users select, edit, and inspect it.

This document records the accepted design contract. Use the linked components and styles to implement it; do not recreate their appearance independently. Existing one-off styles are not permission to introduce more exceptions. An explicit user-requested design change takes precedence; update this document when that change becomes the new shared convention.

Shared primitives live in [design-system](src/design-system/index.ts), with their tests and size contract. Build-only icons and control shortcuts live in `uno/shortcuts`, outside runtime source. Keep editor-specific panels and modeling behavior in the editor. Register shared styles through [uno.config.ts](uno.config.ts); do not import style configuration into runtime components.

## Implementation map

| Concern                                       | Source of truth                                                                                          |
| --------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Shared control sizes, inputs, buttons, colors | [Control styles](uno/shortcuts/controls.ts), [size API](src/design-system/control-size.ts)               |
| Workspace, panels, typography                 | [Layout styles](uno/shortcuts/layout.ts), [panel layout](src/editor/internal/EditorPanelLayout.tsx)      |
| Layer density, selection, names               | [Layer styles](uno/shortcuts/layers.ts), [layer panel](src/editor/internal/EditorLayerPanel.tsx)         |
| Canvas, rulers, floating controls             | [Canvas styles](uno/shortcuts/canvas.ts), [camera viewport](src/editor/internal/CameraViewport.tsx)      |
| Parameters and keyform markers                | [Parameter styles](uno/shortcuts/parameters.ts)                                                          |
| Dialogs and menus                             | [Dialog styles](uno/shortcuts/dialogs.ts), [portal provider](src/design-system/EditorPortalProvider.tsx) |
| Icons and motion                              | [Icon shortcuts](uno/shortcuts/icons.ts), [UnoCSS configuration](uno.config.ts)                          |
| Typography, default text, portal inheritance  | [Typography contract](uno/shortcuts/typography.ts)                                                       |
| Spacing and density                           | [Spacing tokens](uno/spacing.ts), [foundation preview](src/editor/PuppetDesignLanguage.story.tsx)        |

CSS and UnoCSS own visual values. TypeScript communicates semantic state through classes and data attributes, or runtime measurements through CSS custom properties. Follow the parent AGENTS.md restrictions on styling and layering; do not add `z-index`.

## Visual language

Use the existing palette by role. These are reference values from the current styles, not a new parallel token system.

| Role                                | Reference                         |
| ----------------------------------- | --------------------------------- |
| Workspace background                | `#0b0f0e`                         |
| Panel surface                       | `#101513`                         |
| Canvas surface                      | `#111715`                         |
| Standard button surface             | `#171e1b`                         |
| Input surface                       | `#121816`                         |
| Subtle separators / control borders | `#27302d` / `#35413d`             |
| Primary / secondary / muted text    | `#edf4f0` / `#b9c5c0` / `#84918c` |
| Focus and selection accent          | `#64e5c4`                         |
| Selected control fill               | `#24443b`                         |

Keep surfaces quiet, borders thin, and corners modestly rounded. Use existing semantic warning and error styles rather than decorative accent colors. Model artwork and weight visualizations may be colorful; that does not change the editor chrome palette. Do not introduce decorative gradients, oversized cards, hero headings, or a new font family.

## Typography

The editor defaults to the body role in the [typography contract](uno/shortcuts/typography.ts). Its theme owns font sizes and families; its semantic shortcuts own size, weight, and line height together. The document root font size remains unchanged: text uses `rem` so user font scaling also scales the existing layout dimensions.

Use the Inter/system sans-serif stack for interface text. Use the shared monospace stack for units, code, coordinates, and shortcut hints; use tabular numbers for editable values. Keep normal text at regular weight, control labels at medium weight, and headings at semibold weight. Use line height to distinguish reading text from single-line controls; do not change control heights to fit larger text.

| Role           | Shared shortcut              | Use                                                                           |
| -------------- | ---------------------------- | ----------------------------------------------------------------------------- |
| Body           | `editor-type-body`           | Ordinary interface text and labels; the inherited default                     |
| Control        | `editor-type-control`        | Shared buttons, text inputs, selects, and mode actions                        |
| Numeric        | `editor-type-numeric`        | Editable values with stable digit widths                                      |
| Caption        | `editor-type-caption`        | Tooltips, compact explanatory text, and secondary status                      |
| Metadata       | `editor-type-metadata`       | Dense layer details and unit hints                                            |
| Micro          | `editor-type-micro`          | Short counts and ruler/marker metadata; never instructions or primary actions |
| Section        | `editor-type-section`        | Panel and fieldset headings; hierarchy comes from weight and spacing          |
| Title          | `editor-type-title`          | Dialog headings                                                               |
| Reading        | `editor-type-reading`        | Multi-line help and longer explanatory content                                |
| Document title | `editor-type-document-title` | The top heading of dedicated help or design reference content                 |

New interface text must inherit the body role or choose one of these semantic shortcuts. Extend the closest owning shortcut when a nested selector needs a role. Use `text-editor-*` theme tokens only when composing an existing style that already owns its weight and line height. Do not use generic text-size utilities, arbitrary font sizes, native heading sizes, or an independently enlarged action label for ordinary interface text. Icon glyphs and model-space SVG annotations have separate geometry contracts.

Apply `editor-type-root` to every independently mounted popup or portal surface. Existing surfaces compose it in their owning shortcuts. Its scoped, zero-specificity inheritance rule makes native controls and headings inherit typography without overriding explicit roles, including outside the editor main element and inside the custom element's Shadow DOM. Composing this shortcut also covers future portal surfaces without a separate selector registry. Validate computed sizes in both workspace and portal content when changing typography.

Mesh vertex markers and deformer control points keep an 8px screen-space diameter at every document size and camera zoom. CSS compensates for camera zoom; do not derive marker size from document bounds. Deformer rotation centers retain a 16px visible diameter and a 20px hit diameter at every zoom. Mesh and deformer markers use a 2px screen-space stroke, including selected markers; selection changes their colors. Compensate the stroke for the outer camera scale as well as the marker radius.

## Controls and sizes

The shared control height is the outer, border-box height. Pixel equivalents below assume a 16px root font size.

| Size | Height                | Use                                                                       |
| ---- | --------------------- | ------------------------------------------------------------------------- |
| `sm` | `1.40625rem` / 22.5px | Default inspector actions, numeric and text inputs, compact mode switches |
| `md` | `1.75rem` / 28px      | Modeling/Animation switch, layer toolbar actions, view action buttons     |

Use the component's `size` property and `--editor-control-height`; do not override heights at individual call sites. Align neighboring controls by their outer edges and center labels and icons vertically. A segmented switch's entire frame has the requested height, not each inner segment plus extra frame padding.

Layout chrome and canvas manipulation handles are separate from form controls. Diamond keyform markers have their own component and geometry; do not force them into the rectangular button sizes. The layer count badge aligns to the 28px layer toolbar height.

| Input or action                    | Reuse                                                              |
| ---------------------------------- | ------------------------------------------------------------------ |
| Ordinary action                    | [EditorButton](src/design-system/EditorButton.tsx)                 |
| Independent pressed action         | [EditorToggleButton](src/design-system/EditorToggleButton.tsx)     |
| Mutually exclusive modes           | [EditorSegmentedField](src/design-system/EditorSegmentedField.tsx) |
| Number with stepping and scrubbing | [EditorNumberField](src/design-system/EditorNumberField.tsx)       |
| Text                               | [EditorTextInput](src/design-system/EditorTextInput.tsx)           |
| Select                             | [EditorSelect](src/design-system/EditorSelect.tsx)                 |
| Boolean                            | [EditorCheckbox](src/design-system/EditorCheckbox.tsx)             |
| Color                              | [EditorColorField](src/design-system/EditorColorField.tsx)         |
| Range                              | [EditorRangeInput](src/design-system/EditorRangeInput.tsx)         |
| Diamond keyform action             | [EditorDiamondButton](src/design-system/EditorDiamondButton.tsx)   |

- Segmented fields fit their contents. Auto/Manual and Joint/Smooth switches must not stretch across the inspector. Modeling/Animation uses `md`; compact inspector switches use `sm`.
- Give text buttons enough intrinsic width for their full label. In particular, parameter-add actions must not inherit a square icon-button width.
- Number fields use the shared 11px numeric typography and stay within the control height. Unfocused display and scrubbing abbreviate decimals without rounding the stored value; direct input exposes the full value. Brush settings display at most two fractional digits.
- Drag an unfocused number to scrub; focused pointer gestures select text. For bounded fields, the input and unit area spans the full range: its left edge is the minimum, its right edge is the maximum, and intermediate positions map linearly. Arrow buttons are outside that range. Unbounded fields use relative horizontal movement; Shift reduces subsequent movement only for those fields. Escape, pointer cancellation, or losing window focus cancels the drag. Wheel scrolling must not change numeric values. Keep this behavior in [EditorNumberField](src/design-system/EditorNumberField.tsx).
- Bounded scrubbing follows an explicit numeric step while preserving both endpoints. Enter ends text editing with focus inside the control so modal focus containment does not restart text selection. Disabled fieldsets also block scrubbing. Numeric edits must remain mounted across document updates; match mutable list entries by their persistent identifiers. Ignore negligible numeric round-trip differences when tracking an active edit.
- Use the existing Tabler icon vocabulary. Icon-only actions need accessible names and concise tooltips. [EditorTooltip](src/design-system/EditorTooltip.tsx) provides the shared top-layer surface, following Pomo: hover after 400ms, immediate keyboard-focus display, Escape/click dismissal, and a 150ms pointer grace period. Supply `title` on EditorButton or `data-tooltip` on other controls for explanatory copy; labeled icon buttons use their accessible name by default. CSS anchors own placement; unsupported browsers fall back to native titles.
- Center color swatches horizontally and vertically inside their triggers.
- Preserve hover, pressed, disabled, and visible keyboard-focus states. Do not use color alone to communicate a pending change or an error.

## Workspace and density

Keep the toolbar above a central canvas, the layer tree on the left, the inspector on the right, and parameter/timeline editing below. Panels resize and close independently. Do not let inspector content establish the canvas width or force the entire workspace to scroll.

Use the shared spacing contract below. Compact does not mean touching: retain clear space between a section label, its controls, and the next section. Avoid blank columns between disclosure arrows, layer icons, and titles.

Preserve `min-width: 0` and shrinkable grid tracks where names and fields share a row. Allow action rows to wrap where necessary instead of clipping text. Do not solve overflow by shrinking every control or enlarging every panel.

Panel close gestures use half the minimum size as the release threshold. Reaching the minimum size alone must not close a panel. Keep the sizing and gesture policy in [use-panel-layout.ts](src/editor/use-panel-layout.ts).

## Spacing

The [spacing theme](uno/spacing.ts) owns a compact, rem-based scale. Pixel equivalents assume a 16px root font size. Compose its named tokens through UnoCSS padding, margin, and gap utilities in the owning shortcuts; do not introduce independent spacing values for ordinary interface layout.

| Token            | Size | Role                                                          |
| ---------------- | ---- | ------------------------------------------------------------- |
| `editor-tight`   | 2px  | Joined segments and dense metadata                            |
| `editor-related` | 4px  | Closely related actions, checkbox labels, and menu row detail |
| `editor-control` | 6px  | Icon-to-label gaps and compact action groups                  |
| `editor-field`   | 8px  | Field rows, inner group padding, and control text insets      |
| `editor-group`   | 12px | Panel padding, toolbar side insets, and separate groups       |
| `editor-section` | 16px | Dialog padding and separation between dialog sections         |
| `editor-reading` | 24px | Dedicated help and design reference content                   |

Keep spacing inside a group smaller than spacing between groups. Panels own their outer inset; layout parents own sibling gaps. Do not stack a parent's gap with a child's margin for the same separation, or add a first section's top margin to the panel inset. Inspector groups use the field inset and group separation; standard dialogs use the section inset. Menus retain a compact control inset around field-inset rows.

Control heights remain governed by the shared size API. Text controls have zero block padding and field-size inline padding; square icon actions keep zero padding. Segmented frames use tight padding and gaps. Toolbars reserve only the vertical clearance their controls and focus outlines need, and preserve the existing horizontal scrolling behavior.

Hierarchy indentation, model-space geometry, marker clearances, animation travel, resize handles, and reserved action slots have separate measurement contracts. Keep those dimensions with their owning geometry instead of rounding them to the spacing scale. Validate rendered grouping, focus outlines, portal insets, and local scrolling at narrow and wide viewport sizes after spacing changes.

## Layer tree

- Keep hierarchy indentation restrained and reuse the shared row structure. Group nesting must not add unnecessary empty horizontal space.
- Layer rows retain at least 256px of content width plus hierarchy indentation. When the panel is narrower, scroll the layer list horizontally instead of collapsing names, thumbnails, badges, or state actions into each other. Names still truncate within the available row width.
- Group and part names support the same rename interaction.
- Long unselected titles show an ellipsis. Only selected, overflowing titles scroll continuously in one direction; they do not bounce back and forth. Keep the full name available through the existing title treatment.
- Respect reduced motion: retain readable truncated names without marquee animation.
- Preserve the selected row's mint outline/accent and darker selected surface, with visibility and lock actions aligned at the row end.
- Display siblings front to back: the upper row covers lower rows on the canvas. Scene arrays retain back-to-front paint order; reverse only the layer-tree presentation, and translate move/drop actions accordingly. Apply the same rule inside groups and deformers.
- Show the total vertex count in the layer panel footer, separate from individual row metadata.

Reference: [LayerName](src/editor/internal/LayerName.tsx).

## Inspector and canvas interactions

Expose the controls for the current selection, not a repeated settings block for every object in the document. For skinning, keep the editing part pinned while the user chooses a joint directly in the canvas or layer tree. Do not reintroduce an ever-growing list or dropdown of every deformer as the primary connection workflow.

Use compact segmented controls for actual mode choices. Connection distance is Auto/Manual; it is not merely an expandable section called adjustment. Numeric controls appear where they are relevant to the selected mode. Brush operations reuse the shared weight brush/tool controls.

Keep explanatory prose out of routine editing surfaces. Prefer short labels, contextual tooltips, and actionable feedback. Do not restore removed Glue headings, selection instructions, or navigation tutorials as permanent panel content. Show the start-connection action only when a vertex is selected.

Keep coordinate rulers at the top and left of the canvas. Pan and zoom change the view, not model coordinates. Preserve two-axis trackpad navigation and pinch zoom. Origin/100%, Fit, and View Settings are compact icon actions near the lower-right corner; X, Y, and zoom fields live in the settings popup. Clicking outside that popup closes it.

Floating controls must remain inside the visible canvas and must not collide. Place temporary-change status at the upper-right, with other display controls stacked separately. Temporary-change actions use compact 10px labels and `sm` controls, with a square dismiss action joined to the status button: no gap, one outer outline, and an internal divider. When deletion confirmation hides the dismiss action, restore all corners of the remaining button. Mask-boundary visibility is an icon toggle beside the lower-right view actions, using the same 28px square size and a visible pressed state. Keep its accessible name and tooltip; do not restore the text card. Keep the parameter row's return arrow at the upper-right of its control area.

Glue controls reuse the existing number fields and keyform/temporary-form workflow. Without a parameter targeting the A part, edit B ratio and attachment strength directly as static settings. Otherwise store them on the connection's A-part keyform. Show only connections related to the selected parts. When the B part is selected, identify the A part that owns editing. Edge attachments expose strength only. Creating or removing a connection remains a structural edit.

## Brush and keyform tools

Mesh editing offers move, expansion/contraction, and smoothing brushes with shared radius, strength, and hardness fields. Smoothing blends each interior vertex toward its unique triangle-connected neighbors, preserving inferred outlines, hole boundaries, and explicit boundary loops; it uses radius and strength and is disabled without interior vertices. Cache mesh connectivity between pointer events. Expansion uses horizontal drag distance: right expands, left contracts, and Shift forces contraction. A stroke previews while dragging and commits once on release; existing cancellation and undo behavior applies.

A 2D warp grid offers point selection, move, expansion/contraction, and smoothing in the shared bottom brush selector. Selecting a mesh or warp deformer changes the tools in that single location; brush settings use the existing toolbar above the canvas. Move and expansion/contraction include boundary points and support one-cell grids; smoothing requires interior points and preserves the outer boundary. Share radius and strength across the modes, and expose hardness for move and expansion/contraction. Measure radius and displacement in displayed model coordinates, including ancestor deformations, then convert edited points back to the deformer coordinates. Carry curvature handles with their owning points. Escape, lost pointer capture, window blur, and changing brush modes discard an unfinished stroke.

The parameter toolbar's Keyform Tools dialog provides motion mirroring and four-corner generation. Mirroring targets the parameter value reflected around its default, with a selected horizontal or vertical geometry axis and a configurable mesh center. Preserve vertex order and UVs. Meshes, warp grids, and rotation deformers are supported; show an actionable message for unsupported targets. Warp and rotation deformers use their own reference centers.

Keep parameter creation, keyform tools, geometry editing modes, and brush tools on one horizontal toolbar row. Narrow workspaces scroll this toolbar horizontally; preserve intrinsic button and segmented-control widths, and keep keyboard-focused actions reachable through the same scroll container.

Create and delete keyforms through the track/grid context menu rather than persistent toolbar buttons. Right-click selects the requested binding and value; addition is available only at an empty value, and deletion only on an existing keyform. Double-click an empty track/grid position to create a keyform at that value. Backspace or Delete removes the selected keyform while the track or a marker has focus; typing, composition, modifier chords, and key repeat must not delete keyforms. Preserve preview-only bindings and restore track focus after a menu closes or a marker is deleted. These actions use the existing document history.

Corner generation requires exact center and four axial endpoint forms in a 2D parameter binding. Choose the parameter defaults or range midpoints as the center, and add both axial displacements to that reference. Preserve existing destination forms unless the overwrite checkbox is selected. Errors remain in the dialog; successful application closes it and records one undoable document edit. Mirroring also selects its destination value.

## Temporary changes

Reference: [TemporaryFormButton](src/editor/internal/TemporaryFormButton.tsx), [temporary form session](src/editor/internal/use-temporary-form.ts).

- Editing without a selected keyform accumulates into one temporary form per layer in the temporary-edit workflow. It must not silently create a persistent keyform.
- Selecting a keyform shows that keyform's shape. The retained temporary-change button adds an exclamation mark and a brief shake, not continuous attention-seeking motion.
- Hovering or keyboard-focusing the button previews the temporary form; leaving restores the selected form. Respect reduced motion.
- Clicking the button with a target keyform selected opens a save confirmation. Only confirmation commits the temporary form to that layer in the selected keyform.
- Switching layers retains each layer's temporary form. Returning to a layer with a draft restores its button without automatically showing the draft shape.
- The adjacent close action changes the button to a deletion question. A second click deletes; clicking elsewhere cancels that confirmation.

Keep document edits and temporary previews distinct. Do not describe an unsaved preview as a saved keyform.

## Preventing drift

For a design change, use the closest existing component before introducing a new primitive. Fix a recurring visual problem at the shared component or shortcut that owns it. Keep behavioral policy in its existing state owner. Update this document for accepted design decisions rather than copying every CSS declaration into prose.

Recheck the affected scenarios using the same model and viewport before and after a change:

1. An inspector row containing a number field, button, and segmented switch: equal intended heights, centered contents, no stretched switch.
2. A narrow layer panel with nested groups and long names: ellipsis, selected one-way scrolling, aligned row actions, visible footer count.
3. A narrow parameter area with add buttons and diamond markers: readable labels, unchanged marker geometry, no text escaping buttons.
4. A panned/zoomed canvas with a popup open: attached rulers, correctly placed controls, no overlap, outside-click dismissal, usable keyboard focus.
5. A temporary edit followed by a keyform selection and a layer round trip: correct visible shape, retained status, preview restoration, explicit save and deletion.

Check reduced-motion and disabled states where affected. Use DOM/computed dimensions and focused tests for mechanical requirements; inspect the rendered result for spacing and hierarchy. Passing logic tests alone does not establish visual correctness. Do not claim a responsive layout or state was verified unless it was actually exercised.

The documentation approach follows [Vercel's design.md article](https://vercel.com/blog/how-our-agents-build-on-brand-pages-with-design-md): keep design judgment, reusable implementation, and repeatable checks connected. Puppet's own components and accepted interaction decisions define its appearance; Vercel's visual branding does not.

## Rest mesh editing

The right inspector offers a compact Rest placement / Deformation editing segmented control when a part is selected in Modeling, matching the deformer mode control. Keep this switch out of the canvas overlay. Mesh mode shows the undeformed document and moves existing vertices together with their UV coordinates; it does not create a keyform. Preserve parameter shapes and skin weights by sampling their existing fields at the new vertex position. Keep vertex addition and deletion disabled in this mode.

Pending temporary forms must be saved or removed before entering Mesh mode. Explain this restriction in the control tooltip. Report unsupported vertex animation tracks, non-affine UV mappings, out-of-mesh moves, and invalid triangles without changing the document. Returning to Form mode restores the parameter preview.

Clipping uses texture alpha for both ordinary and nested masks. A separate contour mesh must not be required to compensate for transparent pixels being ignored.
