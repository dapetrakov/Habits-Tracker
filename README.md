# Habits Tracker

A simple, dependency-free habit tracker that runs in the browser.

- Add habits and check them off each day
- See the last 7 days at a glance, and tap any day to fix a missed check-off
- Streak counter and daily progress bar
- Data is saved in your browser (`localStorage`), so there's no account or server

## Run it

Open `index.html` in any browser. That's it.

## Hosting

Every push to `main` deploys the app to GitHub Pages
(`.github/workflows/pages.yml`). The site is at
`https://dapetrakov.github.io/Habits-Tracker/`.

## Install it on your phone

The app is a Progressive Web App: once it's hosted over HTTPS, open the link on
your phone and add it to your home screen. It then opens full-screen with its own
icon and works offline.

- **iPhone (Safari):** Share button → *Add to Home Screen*
- **Android (Chrome):** menu (⋮) → *Install app* / *Add to Home screen*

Your habits are stored on the device you use, so each phone or browser keeps its own list.
