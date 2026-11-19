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

## 3D kitchen (`kitchen3d.js`)

"Explore in 3D" and the 3D tour section open a full-screen, interactive model
of the kitchen. Three.js (r160) is copied into `vendor/` so the folder is
self-contained; nothing loads until a visitor opens the viewer. Links ending in
`#3d` open it directly, and `#3d-<view>` opens a named view (`overview`,
`plan`, `front`, `line`, `prep`, `wash`, `walkin`).

- Two spaces, as in the owner's photo: an **open kitchen** in the store (cook
  line under a CaptiveAire wall-canopy hood against a full-height stainless
  wall, glass-front heated serving counter facing the store, three ceiling-hung
  menu screens, wire shelving on the left, glass-door holding cabinet on the
  right) and a **back room** through a doorway (prep table, dough and tortilla
  station, rapid-cook ovens, 3-compartment sink, hand sinks, mop sink, ice
  machine, reach-in, dry storage, walk-in cooler and freezer, back door).
- Built in code to standard equipment sizes, in metres, with procedural
  materials (brushed stainless, quarry tile, FRP panels, ceiling tile, walk-in
  skin), soft shadows and reflections. 24 labelled pieces of equipment; tap one
  for what it is and its typical size. Walls between the camera and the room are
  cut away automatically.
- The menu screens show a generic "Your menu here" design, not the current
  operator's menu.
- `kitchen-3d-poster.jpg` is a render of the overview used on the page.

Still estimated, to replace when the owner sends photos and measurements:
which end of the line the doorway is at (the model puts it at the west/left
end, by the wire shelving), every room size (back room 32 x 20 ft, open
kitchen 27 x 10 ft), and the whole back-room layout. Room sizes, the doorway
and equipment positions are constants at the top of `kitchen3d.js` and in
`buildKitchen()`.

## Filling in the listing

Listing details live in one `LISTING` object near the bottom of `index.html`.
Each is empty until the owner supplies it, and the page hides what is missing:

- `phone`: shows Call and Text buttons (contact card and the phone bar).
- `email`: the inquiry form opens the visitor's email app addressed here.
  Without it the form asks visitors to call, or says inquiries open soon.
- `address`: replaces "address shared when you book a walkthrough" and adds
  an OpenStreetMap link.
- `rates.shift`, `rates.monthly`, `rates.lease`, `rates.summary`: replace
  "Ask the owner".

## What still needs the owner

- The store's street address, so its public building records can be pulled
  (see research notes).
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
