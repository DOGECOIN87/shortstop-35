# ShortStop Judson kitchen page

`index.html` in this folder is a standalone page (not linked from the Texaco
site) offering the built-in commercial kitchen at ShortStop Judson for rent.
Once on `main` it is served at https://shortstop35.store/shortstop-judson/.

The building was a 7-Eleven; its kitchen is the package newer 7-Eleven stores
are built with. Sections: hero with a drawn kitchen line (an illustration, not
a photo), equipment, who it's for, why here, ways to rent (by the shift,
monthly, long-term lease), how it works, FAQ, and an inquiry form.

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
