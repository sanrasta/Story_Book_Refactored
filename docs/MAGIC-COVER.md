# Magic Cover Section

A personalized storybook cover generator for Shopify themes.

---

## File Structure

```
sections/
  └── magic-cover.liquid        # Orchestrator - assigns variables, loads assets

snippets/
  ├── magic-cover-form.liquid   # Form UI with accordions
  └── magic-cover-preview.liquid # Cover preview after generation

assets/
  ├── magic-cover.css           # Scoped styles (all under .mc)
  └── magic-cover.js            # MagicCover custom element
```

---

## User Flow

```
┌─────────────────────────────────────────────────────────┐
│                    MAGIC COVER SECTION                   │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌────────────────────────────────────────────────────┐ │
│  │  "See Your Child as the Hero"                      │ │
│  │  [Create Free Preview] button                      │ │
│  └────────────────────────────────────────────────────┘ │
│                          │                               │
│                          ▼                               │
│  ┌────────────────────────────────────────────────────┐ │
│  │  FORM (3 Accordion Sections)                       │ │
│  │  ├── ⭐ Main Characters (required, 1-2)            │ │
│  │  ├── 🐕 Pets (optional, 0-2, with owner)          │ │
│  │  └── 🧸 Special Items (optional, 0-3, with owner) │ │
│  │  + Story Theme dropdown                            │ │
│  │  + Special Requests textarea                       │ │
│  │  [Generate My Preview]                             │ │
│  └────────────────────────────────────────────────────┘ │
│                          │                               │
│                          ▼                               │
│  ┌────────────────────────────────────────────────────┐ │
│  │  COVER PREVIEW                                     │ │
│  │  "Your Preview is Ready!"                          │ │
│  │  [Generated Cover Image]                           │ │
│  │  [Create Your Story] → redirects to web app        │ │
│  └────────────────────────────────────────────────────┘ │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## Form Structure

### Accordion Sections

| # | Section | Icon | Required | Max | Features |
|---|---------|------|----------|-----|----------|
| 1 | Main Characters | ⭐ | Yes | 2 | Photo, Name, Age |
| 2 | Pets | 🐕 | No | 2 | Photo, Name, Owner dropdown |
| 3 | Special Items | 🧸 | No | 3 | Photo, Name, Owner dropdown |

### Auto-Collapse Behavior

Main Characters accordion auto-collapses when:
- Photo uploaded ✓
- Name entered ✓
- Age selected ✓ → **triggers collapse**

Collapsed header shows summary:
```
⭐ Main Characters *    [✓ Emma, 5 yr • Add another?]
```

---

## Photo Data Structure

```javascript
// Stored in MagicCover.photoData
{
  main: {
    '1': { file: File, preview: 'data:image/...' },
    '2': { file: File, preview: 'data:image/...' }  // optional
  },
  pet: {
    '1': { file: File, preview: 'data:image/...' },
    '2': { file: File, preview: 'data:image/...' }
  },
  item: {
    '1': { file: File, preview: 'data:image/...' },
    '2': { file: File, preview: 'data:image/...' },
    '3': { file: File, preview: 'data:image/...' }
  }
}
```

---

## Owner Assignment

Pets and Items can be assigned to specific characters:

```
┌─────────────────────────────────┐
│  🐕 Pets                        │
│  ┌─────────────────────────────┐│
│  │ [Photo of dog]              ││
│  │ [Pet name: Buddy         ]  ││
│  │ [Belongs to: ⭐ Emma     ▼] ││
│  └─────────────────────────────┘│
└─────────────────────────────────┘
```

Owner dropdown options update dynamically:
- 👥 Everyone (default)
- ⭐ Hero 1's name
- ⭐ Hero 2's name (if added)

---

## Story Data (sent to web app)

```javascript
{
  characters: [
    { id: 'main-1', type: 'main', name: 'Emma', age: '5', photo: '...' },
    { id: 'main-2', type: 'main', name: 'Max', age: '7', photo: '...' }
  ],
  pets: [
    { name: 'Buddy', photo: '...', ownerId: 'main-1', ownerName: 'Emma' }
  ],
  items: [
    { name: 'Teddy Bear', photo: '...', ownerId: 'everyone', ownerName: 'Everyone' }
  ],
  theme: 'dinosaur',
  customRequest: 'Add a magical forest scene',
  coverUrl: 'https://...'
}
```

---

## JavaScript Architecture

### Custom Element: `<magic-cover>`

```html
<magic-cover
  id="MagicCover__{{ section.id }}"
  class="mc"
  data-section-id="{{ section.id }}"
>
  ...
</magic-cover>
```

### Key Methods

| Method | Purpose |
|--------|---------|
| `connectedCallback()` | Initialize, cache DOM, bind events |
| `disconnectedCallback()` | Cleanup event listeners |
| `_onPhotoChange()` | Handle photo upload |
| `_updatePhotoCard()` | Update UI after upload |
| `_removePhoto()` | Handle photo removal |
| `_onMainHeroAgeChange()` | Trigger auto-collapse |
| `_updateAllOwnerDropdowns()` | Sync owner dropdowns |
| `_onGenerateClick()` | Validate & generate cover |
| `_onCreateStoryClick()` | Collect data & redirect |

### Event Dispatch

```javascript
MagicCover.Events = {
  FORM_REVEALED: 'mc:form-revealed',
  PHOTO_SELECTED: 'mc:photo-selected',
  COVER_GENERATING: 'mc:cover-generating',
  COVER_READY: 'mc:cover-ready',
  STORY_CREATION_STARTED: 'mc:story-creation-started',
  // ... more events
}
```

---

## CSS Scoping

All styles scoped under `.mc` class:

```css
.mc { /* CSS variables */ }
.mc .storybook-wrapper { ... }
.mc .magic-section { ... }
.mc .mc-accordion { ... }
.mc .mc-photo-card { ... }
```

### Key CSS Variables

```css
.mc {
  --sb-paper: #FFF7EB;      /* Background */
  --sb-ink: #0B1B2B;        /* Text */
  --sb-cta: #F59E0B;        /* Call-to-action */
  --sb-gold: #D4AF37;       /* Accent */
  --sb-success: #10b981;    /* Success states */
  --sb-radius: 16px;        /* Border radius */
}
```

---

## Validation Rules

### Required for Generation:
1. ✓ At least 1 main character photo
2. ✓ Main character name filled

### Optional:
- Age (but triggers auto-collapse)
- Pets (with owner)
- Items (with owner)
- Theme selection
- Special requests

---

## Theme Editor Safety

- Multi-instance safe (all IDs prefixed with `section.id`)
- No global CSS/JS state
- Event listeners cleaned up in `disconnectedCallback()`
- Handles add/remove/reorder without page refresh

