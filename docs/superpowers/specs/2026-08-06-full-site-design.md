# PTL Full Site — OUI-Inspired Multi-Page Design

**Date:** 2026-08-06
**Inspiration:** https://www.onceuponindia.com/ (structure only, not visual identity)
**Status:** Approved by client in conversation

## Goal

Build a multi-page website for Peoples Theatre Laboratory (PTL) in a new `full-site/`
folder, mirroring the page structure of Once Upon India (OUI) while keeping PTL's
established visual identity. The existing coming-soon `index.html` at the repo root
stays untouched.

## Visual identity

Carried over from the coming-soon page (see memory: ptl-visual-identity):

- Black ground (#0d0b09 range), cream/ivory ink, amber/ember accents
- Fonts: Bodoni Moda (display), Newsreader (body), Tiro Devanagari Hindi (Devanagari),
  Courier Prime (mono/labels)
- Film grain overlay, radial vignette, hand-drawn line-art feel
- Fluid type via clamp(), CSS Grid responsive layout, prefers-reduced-motion support
- No JS build tooling; plain static HTML/CSS, minimal vanilla JS only where needed
  (e.g. mobile nav toggle)

## Architecture

```
full-site/
  styles.css              shared stylesheet (identity + components + per-page sections)
  index.html              Home
  gatherings.html         Upcoming gatherings (OUI "Tickets")
  baithak.html            Baithak format page (OUI "Baithaks")
  kabir-sang-ruhdaari.html  KSR format page (OUI "Mehfils")
  team.html               The Collective (OUI "Team")
  collaborations.html     Collaborations
```

Shared components across pages: fixed masthead with nav (PTL wordmark left, links
right, social icons), footer (contact, social, copyright), grain/vignette overlays.
Mobile: hamburger toggle (few lines of vanilla JS or checkbox hack).

## Pages

### index.html — Home
1. Hero: full-viewport black hero, PTL wordmark, tagline, ember breathing glow
2. Creed: "Who we are" + a Kabir doha as the anchoring quote (OUI uses Maya Angelou)
3. Gatherings cards: three cards — Baithak / Kabir Sang Ruhdaari / Collaborations —
   each linking to its page
4. Upcoming Gatherings: event-row list (date, city, name, Register CTA) linking to
   gatherings.html
5. Be a Host: invitation to open homes/spaces for Baithaks
6. Voices: 2–3 attendee quotes (clearly placeholder until client provides real ones)
7. Get Involved: perform / volunteer / host — CTAs link to WhatsApp, Instagram, email
   (static site; no form backend)

### gatherings.html — Upcoming Gatherings
- Banner headline + Hindi tagline
- Event rows: poster placeholder, date, city, venue, description, Register CTA
- Real known data: KSR 2026 Vadodara (27 June, MilanKunj Club) is past — shown as
  "last edition"; next KSR (Jyestha Poornima 2027) + monthly Baithak entries as
  date-TBA placeholders
- "KSR comes to your city" teaser card (Vadodara + Ahmedabad editions exist)

### baithak.html — Baithak
- Format description: monthly intimate gathering of the collective
- What a Baithak evening holds (music, reading, conversation)
- Gallery placeholder strip
- "Host a Baithak" section with what-you-need list (space, accessibility) + contact CTA

### kabir-sang-ruhdaari.html — Kabir Sang Ruhdaari
- The annual event: Jyestha Poornima, contribution-based, registration-only
- The poets: Kabir, Meera, Bulleh Shah, Raidaas, Lalon Fakir
- Live painting tradition — artworks stay with PTL; audience sings along
- Devanagari song-list ticker or list (15 songs already in coming-soon page)
- Cities: Vadodara + Ahmedabad editions
- Register CTA

### team.html — The Collective
- OUI-style warm bio layout (name, role, personality-rich paragraph)
- All people are clearly-marked placeholders ("[Name]") for the client to replace —
  no real member data exists yet
- Framing copy about the collective itself (~3 decades, Grotowski's Total Theatre,
  painters/sculptors/musicians/art historians in one room) is real

### collaborations.html — Collaborations
- Cross-artist collaboration story (confirmed via Instagram research)
- Invitation for artists, brands, venues to partner
- Contact CTA

## Content rules

- Real facts only from researched memory (org profile, KSR details, visual identity).
- Anything invented (testimonial quotes, team members, future dates) is visibly
  marked as placeholder so the client can't mistake it for fact.
- Devanagari used for song titles and select display accents.
- Contact CTAs: Instagram (@peoplestheatrelaboratory), email/WhatsApp from memory's
  contact details.

## Error handling / testing

- Pure static site: no runtime errors to handle beyond graceful font fallbacks.
- Verify by serving locally (python http.server) and visually reviewing every page
  at desktop and ~420px mobile widths via Chrome.
- All internal links checked; nav highlights current page.

## Out of scope

- Form backends, ticketing/payment, CMS, Notion lyric integration (separate open
  question with client), volunteer-gated area, deployment.
