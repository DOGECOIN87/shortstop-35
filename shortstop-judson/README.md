# Short Stop Judson kitchen page

`index.html` in this folder is a standalone page (not linked from the Texaco
site) offering the built-in commercial kitchen at Short Stop Judson for rent.
Once on `main` it is served at https://shortstop35.store/shortstop-judson/.

The page does not mention 7-Eleven (owner's instruction). Sections: hero with a drawn kitchen line (an illustration, not
a photo), equipment, 3D tour, who it's for, why here, ways to rent (by the
shift, monthly, long-term lease), how it works, FAQ, and an inquiry form.

## Logo and colours

The owner's logo (round teal badge, cream "SHORT STOP" lettering, red car) is
in the header, on the hero illustration, on the contact card, in the footer,
as the browser icon and in the link-preview image. The page colours come from
it: teal `#204649`, cream `#F5F3E6`, sage `#CCDDD1`, car red `#E93F24` (buttons
use a deeper `#D0341B` so white text passes contrast) and headlight gold
`#EEBE54`.

- `logo.svg`: the owner's traced vector, cropped to the badge, background
  removed, coordinates rounded (405 KB to 281 KB; looks the same). Master copy.
- `logo-256.webp` / `logo-256.png`: what the page shows (16 KB / 58 KB).
- `favicon-64.png`, `apple-touch-icon.png`: browser and home-screen icons.
- `og.jpg`: 1200 x 630 image used when the link is shared.

## 3D store and kitchen (`kitchen3d.js`)

"Explore in 3D" and the 3D tour section open a full-screen, interactive model
of the whole store. Three.js (r160) is copied into `vendor/` so the folder is
self-contained; nothing loads until a visitor opens the viewer. Links ending in
`#3d` open it directly, and `#3d-<view>` opens a named view (`overview`,
`plan`, `front`, `line`, `back`, `store`, `coolers`).

Layout: the standard plan of the current-generation convenience-store format
the building was built to (about 93 x 50 ft, storefront on the south):

- west end: back room (walk-in cooler with the freezer behind it, 3-comp sink,
  mop sink, ice machine, prep table, dough station, rapid-cook ovens, dry
  storage, reach-in, office) and men's and women's restrooms off a hallway
  with the rear exit;
- kitchen beside it, styled like a current restaurant counter in these
  stores: patterned soffit, sign band ("YOUR BRAND HERE"), ORDER HERE and
  PICK-UP HERE signs, menu screens, wood-front heated glass counter. The line
  itself follows the owner's photo (CaptiveAire hood on a stainless wall,
  flattop, burners with stock pot, two fryers, holding station, wire shelving
  on the left, glass-door holding cabinet on the right), with a doorway at the
  left end into the back room;
- checkout with a tobacco and lottery back bar between the kitchen and the
  front doors; coffee, fountain and frozen-drink bar on the back wall; grab-and-go
  case, hot food island and bakery island; four gondola runs; self-checkouts;
  window seating;
- east wall: 13 glass cooler doors with the vault behind, utility room at the
  back corner, and the walk-in beer cave at the front corner (owner: at this
  location the beer cave is on the front side).

Built in code to standard equipment sizes, in metres, with procedural
materials and lighting; shelf products are drawn as instances so phones keep
up. 32 labelled items; tap one for what it is and its typical size. Walls
between the camera and the room are cut away automatically. Menu screens and
signs show generic "your menu / your brand here" designs, no chain branding.
`kitchen-3d-poster.jpg` is a render of the overview used on the page.

Still estimated: every position and size except the kitchen line order (from
the owner's photo) and the beer cave's side (from the owner). The plan
constants (`BLD`, `px()`/`pz()` in plan feet, `KF`, `BOH`, `VAULT_X`) are at
the top of `kitchen3d.js`; positions are in `buildKitchen()`.

## Filling in the listing

Listing details live in one `LISTING` object near the bottom of `index.html`.
Each is empty until the owner supplies it, and the page hides what is missing:

- `phone`: shows Call and Text buttons (contact card and the phone bar).
- `email`: the inquiry form opens the visitor's email app addressed here.
  Without it the form asks visitors to call, or says inquiries open soon.
- `address`: set to "Loop 1604 & Judson Rd, San Antonio, TX" (owner); shown
  in the contact card and FAQ with an OpenStreetMap link. Replace with the
  street address when the owner wants it public.
- `rates.shift`, `rates.monthly`, `rates.lease`, `rates.summary`: replace
  "Ask the owner".

## What still needs the owner

- The street address at Loop 1604 & Judson, so the building's public records
  can be pulled (see research notes).
- More photos: the back room, the doorway, and each equipment nameplate
  (make and model), for the 3D model and a photo gallery.
- Confirm every equipment item on the page. Fire suppression, hand sinks and
  the wash-up sink are assumed from code for a fryer line, not sourced.
- Phone, email and rates (above).

## Research notes (not shown on the page)

The building was a 7-Eleven, and the kitchen is the one newer 7-Eleven stores
are built with. That history is used only to work out what equipment the
kitchen likely has; the page itself never names the chain. Findings so far,
all to be checked against the real kitchen:

- Equipment package in 7-Eleven's newer kitchens: flattops, fryers,
  rapid-cook ovens, a hood, microwaves, and a walk-in freezer and
  refrigerator in the back of house (equipment dealer interview,
  Foodservice Equipment & Supplies:
  https://fesmag.com/topics/perspectives/point-of-view/20911-next-generation-convenience-store-food-and-beverage).
- Rapid-cook ovens: the chain's hot-food rollout was built on TurboChef
  high-speed ovens (pizza in about 90 s); it is not confirmed that newer
  stores still use them (C-Store Decisions, 2009:
  https://cstoredecisions.com/2009/10/14/7-eleven-moves-deeper-into-foodservice/).
- Texas "new standard" stores are about 4,800 sq ft (vs about 2,900 for a
  traditional store) and include a Laredo Taco Company restaurant, pizza,
  fried chicken, wings and other hot food (CSP). Laredo Taco kitchens make
  flour tortillas from scratch on site every day. Recent Texas permit filings
  (TDLR) list new 7-Eleven stores at about 4,800-5,100 sq ft.
- Fryer, hood and walk-in makes and models were not found in public sources.
  Nameplate photos from the owner are the reliable way to get them; with
  model numbers the exact sizes come from the makers' spec sheets.
- Texas TDLR building filings (TABS) give each store's address, size, build
  dates and design firm. 7-Eleven sites on Judson Rd in San Antonio include
  13340 Judson Rd (new construction, 2017) and 17460 and 17510 Judson Rd; the
  owner's address decides which record applies.
- Store layout: the preliminary floor plan in a 2025 planning submission for a
  new 4,761 sq ft store of this format (Medford, OR, file AC-25-168, sheet
  "Preliminary Floor Plan", 93 x 50 ft):
  https://www.medfordoregon.gov/files/assets/public/v/1/planning/agendas-minutes/ld/2025-ld-agendas/07-16-2025/ac-25-168-7-eleven-store.pdf
  It shows restrooms, walk-in freezer and cooler, back room and manager's
  office at one end; the kitchen and checkout next to them; the beverage bar
  on the back wall; gondolas; a cooler vault and beer cave on the far wall;
  and seating along the storefront. Trade press describes the same format
  with a restaurant counter, hot food case, grab-and-go area, self-checkout
  and in-store seating.
- Location: the owner gives it as Loop 1604 & Judson, San Antonio. No public
  TDLR record was found for a store at that intersection; the nearest record
  is new construction at 13340 Judson Rd (2017), not confirmed to be this
  store.
