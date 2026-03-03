# Tags UI/UX Development Plan

**Date**: 2026-03-03  
**Scope**: Tag selection interface for submission forms, admin forms, and edit record forms  
**Goal**: Beautiful, clean, intuitive UI/UX for adding/removing tags from approved Library of Congress labor taxonomy

---

## Executive Summary

This document scopes out a redesigned tag selection interface across all forms in the application. The current implementation uses a basic text input with autocomplete suggestions. We need a more visual, intuitive system that:

1. Makes the canonical tag taxonomy **discoverable** (users can browse available tags)
2. Provides **instant visual feedback** (selected tags shown as removable chips)
3. Maintains **data integrity** (only canonical tags allowed)
4. Works across **all form contexts** (public submission, admin add, admin edit)

---

## Part 1: Current State Audit

### 1.1 Data Model

**Schema** (`prisma/schema.prisma`):
```prisma
model Entry {
  tags String?  // Comma-separated: "Mining, Strikes & Lockouts, Women & Gender"
}
```

- Tags stored as **comma-separated string** (not relational)
- Simple and works well for the current scale (~1000 entries)
- No separate Tag table or many-to-many relationship

### 1.2 Canonical Tag Taxonomy

**Location**: `server/tags.ts`

**Structure**: 35 canonical tags organized into 3 groups:

| Group | Tags |
|-------|------|
| **Theme** (13) | Strikes & Lockouts, Organizing, Collective Bargaining, Labor Law & Legislation, Wages & Benefits, Working Conditions, Worker Safety & Health, Child Labor, Unemployment, Automation & Technology, Globalization & Outsourcing, Labor Culture & Arts, International Solidarity |
| **Industry** (13) | Mining, Steel & Manufacturing, Textiles & Garment, Agriculture & Farm Work, Auto & Transportation, Construction, Public Sector, Education & Teachers, Healthcare, Entertainment & Media, Service & Retail, Maritime & Dockworkers, Domestic Workers |
| **Social Dimension** (8) | Civil Rights & Race, Women & Gender, Immigration, War & Military, Socialism & Left Politics, Environment, Working Class, Politics & Elections |

**Supporting Systems**:
- `TAG_NORMALIZATION` map: 200+ legacy tag mappings → canonical tags
- `TAG_RULES`: Auto-tagging regex patterns (Strikes, Mining, etc.)
- `PEOPLE_TAGS`: Notable labor figures → associated tags
- `EVENT_TAGS`: Historical events → associated tags
- `ORG_TAGS`: Union/org names → associated tags

### 1.3 API Endpoint

**`GET /api/tags`** returns:
```json
{
  "tags": [
    { "tag": "Strikes & Lockouts", "count": 156, "group": "Theme" },
    { "tag": "Mining", "count": 89, "group": "Industry" },
    ...
  ],
  "groups": ["Theme", "Industry", "Social Dimension"],
  "canonical": ["Strikes & Lockouts", "Organizing", ...]
}
```

### 1.4 Current Form Implementations

#### Public Submission (`SubmissionWizard.tsx`)

| Category | Tag Input | Current UX |
|----------|-----------|------------|
| Film | `<input type="text" placeholder="e.g. Women, Strikes, Working Class">` | Plain text input, no autocomplete |
| History | None | No tag field |
| Music | None | No tag field |
| Quote | None | No tag field |

**Issues**:
- Only Film category has tag input
- No autocomplete or validation
- Users can type anything (no enforcement of canonical tags)
- No visual feedback for selected tags

#### Admin Edit Modal (`AdminDashboard.tsx` → `EditEntryModal`)

**Current Implementation**: `TagAutocomplete` component (lines 635-726)

```tsx
function TagAutocomplete({ value, onChange, className }) {
  // Fetches canonical tags from /api/tags
  // Shows dropdown suggestions as user types
  // Displays selected tags as small chips below input
}
```

**Strengths**:
- Fetches canonical tag list from API
- Type-ahead suggestions
- Shows selected tags as pills

**Weaknesses**:
- User must know what to type (not browsable)
- Tags only shown after being typed
- No grouping visible during selection
- Small, hard-to-read tag pills
- Can't easily remove a tag from the middle

#### FilterBar Tag Selector (`FilterBar.tsx` → `TagFilterDropdown`)

**Current Implementation**: Multi-select dropdown with groups (lines 146-249)

```tsx
function TagFilterDropdown({ category, selectedTags, onChange }) {
  // Grouped checkbox list
  // Shows tag counts
  // "Clear all" button
}
```

**This is the best existing pattern** — grouped, browsable, with counts.

### 1.5 Current UX Pain Points

| Issue | Impact | Affected Forms |
|-------|--------|----------------|
| Text input only | Users don't know available options | Submission, Edit |
| No tag grouping | Hard to find related tags | Edit |
| Missing from most categories | History, Music, Quote have no tags | Submission |
| Tiny chip display | Hard to read, hard to remove | Edit |
| No validation | Non-canonical tags can be entered | Submission |
| No "browse all" | Discovery requires knowing tag names | All |

---

## Part 2: Design Requirements

### 2.1 Functional Requirements

| Requirement | Priority | Notes |
|-------------|----------|-------|
| Show all canonical tags grouped by Theme/Industry/Social | **Must** | Borrowable from FilterBar pattern |
| Allow multi-select | **Must** | Users can assign 1-5 tags |
| Display selected tags as removable chips | **Must** | Clear visual feedback |
| Enforce canonical tags only | **Must** | No free-text custom tags |
| Type-ahead search/filter | **Should** | Quick access for power users |
| Works on mobile | **Should** | Touch-friendly tap to select |
| Show tag usage counts (admin only) | **Nice** | Helps admins see popular tags |
| Auto-suggest tags based on content | **Nice** | Already have `autoTagEntry()` function |

### 2.2 Non-Functional Requirements

- **Performance**: Instant response, no loading spinners for tag list
- **Accessibility**: Keyboard navigable, screen reader friendly
- **Consistency**: Same component across all forms
- **Visual harmony**: Match existing dark theme, red accent color

### 2.3 Form Contexts

| Context | Who Uses | Tag Behavior |
|---------|----------|--------------|
| Public Submission (all categories) | End users | Browse + select from canonical list |
| Admin Add (`SubmissionWizard` with `isAdmin`) | Admins | Browse + select + auto-suggest |
| Admin Edit (`EditEntryModal`) | Admins | Browse + select + auto-suggest + edit existing |

---

## Part 3: UI/UX Solutions — Brainstorm

### Option A: Grouped Checkbox Panel (FilterBar-style)

**Concept**: Expand the `TagFilterDropdown` pattern into a dedicated panel.

```
┌─────────────────────────────────────────┐
│ Tags                              Clear │
├─────────────────────────────────────────┤
│ 🔍 Search tags...                       │
├─────────────────────────────────────────┤
│ THEME                                   │
│ ☐ Strikes & Lockouts                    │
│ ☑ Organizing                            │
│ ☐ Collective Bargaining                 │
│ ...                                     │
├─────────────────────────────────────────┤
│ INDUSTRY                                │
│ ☑ Mining                                │
│ ☐ Steel & Manufacturing                 │
│ ...                                     │
├─────────────────────────────────────────┤
│ SOCIAL DIMENSION                        │
│ ☐ Civil Rights & Race                   │
│ ☑ Women & Gender                        │
│ ...                                     │
└─────────────────────────────────────────┘

Selected: [Organizing ✕] [Mining ✕] [Women & Gender ✕]
```

**Pros**:
- Full visibility of all options
- Grouped for discoverability
- Familiar checkbox pattern
- Search filter for quick access

**Cons**:
- Takes vertical space (scrollable)
- Many clicks for multiple selections

**Effort**: ~4-6 hours (reuse FilterBar logic)

---

### Option B: Chip/Pill Multi-Select with Dropdown

**Concept**: Compact input field that opens a grouped dropdown on focus.

```
┌─────────────────────────────────────────┐
│ Tags                                    │
│ ┌─────────────────────────────────────┐ │
│ │ [Mining ✕] [Organizing ✕] [+]       │ │
│ └─────────────────────────────────────┘ │
│         ▼ dropdown opens ▼              │
│ ┌─────────────────────────────────────┐ │
│ │ 🔍 Filter...                        │ │
│ ├─────────────────────────────────────┤ │
│ │ THEME                               │ │
│ │  Strikes & Lockouts                 │ │
│ │  ✓ Organizing                       │ │
│ │  Collective Bargaining              │ │
│ ├─────────────────────────────────────┤ │
│ │ INDUSTRY                            │ │
│ │  ✓ Mining                           │ │
│ │  Steel & Manufacturing              │ │
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

**Pros**:
- Compact when collapsed
- Selected tags always visible as chips
- Click chip to remove
- Familiar "token input" pattern

**Cons**:
- Dropdown may feel cramped on mobile
- Requires click to see all options

**Effort**: ~6-8 hours (new component)

---

### Option C: Two-Column "Available / Selected" Panel

**Concept**: Side-by-side lists — click to move tags between them.

```
┌────────────────────┬────────────────────┐
│ AVAILABLE          │ SELECTED           │
├────────────────────┼────────────────────┤
│ 🔍 Filter...       │                    │
│                    │ • Mining           │
│ THEME              │ • Organizing       │
│ • Strikes          │ • Women & Gender   │
│ • Collective...    │                    │
│                    │                    │
│ INDUSTRY           │                    │
│ • Steel & Mfg      │                    │
│ • Agriculture      │                    │
└────────────────────┴────────────────────┘
```

**Pros**:
- Very clear what's selected vs available
- Drag-and-drop potential
- Good for desktop

**Cons**:
- Takes significant horizontal space
- Poor mobile experience
- Feels "enterprise-y"

**Effort**: ~8-10 hours

---

### Option D: Tag Cloud with Toggle

**Concept**: All tags displayed as clickable pills; selected ones highlighted.

```
┌─────────────────────────────────────────┐
│ Tags (click to toggle)                  │
├─────────────────────────────────────────┤
│ THEME                                   │
│ [Strikes] [Organizing✓] [Bargaining]    │
│ [Labor Law] [Wages] [Conditions]        │
│ ...                                     │
├─────────────────────────────────────────┤
│ INDUSTRY                                │
│ [Mining✓] [Steel] [Textiles]            │
│ [Agriculture] [Auto] [Construction]     │
│ ...                                     │
├─────────────────────────────────────────┤
│ SOCIAL                                  │
│ [Civil Rights] [Women✓] [Immigration]   │
│ ...                                     │
└─────────────────────────────────────────┘
```

**Pros**:
- All tags visible at once
- One-tap toggle
- Visual, modern feel
- Great for touch

**Cons**:
- Takes vertical space
- 35 tags = potentially overwhelming
- Less familiar pattern

**Effort**: ~4-5 hours

---

### Option E: Hybrid — Collapsed Chips + Expandable Panel

**Concept**: Compact by default, full panel on demand.

**Collapsed State**:
```
┌─────────────────────────────────────────┐
│ Tags: [Mining ✕] [Organizing ✕] [+ Add] │
└─────────────────────────────────────────┘
```

**Expanded State** (click "+ Add"):
```
┌─────────────────────────────────────────┐
│ Tags                           [Done ↑] │
├─────────────────────────────────────────┤
│ 🔍 Search tags...                       │
├─────────────────────────────────────────┤
│ THEME                                   │
│ [Strikes] [Organizing✓] [Bargaining]... │
├─────────────────────────────────────────┤
│ INDUSTRY                                │
│ [Mining✓] [Steel] [Textiles]...         │
├─────────────────────────────────────────┤
│ SOCIAL                                  │
│ [Civil Rights] [Women & Gender✓]...     │
└─────────────────────────────────────────┘
```

**Pros**:
- Minimal space when not editing
- Full visibility when needed
- Best of both worlds

**Cons**:
- Two states to maintain
- Slightly more complex implementation

**Effort**: ~6-8 hours

---

## Part 4: Recommendation

### Recommended Approach: **Option E (Hybrid)** with elements of **Option D (Tag Cloud)**

**Rationale**:
1. **Compact by default** — doesn't overwhelm the form
2. **Full visibility when editing** — users can see all 35 tags grouped
3. **One-tap toggle** — fast selection/deselection
4. **Search filter** — power users can jump to specific tags
5. **Mobile-friendly** — tap-to-toggle works well on touch

### Component Name: `<TagSelector />`

### Proposed API:
```tsx
interface TagSelectorProps {
  value: string;              // Comma-separated tags string
  onChange: (tags: string) => void;
  showCounts?: boolean;       // Show usage counts (admin only)
  autoSuggest?: boolean;      // Show AI-suggested tags based on content
  contentForAutoSuggest?: {   // Entry content for auto-suggestion
    title?: string;
    description?: string;
    creator?: string;
    metadata?: string;
  };
}
```

### Reusable Across:
- `SubmissionWizard.tsx` (public + admin)
- `EditEntryModal` in `AdminDashboard.tsx`

---

## Part 5: Implementation Plan

### Phase 1: Core Component (~4-5 hours)

1. **Create `TagSelector.tsx`**
   - Collapsed state: chips for selected tags + "+ Add" button
   - Expanded state: grouped tag cloud with toggles
   - Search/filter input
   - Mobile-responsive layout

2. **Fetch tags from `/api/tags`**
   - Cache in component or React context
   - Show all canonical tags grouped

3. **Selection logic**
   - Toggle on click
   - Limit to 5 tags (configurable)
   - "Clear all" option

### Phase 2: Integration (~2-3 hours)

4. **Replace `TagAutocomplete` in `EditEntryModal`**
   - Wire up to existing `tags` state
   - Test with existing entries

5. **Add to `SubmissionWizard`**
   - Add to Film form (replace text input)
   - Add to History, Music, Quote forms (new field)

### Phase 3: Enhancements (~2-3 hours)

6. **Auto-suggest feature (admin only)**
   - Call `autoTagEntry()` on server or move to client
   - Show suggested tags with "Add all" button

7. **Polish**
   - Animations (expand/collapse)
   - Keyboard navigation
   - Accessibility audit

### Total Estimated Effort: **8-11 hours**

---

## Part 6: Visual Design Specs

### Color Palette (matching existing theme)

| Element | Color |
|---------|-------|
| Unselected tag | `bg-white/5 border-white/10 text-gray-400` |
| Selected tag | `bg-red-500/15 border-red-500/30 text-red-300` |
| Hover state | `bg-white/10 border-white/20` |
| Group header | `text-gray-500 text-[10px] uppercase tracking-wider` |
| Remove button | `hover:text-white` |
| Search input | `bg-white/5 border-white/10` |

### Typography

- Tag pills: `text-xs` (12px)
- Group headers: `text-[10px] uppercase tracking-wider font-medium`
- Search placeholder: `text-sm text-gray-600`

### Spacing

- Tag pills: `px-2.5 py-1 rounded-full`
- Gap between tags: `gap-1.5`
- Group vertical spacing: `space-y-3`
- Panel padding: `p-4`

### Responsive Behavior

| Breakpoint | Layout |
|------------|--------|
| Mobile (<640px) | Full-width panel, 2 columns of tags |
| Tablet (640-1024px) | Full-width panel, 3 columns of tags |
| Desktop (>1024px) | Contained panel, 4+ columns of tags |

---

## Part 7: Open Questions

1. **Tag limit**: Should we enforce a maximum (e.g., 5 tags)? Current system has no limit.

2. **Required field**: Should at least one tag be required for submission?

3. **Auto-tagging**: 
   - Should we auto-run `autoTagEntry()` and pre-select suggested tags?
   - Or just show suggestions that user must confirm?

4. **Public vs Admin**: Should public submitters see all 35 tags, or a simplified subset?

5. **Existing entries**: ~156 entries have tags. Need to verify all are canonical (migration already done?).

---

## Part 8: Next Steps

- [ ] Review this plan with stakeholders
- [ ] Decide on open questions (tag limit, required, auto-suggest behavior)
- [ ] Create `TagSelector.tsx` component
- [ ] Test in isolation with Storybook or standalone page
- [ ] Integrate into `EditEntryModal` first (admin testing)
- [ ] Roll out to `SubmissionWizard`
- [ ] QA across all form contexts

---

## Appendix: Canonical Tag Reference

### Theme (13 tags)
- Strikes & Lockouts
- Organizing
- Collective Bargaining
- Labor Law & Legislation
- Wages & Benefits
- Working Conditions
- Worker Safety & Health
- Child Labor
- Unemployment
- Automation & Technology
- Globalization & Outsourcing
- Labor Culture & Arts
- International Solidarity

### Industry (13 tags)
- Mining
- Steel & Manufacturing
- Textiles & Garment
- Agriculture & Farm Work
- Auto & Transportation
- Construction
- Public Sector
- Education & Teachers
- Healthcare
- Entertainment & Media
- Service & Retail
- Maritime & Dockworkers
- Domestic Workers

### Social Dimension (8 tags)
- Civil Rights & Race
- Women & Gender
- Immigration
- War & Military
- Socialism & Left Politics
- Environment
- Working Class
- Politics & Elections
