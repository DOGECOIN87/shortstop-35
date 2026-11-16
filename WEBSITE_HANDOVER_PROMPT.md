# Handover prompt: sales-ready website for the owner (with price CMS and interior model)

Paste everything below into the next session.

---

## Goal

The owner of Texaco ShortStop (1185 I-35 N, New Braunfels, TX 78130) is being
shown a website the seller hopes to sell to them. It must look professional,
load fast on phones, be honest about what is estimated, let the owner update
fuel prices themselves, and show the real inside of the store. Build on
`index.html` and `classic.html`. No build step; GitHub Pages compatible;
Three.js stays self-hosted in `vendor/`.

## What exists (read first)

- `index.html`: main site. Sections `#inside`, `#deals`, `#visit`, `#faq`, and
  the full-screen 3D view (GLB at `assets/web-station/shortstop_detailed.glb`).
- `classic.html`: lightweight non-3D version.
- `README.md`: every change and its measurements, including what is still
  estimated. Read the "still estimated" notes before claiming accuracy.
- `scripts/storefront.js`, `scripts/car-wash.js`, `scripts/site-fixes.js`,
  `scripts/block-wall.js`, `scripts/sidewalk-levels.js`: photo-matched station
  details.
- Owner photos are in the conversation, not the repo. Do not commit reference
  screenshots or Google imagery.

## Brand and facts

- Texaco ShortStop; logo `assets/logo.jpg` (red car #35). Domain
  shortstop35.store. Phone (830) 606-1892.
- Colours: red `#c8102e` / `#d9232e`, white, charcoal, Texaco star.
- Hours: open from 5 AM (6 AM Sundays), per the existing copy.
- Fuel prices on the 3D model and the page are placeholders ("—") until the
  owner supplies them. Never publish invented prices.

## Work to do, in priority order

1. **Hero that sells in five seconds.** Full-bleed image or the 3D station
   behind the headline, "Fuel, groceries and a car wash on I-35 in New
   Braunfels", with "Get directions", "Call now" and an open-now status. The 3D
   view is a feature, not a gate: the page must work without WebGL.
2. **Performance.** Poster image first; load the 3D scene and the 5.6 MB GLB
   only on "Explore in 3D". Target under 3 s to first paint on a mid-range
   phone. Keep the `station-startup` fallback.
3. **Owner price CMS (new).**
   - A page at `/admin/` where the owner signs in and edits the regular, plus
     and diesel prices (and with/without car wash, as the station sign shows).
     Changes appear on the website and on the 3D price sign within a minute.
   - A static GitHub Pages site cannot keep a secret, so use a hosted CMS with
     a login: Decap CMS with GitHub as the backend (the owner needs a GitHub
     account with write access to the repo, or the seller invites them), or a
     hosted backend such as Supabase/Firebase with email login. Recommend one
     and explain the tradeoff (Decap = free and git-based, with every price
     change in the commit history; Supabase = a database and real user
     accounts, costs more to run).
   - Prices live in one data file (`data/prices.json`) that the page and the 3D
     sign both read. Show the "last updated" date next to the prices.
   - Only the owner (and the seller) can log in. Document how to add a user and
     how to revoke access.
   - Test: change a price in the CMS, see it on the page and in the 3D sign.
4. **Interior of the store (new).** The inside is not modelled yet. The current
   inside is a procedural placeholder (the `FoodMart-interior` group in
   `index.html`) and the GLB has no interior.
   - The owner's interior photos are supplied in the conversation. Before
     modelling, list what is in each photo: coolers (glass doors, colours),
     aisles, centre island, checkout counter, slot machines, ATM and Bitcoin
     ATM, the Amazon locker, signage, ceiling lights, floor, and anything
     against the walls.
   - Build the interior to those photos and measurements, in the store frame
     used by `scripts/storefront.js`. Mark any dimension that is estimated.
   - Keep it cheap to render: merge meshes, instance the repeated coolers and
     shelf products, bake lighting, no per-object shadows.
   - Put the interior behind the glazing so it shows in the Store view and
     through the windows at night.
   - Test: `?view=store&time=night` shows the interior through the glass; no
     console errors; frame time acceptable on a phone.
5. **Sections:** what's inside (with the interior views), car wash, propane
   exchange, Amazon Hub, deals (confirmed items only), visit and hours, and an
   "about the owner" placeholder for the owner to fill in.
6. **Trust and clarity.** A map link (OpenStreetMap, no Google key),
   accessible contrast, keyboard navigation, alt text on every image, and a
   tap-to-call link on mobile.
7. **Sales polish.** A short "why this site" block (online presence, location,
   3D tour as the differentiator), testimonials placeholder, and a footer with
   the README credits (BMW E46 and Cybertruck licences) so the handover is
   clean.

## Constraints

- Do not invent prices, hours, awards, reviews, or ownership claims.
- Keep estimated measurements out of marketing copy. The page says once, in
  small print near the 3D view, that the model is an approximation.
- The CMS login must not expose a secret in the static files.
- Run every applicable `tests/*.mjs`. `tests/startup.mjs` and
  `tests/module-version.mjs` must pass. Run `node tools/version-modules.mjs`
  after any change under `scripts/`.
- Mobile first: 390 x 844 with no horizontal scroll and a 16 px gutter.
- Verify in headless Chromium: default view, `?view=store&time=day`,
  `?view=store&time=night`, and the price CMS round trip. No console errors.

## Git

- Branch `claude/exciting-wozniak-5dnz1i`; push to `main` only when the
  owner-facing work is verified. No pull request unless asked.
- Commit messages say what changed in plain words.

## Definition of done

- Page opens in under 3 s on a mid-range phone with the poster hero.
- The owner can sign in and change prices, and the change appears on the
  website and the 3D sign.
- The interior is modelled from the owner's photos and visible through the
  store glass at night.
- Every section has real content, or a clearly marked placeholder.
- Tests pass and the README lists what changed and what is still estimated.

## Needed from the owner before the interior work starts

- The interior photos (all of them, including the checkout and back wall).
- Any interior measurements they know (aisle widths, cooler count, ceiling height).
- Current fuel prices, if they want them live from day one.
