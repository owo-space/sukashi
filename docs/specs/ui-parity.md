# Sukashi UI Parity Spec

## Source UI

The existing UI is a built React/Umi single-page app:

| Surface | Evidence |
| --- | --- |
| User panel | `public/theme/default/dashboard.blade.php` loads `components.chunk.css`, `umi.css`, `vendors.async.js`, `components.async.js`, and `umi.js` into `#root`. |
| Admin panel | `resources/views/admin.blade.php` loads the same style of Umi bundles into `#root`. |
| UI framework | Built assets contain React, dva, Ant Design classes, and Ant Design Pro layout classes. |
| Theme options | `public/theme/default/config.json` defines theme color, background URL, sidebar style, header style, and custom footer HTML. |

## Visual Contract

| Contract | Requirement |
| --- | --- |
| Layout | Preserve Ant Design Pro sidebar/header/content layout density. |
| Components | Use Ant Design-style cards, tables, forms, buttons, alerts, modals, tags, menus, and pagination. |
| Theme colors | Preserve `default`, `green`, `black`, and `darkblue` theme color choices. |
| Typography | Preserve compact admin-panel typography and spacing. |
| Responsiveness | Preserve current desktop/mobile behavior before replacing routes. |
| Landing behavior | Do not replace the panel with a marketing landing page. |

## Frontend Framework Choice

Phase 1 serves the existing compiled Umi/React bundles from the TypeScript API with a Nest-rendered HTML shell equivalent to the old Blade templates. This gives an exact no-PHP UI baseline.

Phase 2 uses React TypeScript with Vite, Ant Design 4, and ProLayout 6 for maintainable source parity. This is intentionally conservative because the current panel resembles an older Ant Design Pro visual system more than the latest Ant Design major.

## Required Screenshots Before UI Replacement

| Surface | Minimum viewport set |
| --- | --- |
| User login/register | 1440x900, 390x844 |
| User dashboard | 1440x900, 390x844 |
| User order/plan page | 1440x900, 390x844 |
| User tickets/knowledge | 1440x900 |
| Admin dashboard | 1440x900 |
| Admin users | 1440x900 |
| Admin orders | 1440x900 |
| Admin server management | 1440x900 |
| Admin settings/theme | 1440x900 |

## Acceptance Rule

No TypeScript UI route replaces a production route until screenshot review confirms that the visual hierarchy, spacing, colors, and component style match the current panel closely enough that users do not perceive a redesign.
