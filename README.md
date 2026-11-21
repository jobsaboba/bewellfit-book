# Be Well Fit — class booking app

A simple installable web app for **Be Well Fit, Hastings**. Clients choose a
class, day and time, then send a booking request to the team. The team replies
to the request email to confirm the place.

The app is self-contained: timetable, class guide, prices, memberships, both
studio addresses, maps, phone and email are built in. It does not link out to
bewellfit.org, so it still works when the website is unreachable.

There is no payment step and no client login. The app is a static PWA — it can
be hosted on GitHub Pages, Netlify, Cloudflare Pages or any ordinary web host.

**Live app:** <https://jobsaboba.github.io/bewellfit-book/>

## How it works

1. The client picks a class from the timetable data.
2. They pick a highlighted day and then a time.
3. They enter their name, email and an optional note.
4. They press **Send booking request**. The app opens their own email app with
   a message to **bewellfit@gmx.com** already filled in: class, date, time,
   studio, name and reply address.
5. They press **Send** in the email app, then tap **I’ve sent the email** in the
   app. The team replies to the client's email to confirm the booking.

The app does not send email itself, so there is no Contact Form 7 dependency
and no server or API key to maintain. The message comes from the client's own
address, which means the team can simply press **Reply**.

If the email app doesn't open, the confirmation screen offers **Open my email
app**, **Copy the request details**, and the studio's direct email address, so a
booking is never silently lost.

## Before going live — checklist

- [x] Confirm `bewellfit@gmx.com` is the right booking/contact address.
- [x] Publish an interim version on GitHub Pages.
- [ ] The owner sends the first real test booking and replies to confirm.
- [ ] Decide the final address: keep the GitHub Pages link or move to
      `book.bewellfit.org` (needs DNS access). The app no longer depends on the
      WordPress site.
- [ ] Bump the app version when deploying changes — see **Versioning and
      backups** below.

> A live booking sends a real email from the tester's own email app. Use the
> owner's own address for the first test.

## Files

| File | Purpose |
| --- | --- |
| `index.html` | App shell, navigation, Info page and SVG icons |
| `styles.css` | Complete visual design and responsive layout |
| `app.js` | Booking flow, timetable, email request and PWA UI |
| `data.js` | **Timetable, class guide, prices and app configuration** |
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
- `BWF_PRICING` — memberships, class passes and individual class prices shown
  on the Info tab. Update the `updated` date when prices change.
- `BWF_UPDATED` — the "timetable updated" date shown in the app.

After editing, bump the app version so installed phones pick up the new data.
Change the number in these places:

- `CACHE` in `sw.js` (for example `bewellfit-v8`).
- The `?v=` on `styles.css`, `data.js` and `app.js` in `index.html`.
- The same three `?v=` entries, plus `manifest.webmanifest?v=`, in the `SHELL`
  list in `sw.js`.
- `APP_VERSION` in `app.js` (shown on the Info page).

Keep them on the same number. The manifest URL only needs to change when the
manifest itself changes. The versioned URLs make the browser fetch new files
even if an old service worker is still active. The service worker then replaces
the old cache and reloads the page once.

## Prices, classes and website independence

The Info tab is the single source of truth for customers:

- prices, memberships and class passes from `BWF_PRICING`;
- the full class guide from `BWF_CLASS_INFO`, with search;
- both studio addresses with Google Maps buttons;
- phone and email contact details.

The app deliberately has **no links to bewellfit.org**. If the website is down,
customers can still see the timetable, prices and class descriptions, and send a
booking request. When prices change, update `BWF_PRICING` and its `updated` date.

## Versioning and backups

The current live design is the original calendar-based booking flow. The
photo-tile redesign was tried on 20 November 2026 and rolled back.

Git tags keep both versions easy to restore:

| Tag | Design |
| --- | --- |
| `pre-photo-tiles` | Original calendar flow (current live version) |
| `photo-tiles` | Photo-tile redesign, including all class images |

To restore the photo-tile design later:

```sh
git checkout main
git revert <revert-commit>
```

Or merge the `photo-tiles` tag into `main`. Remember to bump the version number
afterwards.

## Configuration

`BWF_CONFIG` at the top of `data.js` contains:

- `contactEmail` — the address that booking and contact links use.
- `address`, `mapsUrl` — Studio 1, shown on the Info page.
- `studio2Address`, `studio2MapsUrl` — Studio 2 at Unit 2, Block D, Brook Way, Ivyhouse Lane.

To change where bookings go, edit `contactEmail` and bump the app version.

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
  history (localStorage). They leave the device only when the client presses
  Send in their own email app.
- If the client ticks **Remember me on this phone**, their first name, last
  name and email are saved in localStorage on that device and pre-filled next
  time. Unticking the box removes them. Nothing is stored on a server.
- The app does not know whether the owner has confirmed a request; the
  confirmation happens by email.
- The timetable is a copy of the website's weekly schedule. If the studio
  changes a class, update `data.js` and bump the app version.
