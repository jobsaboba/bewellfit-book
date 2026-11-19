# Be Well Fit — class booking app

A simple installable web app for **bewellfit.org**. Clients choose a class, day
and time, then send a booking request to the Be Well Fit team. The team replies
to the request email to confirm the place.

There is no payment step and no client login. The app is a static PWA — it can
be hosted on GitHub Pages, Netlify, Cloudflare Pages or any ordinary web host.

**Live app:** <https://jobsaboba.github.io/bewellfit-book/>

## How it works

1. The client picks a class from the timetable data.
2. They pick a highlighted day and then a time.
3. They enter their name, email and an optional note.
4. The app posts those details to the studio's existing Contact Form 7 form
   (`form 503`) on bewellfit.org. WordPress emails the booking to whichever
   address is configured for that form.
5. The client sees a "Request sent" screen. The team replies to the client's
   email to confirm the booking.

If the request cannot be sent, the app offers an `mailto:` fallback to
**bewellfit@gmx.com** with all the details pre-filled, so a booking is never
silently lost.

## Before going live — checklist

- [x] Confirm `bewellfit@gmx.com` is the right fallback/contact address.
- [x] Confirm the owner recipient configured in Contact Form 7 form 503.
- [x] Publish an interim version on GitHub Pages.
- [ ] The owner sends the first real test booking and replies to confirm.
- [ ] Decide the final address: keep the GitHub Pages link, move to
      `book.bewellfit.org`, or add a page on the WordPress site (the last two
      need DNS/WordPress access).
- [ ] Update `sw.js` cache version when deploying changes.

> Contact Form 7 submissions send a real email. Do not use a live booking as a
> casual test without the owner's agreement.

## Files

| File | Purpose |
| --- | --- |
| `index.html` | App shell, navigation, Info page and SVG icons |
| `styles.css` | Complete visual design and responsive layout |
| `app.js` | Booking flow, timetable, form submission and PWA UI |
| `data.js` | **The timetable, class descriptions, and app configuration** |
| `manifest.webmanifest` | Install metadata |
| `sw.js` | Offline cache |
| `icons/` | App icons and bee brand mark |
| `img/hero.webp` | Header photograph |
| `fonts/` | Self-hosted Montserrat and Nunito |

## Updating the timetable

Everything timetable-related lives in `data.js`:

- `BWF_SLOTS` — each weekly session: class name, day (`1` = Monday … `6` =
  Saturday), 24-hour time, and studio (`1` or `2`).
- `BWF_CLASS_INFO` — description and categories for each class name. The name
  must match the name used in `BWF_SLOTS`.
- `BWF_CATEGORIES` — filter labels shown on the class picker.
- `BWF_UPDATED` — the "timetable updated" date shown in the app.

After editing, bump `CACHE` in `sw.js` (e.g. `bewellfit-v2`) so installed
phones pick up the new data.

## Configuration

`BWF_CONFIG` at the top of `data.js` contains:

- `bookingEndpoint` — the Contact Form 7 REST endpoint.
- `bookingFormId`, `bookingUnitTag`, `bookingContainerPost`,
  `bookingFormVersion`, `bookingLocale` — hidden fields from the existing form.
- `contactEmail` — used by the Info page and the mail-to fallback.
- `address`, `mapsUrl`, `siteUrl` — shown on the Info page.

The app posts these fields to CF7:

`first-name`, `last-name`, `your-email`, `class-booking`,
`class-time-date`, `other-enquiries`

## Run locally

```bash
cd bewellfit-book
python3 -m http.server 8000
```

Open <http://localhost:8000>. Service workers need `localhost` or HTTPS, so the
offline install test works locally but not from a `file://` URL.

## Deploy

The app uses relative paths, so it works at a domain root or in a subfolder.

### GitHub Pages

```bash
git init
git add .
git commit -m "Add Be Well Fit booking app"
git branch -M main
git remote add origin https://github.com/USER/REPO.git
git push -u origin main
```

Then enable Pages for the `main` branch (root folder). The app will be at
`https://USER.github.io/REPO/`.

### Custom domain

If `book.bewellfit.org` is wanted, add a `CNAME` file containing that hostname
and create a CNAME DNS record pointing to the Pages host. This needs access to
the bewellfit.org DNS.

## Privacy and behaviour notes

- Booking details are only stored in the browser for the "Your requests"
  history (localStorage). They are not sent anywhere except the booking form.
- The app does not know whether the owner has confirmed a request; the
  confirmation happens by email.
- The timetable is a copy of the website's weekly schedule. If the studio
  changes a class, update `data.js` and bump the service worker cache.
