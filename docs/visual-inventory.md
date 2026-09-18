# Reference inventory

Seven embedded 1536 × 1024 images were extracted and inspected at their native resolution before implementation. PDF sheets contain these images with surrounding page margins; use native image proportions for comparison.

- Shell: sidebar 232 px (page 4 approximately 248), top bar 70–74 px; content inset 22–26 px; pale background #f5fafc, panels #ffffff, borders #e8eef1.
- Brand: teal #087e79, dark text #111936, secondary #59677b. Green/mint #e4f7ef, blue #edf5ff, purple #f2edfc, pink #fff1f3, amber #fff7e4. No dark theme.
- Typography: closest available system sans (Arial), headings 32–36 px/700, section titles 17–20 px/600, body 14 px, table 12–13 px, metadata 11–12 px. Reference is rasterized so original font cannot be reliably identified.
- Sidebar: logo 195 × 48, navigation 44 px high, 7 px corners, 8 px vertical gaps; botanical panel bottom aligned. Leaf logo and botanical stem recovered individually from page 2. Supplied mountain logo differs from the PDF leaf brand; PDF takes precedence, supplied original is retained.
- Header: search roughly 530 × 40 px; actions 40 px tall; avatar 36 px; right-aligned account controls.
- Cards: radius 9–12 px, border 1 px, 14–20 px padding, 14–16 px gaps, 56 px circular pastel icon surfaces. Summary cards 95–120 px high.
- Tables: header 40 px, rows 49–53 px; small 32 px avatars, 24–28 px product icons, 32 px action buttons. Client table columns: selection 3%, name 17%, phone 12%, email 15%, products 11%, renewal 11%, contact 11%, status 10%, actions 10%. Renewal/follow-up workspace roughly 74% table / 26% supporting column.
- Calendar: 7 columns, 36–40 px date cells, teal selected day; next/previous month and selected-day information. Cards stack on tablets, navigation drawer below 1000 px; tables scroll within their containers.
- Lead board: five columns, 10–12 px gaps, tinted containers; Won and Lost vertically stacked in fifth column. Cards white, compact, initials when no authorized photo is available.
- Inputs/buttons: 40 px, 5–7 px corners, restrained outlines; teal primary buttons; thin Lucide line icons, no emoji. Badge 22 px, pastel fill and readable text.

Shared components: Shell, PageHeading, MetricCards, Panel, Tabs, Filters, Avatar, StatusBadge, ContactActions, Calendar, DataTable, Pagination, Modal, FormField, QuickActions.

Interactions: sidebar routes; global search → authorized record details; metrics → filtered lists; client row → profile with directory URL preserved; profile tabs → shared records; calendar → selected date; lead card → detail/stage selector; renewal row → payment/confirmation; follow-up → outcome/reschedule; header actions → contextual forms; notification → record; account → settings/sign out.

Data counts intentionally differ from inconsistent screenshot examples. Demo clock: 2026-09-04 12:00 Asia/Kolkata. Actual financial semantics take precedence over misleading sample amounts. Avatars use deterministic initials, not unrelated stock photos.
