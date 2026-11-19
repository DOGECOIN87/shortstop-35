# Short Stop Judson kitchen page

`index.html` in this folder is a standalone page (not linked from the Texaco
site) offering the built-in commercial kitchen at Short Stop Judson for rent.
Once on `main` it is served at https://shortstop35.store/shortstop-judson/.

The building was a 7-Eleven; its kitchen is the package newer 7-Eleven stores
are built with. Sections: hero with a drawn kitchen line (an illustration, not
a photo), equipment, who it's for, why here, ways to rent (by the shift,
monthly, long-term lease), how it works, FAQ, and an inquiry form.

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

- Confirm every equipment item. The hood, fryers, flattop, rapid-cook ovens,
  microwaves and walk-in cooler and freezer follow trade coverage of the newer
  7-Eleven kitchen package (Foodservice Equipment & Supplies). Fire
  suppression, hand sinks and the wash-up sink are assumed from code for a
  fryer line, not sourced.
- Photos of the kitchen to replace or sit beside the illustration.
- Phone, email, address and rates (above).

The page says the equipment is confirmed at the walkthrough and carries a
7-Eleven trademark / no-affiliation notice in the footer.
