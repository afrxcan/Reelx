# 🎬 Reelx

A sleek, TMDB-style movie discovery website built with vanilla HTML, CSS, and JavaScript.
Dark cinema aesthetic — no frameworks, no build tools, just open the browser and go.


---

## ✨ Features

- 🔥 **Trending / Popular / Top Rated / Upcoming** tabs
- 🔍 **Live search** across the full TMDB movie catalogue
- 🎥 **Movie detail pages** with overview, cast, stats, similar movies
- 📽️ **Trailer playback** via YouTube embed modal
- 🎭 **Full cast row** with profile photos and character names
- 📊 **Budget, revenue, runtime, production info**
- 📱 **Responsive** — works on mobile and desktop
- ✨ **Smooth animations** — card hovers, hero transitions, toast notifications

---

## 🗂️ Project Structure

```
Reelx/
├── index.html   — Markup and layout
├── style.css    — All styling (dark cinema theme)
├── app.js       — API calls, state, rendering
└── README.md    — This file
```

---



> ⚠️ **Important:** Never commit your API key to a public GitHub repo.
> If you push this to GitHub, add your key to `.gitignore` or use an environment variable system.

---

## 🚀 Usage

| Action | How |
|---|---|
| Browse movies | Click Trending / Popular / Top Rated / Upcoming in navbar |
| Search | Type in the search bar and press Enter or click the icon |
| View details | Click any movie card |
| Watch trailer | Click **▶ Watch Trailer** or **▶ Trailer** on hero |
| Go back | Click the ← Back button |
| Next page | Use Prev / Next buttons at the bottom |

---

## 🛠️ Tech Stack

- **HTML5** — semantic structure
- **CSS3** — custom properties, grid, flexbox, animations
- **JavaScript (ES6+)** — fetch API, async/await, DOM manipulation
- **TMDB API v3** — movie data, images, cast, trailers
- **Google Fonts** — Bebas Neue (display) + DM Sans (body)
- **YouTube Embed** — trailer playback

---

## 📄 License

This project uses the [TMDB API](https://www.themoviedb.org/documentation/api) but is not endorsed or certified by TMDB.