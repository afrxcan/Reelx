# 🎬 Reelx

A sleek, TMDB-style movie discovery website built with vanilla HTML, CSS, and JavaScript.
Dark cinema aesthetic — Vite-powered dev server.

---

## ✨ Features

- 🔥 **Trending / Popular / Top Rated / Upcoming** filter tabs
- 🔍 **Live search** across the full TMDB movie catalogue
- 🎬 **Ken Burns hero slideshow** — 5 trending movies cycle automatically with slow zoom + fade
- 🎥 **Netflix-style inline trailer** — after 8s on a slide, the trailer plays directly in the hero (muted, no controls). Mute toggle + close button included
- 📽️ **Modal trailer playback** — full YouTube embed via the ▶ Trailer button
- 🎭 **Movie detail pages** — poster, tagline, genres, cast row, budget/revenue, similar movies
- 📊 **Full cast row** with profile photos and character names
- 📱 **Fully responsive** — hamburger menu on mobile, fluid grid at all screen sizes
- ✨ **Smooth animations** — Ken Burns zoom, hero content fade-in, card hovers, toast notifications, progress bar

---

## 🗂️ Project Structure

```
Reelx/
├── index.html        — Markup and layout
├── style.css         — All styling (dark cinema theme)
├── app.js            — API calls, state, slideshow engine, inline video
├── .env              — Your TMDB API key (never commit this)
├── .gitignore        — Excludes .env and node_modules
├── package.json      — Vite dev dependency
└── README.md         — This file
```

---

## 🔑 Setting Up Your TMDB API Key

### Step 1 — Get a TMDB API Key
1. Go to [https://www.themoviedb.org](https://www.themoviedb.org) and sign up (free)
2. Click your avatar → **Settings** → **API** (left sidebar)
3. Under **API Key**, click **Create** → select **Developer**
4. Fill in the form:
   - Application Name: `Reelx`
   - Application URL: `http://localhost:5173`
   - Summary: "Personal movie browser app"
5. Copy your **API Key (v3 auth)** — it looks like `a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4`

### Step 2 — Add it to `.env`
Open the `.env` file in the project root and paste your key:

```env
VITE_API_KEY=a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4
```

> ⚠️ **Never commit `.env` to GitHub.** It's already listed in `.gitignore` — keep it that way.

---

## 🚀 Running the Project

Reelx uses **Vite** as a dev server (required because `app.js` uses `import.meta.env` to read your API key securely).

### Install dependencies
```bash
npm install
```

### Start the dev server
```bash
npm run dev
```

Then open [http://localhost:5173](http://localhost:5173) in your browser.

> ℹ️ Do **not** open `index.html` directly as a file — `import.meta.env` won't work without Vite running.

---

## 🚀 Usage

| Action | How |
|---|---|
| Browse movies | Click Trending / Popular / Top Rated / Upcoming in the navbar |
| Search | Type in the search bar and press Enter or click the icon |
| Hero slideshow | Auto-advances every 7s — use arrows or dots to navigate manually |
| Inline trailer | Plays automatically after 8s on a slide — toggle mute or click ✕ to close |
| Watch trailer (modal) | Click **▶ Trailer** on the hero or **▶ Watch Trailer** on the detail page |
| View details | Click any movie card |
| Go back | Click the ← Back button |
| Pagination | Use Prev / Next buttons at the bottom of the grid |
| Mobile nav | Tap the ☰ hamburger icon to open/close the menu |

---

## 🛠️ Tech Stack

- **HTML5** — semantic structure
- **CSS3** — custom properties, grid, flexbox, keyframe animations
- **JavaScript (ES6+)** — fetch API, async/await, DOM manipulation, ES modules
- **Vite** — dev server + environment variable handling
- **TMDB API v3** — movie data, images, cast, trailers, similar movies
- **Google Fonts** — Bebas Neue (display) + DM Sans (body)
- **YouTube Embed API** — trailer playback (modal + inline hero)

---

## 🎨 Design Notes

- Accent colour: `#e8b44c` (gold)
- Background: `#0a0a0f` (near black)
- Fonts: Bebas Neue for headings, DM Sans for body text
- The hero inline video uses `scale(1.6)` on the iframe to fill the non-standard hero height without letterboxing
- Ken Burns: each slide gets `opacity` crossfade + a `@keyframes kenBurns` animation that zooms from `scale(1)` to `scale(1.14)` over 10s, restarting on every slide change

---

## 📄 License

This project uses the [TMDB API](https://www.themoviedb.org/documentation/api) but is not endorsed or certified by TMDB.