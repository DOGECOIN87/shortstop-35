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
`plan`, `front`, `line`, `back`, `store`, `coolers`); `#3d-tour` starts the
value tour.

Layout: the standard plan of the current-generation convenience-store format
the building was built to (about 93 x 50 ft, storefront on the south):

- west end: back room (walk-in cooler with the freezer behind it, 3-comp sink,
  mop sink, ice machine, prep table, dough station, rapid-cook ovens, dry
  storage, reach-in, office) and men's and women's restrooms off a hallway
  with the rear exit;
- kitchen beside it, styled like a current restaurant counter in these
  stores: patterned soffit, sign band ("YOUR BRAND HERE"), ORDER HERE and
  PICK-UP HERE signs with three menu screens between them, all hung from the
  underside of the sign band over the counter (not on the hood), and a
  wood-front heated glass counter. The line
  itself follows the owner's photo (CaptiveAire hood on a stainless wall,
  flattop, burners with stock pot, two fryers, holding station, wire shelving
  on the left, glass-door holding cabinet on the right), with a doorway at the
  left end into the back room;
- checkout with a tobacco and lottery back bar between the kitchen and the
  front doors; coffee, fountain and frozen-drink bar on the back wall; grab-and-go
  case, hot food island and bakery island; four gondola runs; self-checkouts;
  window seating;
- east wall: 13 glass cooler doors with the vault behind and a utility room
  at the back corner;
- the walk-in beer cave fills the front-right corner, against the front wall.
  It faces the entrance, so from the front doors you look right along the
  window aisle straight to it; its walk-in door sits between glass cooler
  doors, two on each side, under the BEER CAVE sign (owner).
- along the front windows from the doors to the beer cave (owner): two
  skill-game machines side by side near the doors, the window counter with
  stools, then two more machines near the beer cave; each machine has an
  office chair facing it. Just inside, a row of four two-person tables with
  a red metal chair at each end (owner; placement in the store is a guess).
  The self-checkouts stand beside the main checkout. The screens are generic ("SKILL GAMES", prize panels, game tiles);
  no game or maker names. No crypto ATM (owner).

Owner-confirmed (standing at the front doors, looking in): kitchen and its
order counter on the left wall; checkout left of the doors; cooler doors on
the right wall; the beer cave and its door all the way to the right, at the
right-hand wall, against the front wall; restrooms back left, behind the
kitchen.

The site matches the public records for the building: one-story masonry store
of about 4,600 sq ft (measured from aerial imagery at about 91 x 48 ft), its
storefront facing the main fuel canopy (about 4,320 sq ft, 12 fueling
positions), with a smaller second canopy off the far end (not modelled).

Built in code to standard equipment sizes, in metres. Rendering:

- physically based materials: anisotropic brushed stainless (grain-aligned
  highlights) with rounded, light-catching edges; sealed quarry tile and
  polished porcelain plank with clear coat; lacquered wood-grain panels;
  veined quartz tops; glass with reflections;
- procedural PBR textures generated at load (colour, roughness and normal
  maps from tileable noise): tile, plank, ceiling tile, corrugated deck,
  concrete, wood, soffit tile, brushed steel;
- shelf products as instances with printed packaging from generated atlases
  (made-up brand names only), puffed chip bags, shaped bottles and cans,
  printed cases;
- lighting from the fixtures themselves: area lights the size of each
  pendant row over the sales floor, the lamps inside the hood, the cans down
  the kitchen aisle and the glow of the cooler doors; a light under every
  lay-in troffer in the back room, restrooms and hallway;
- shadows indoors (desktop): five overhead lights cast soft shadows (two over
  the sales floor, one in the kitchen, two in the back room), so gondolas,
  islands, tables and equipment shadow the floor; shelf products cast them
  too; the area lights fill in around them and floors keep only a soft sheen
  of reflection so the shadows read; stronger ambient occlusion in corners
  and under counters;
- wear in world space (it never repeats with the texture tiles): smears and
  fingerprints on stainless, grease and traffic on the floors, scuffs and a
  darker band low on walls, stained ceiling tiles, dull spots on paint;
- daylight only through the storefront glass: walls, deck and ceilings cast
  shadows, so sun falls on the floor inside the windows with the mullion
  shadows, and outside you see the parking lot, a fuel canopy over three
  islands, parked cars and the sky;
- reflections captured from the store itself (cube map from the sales floor),
  used at full strength for reflections but only partly as fill light, so
  surfaces keep their shading instead of an even glow; ground-truth ambient
  occlusion, bloom on lights and screens, 4x MSAA, AgX tone mapping (keeps
  white walls and lit signs from blowing out);
- small details: utensil rail and order tickets on the line, sanitizer
  bucket, kitchen clock, shelf-edge price tags, sprinkler mains, security
  domes, speakers, smoke detectors, exit signs, extinguishers, wet-floor sign,
  ice merchandiser and propane exchange cage on the front walk; outlets on
  steel boxes fed by conduit from the ceiling, a 208 V receptacle and cords
  over the ovens, a ceiling power drop over the prep island, glove-box rack by
  the hand sink, first-aid kit, hand-basket stand by the doors;
- phones get a lighter tier: standard materials, half-size textures, fewer
  lights, no indoor shadows or ambient occlusion, 2x MSAA, and room views use
  a wider lens instead of backing the camera through the wall.

### Value tour

"Value tour" in the viewer (or the "Start the value tour" button on the page,
or a link ending in `#3d-tour`) runs an automated walkthrough of the kitchen
and back room: the camera flies to each piece, a stage light and a gold ring
pick it out, the piece spins on a turntable in a price card, and its typical
new price counts up and drops into a running total and a receipt in the side
panel. It ends on the total (about $136,350) with confetti and buttons to book
a walkthrough, replay or explore. Pause, previous, next and exit are on
screen; arrow keys step, Space pauses, Esc exits. Reduced-motion settings get
instant moves, no drifting camera and no confetti.

Prices are in `TOUR` at the top of `kitchen3d.js`, labelled on screen as
estimates of what each piece costs bought new, not quotes and not an appraisal
of the equipment in this kitchen. Where only one source was found it says so;
the chef base under the griddle, the 21 ft counter itself, the menu screens,
the fry station and the mop sink are left out because no price was found.

| Stop | Shown | Range / basis | Sources |
| --- | --- | --- | --- |
| Exhaust hood system (12 ft, fans, duct, make-up air, installed) | $40,000 | $25,000 to $60,000; $950 to $2,800 per ft, make-up air $8,000 to $25,000, full packages $35,000 to $80,000 | taxfyle.com/blog/restaurant-hood-installation-cost, therestaurantwarehouse.com/blogs/restaurant-equipment/commercial-kitchen-hood-installation-cost, pulserevops.com/knowledge/bo0154 |
| Fire suppression, installed | $6,500 | $4,000 to $10,000 | pulserevops.com/knowledge/bo0154, pos.toasttab.com/blog/on-the-line/restaurant-hood-installation-costs |
| 36 in griddle | $3,500 | $2,200 to $5,000 (36 to 48 in) | gofoodservice.com new restaurant equipment guide |
| 24 in four-burner range top | $1,800 | $850 to $2,600 dealer listings (Atosa, Vulcan, Star, Vollrath) | restaurantsupply.com, katom.com, tigerchef.com |
| Two 40 lb fryers | $4,850 | 2 x $2,425.50 (one dealer listing, Vulcan) | shopatstop.com |
| Heated holding cabinet | $2,400 | $1,300 to $3,400 (Avantco, Metro) | webstaurantstore.com |
| Hand sinks (2) | $600 | $125 to $415 each | katom.com, chefbuyer.com |
| Heated display at the counter | $4,500 | one 45 in case, Hatco GRHD-3PD $4,495 | katom.com |
| Two rapid-cook ovens | $16,400 | TurboChef Eco $8,088 to $8,331 each; Bullet $17,191, Plexor M2 $23,253 | webstaurantstore.com, shop.middleby.com |
| 72 in refrigerated prep table | $5,400 | $2,404 to $9,274 (Beverage-Air SPE72HC-08 $5,414) | katom.com, chefbuyer.com |
| Mixer and tortilla press | $3,700 | 20 qt mixer $839 to $3,911; heated press $1,714 to $8,909 | webstaurantstore.com, katom.com, pizzaovens.com |
| 3-compartment sink, 90 in | $1,500 | $529 to $1,929 | webstaurantstore.com, katom.com |
| Ice machine and 500 lb bin | $6,200 | $3,018 to $10,155 (Hoshizaki KM-330MAK/B-500SF $6,205) | katom.com |
| Walk-in cooler and freezer | $35,000 | $30,000 to $50,000; Nor-Lake combos $25,617 to $30,296 before install; installed coolers $12,000 to $25,000, freezers +20 to 30% | deqonline.com, mymortuarycooler.com, homestars.com, thepricer.org |
| Two-door reach-in freezer | $3,500 | $2,215 to $3,900 | walmart.com, katom.com, restaurantsupply.com, chefbuyer.com |
| Storage shelving | $500 | NSF 48 x 18 wire units $143 to $267 | restockit.com, sourcesupplycompany.com |

Listings were captured in November 2026 and vary by seller and date; check
current prices before quoting any of these.

Post-processing and area-light modules (`vendor/jsm/`) are copied unmodified
from three.js 0.160.0, the same version as `vendor/three.module.js`. 32 labelled items; tap one for what it is and its typical size. Walls
between the camera and the room are cut away automatically. Menu screens and
signs show generic "your menu / your brand here" designs, no chain branding.
`kitchen-3d-poster.jpg` is a render of the overview used on the page.

Still estimated: exact positions and sizes inside (the arrangement above is
owner-confirmed; the kitchen line order is from the owner's photo). The plan
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
- Location: the store at Loop 1604 & Judson is 17510 Judson Rd, San Antonio,
  TX 78247 (Bexar CAD property 1360519, geographic ID 17789-001-0150, Cooper
  Subd. block 1 lot 15, 2.06 acres, zoned I-1), on the south side of the Loop
  1604 frontage road just east of Judson Rd (about 29.6012 N, 98.3860 W).
  - Bexar Appraisal District: one convenience store of 4,600 sq ft, masonry,
    built 2021, with a 300 sq ft canopy and a 1,000 sq ft service-station
    canopy; a second 4,320 sq ft service-station canopy; five underground
    fuel tanks; 63,380 sq ft of concrete paving
    (https://bexar.trueautomation.com/clientdb/Property.aspx?cid=110&prop_id=1360519).
  - TDLR TABS2020011238, "7-Eleven in San Antonio (41142)": new construction
    of a one-story convenience store with taqueria and fuel canopy, 4,755 sq
    ft, May to November 2020, designed by The Dimension Group (Dallas)
    (https://www.tdlr.texas.gov/TABS/Search/Print/TABS2020011238). The filing
    gives the address as 17480 Judson Rd and mixes in the architect's Dallas
    address; the county tax account for store 41142 is 17510 Judson Rd.
  - Aerial imagery (Esri World Imagery) shows the building about 91 x 48 ft,
    long side about 30 degrees off east-west, storefront facing northwest to
    the main canopy, the second small canopy off the store's east end.
  - Not found in public sources: the interior floor plan. The arrangement in
    the model is the format's standard plan, adjusted to what the owner
    confirmed.
