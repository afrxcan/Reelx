
const CONFIG = {
  API_KEY: import.meta.env.VITE_API_KEY,
  BASE_URL: "https://api.themoviedb.org/3",
  IMG_BASE: "https://image.tmdb.org/t/p/",
  POSTER_SIZE: "w500",
  BACKDROP_SIZE: "w1280",
  PROFILE_SIZE: "w185",
};

// ──────────────────────────────────────────────
// STATE
// ──────────────────────────────────────────────
const state = {
  currentPage: 1,
  totalPages: 1,
  currentFilter: "trending",
  currentMovieId: null,
  searchQuery: "",
  // Slideshow
  heroMovies: [],
  heroIndex: 0,
  heroTimer: null,
  heroInterval: 9870,        // ~10s between slides
  // Netflix inline video
  heroVideoTimer: null,      // fires after ~5s to auto-play trailer
  heroVideoDelay: 4590,      // how long to show backdrop before video plays
  heroMuted: true,           // video starts muted (required for autoplay)
  heroVideoKey: null,        // YouTube key for current slide's trailer
};

// ──────────────────────────────────────────────
// DOM
// ──────────────────────────────────────────────
const DOM = {
  homeView:          () => document.getElementById("home-view"),
  detailView:        () => document.getElementById("detail-view"),
  movieGrid:         () => document.getElementById("movie-grid"),
  spinner:           () => document.getElementById("loading-spinner"),
  errorState:        () => document.getElementById("error-state"),
  errorMsg:          () => document.getElementById("error-message"),
  // Hero slideshow
  heroSlides:        () => document.getElementById("hero-slides"),
  heroDots:          () => document.getElementById("hero-dots"),
  heroPrev:          () => document.getElementById("hero-prev"),
  heroNext:          () => document.getElementById("hero-next"),
  heroProgressBar:   () => document.getElementById("hero-progress-bar"),
  heroTitle:         () => document.getElementById("hero-title"),
  heroOverview:      () => document.getElementById("hero-overview"),
  heroMeta:          () => document.getElementById("hero-meta"),
  heroContent:       () => document.getElementById("hero-content"),
  heroDetailsBtn:    () => document.getElementById("hero-details-btn"),
  heroTrailerBtn:    () => document.getElementById("hero-trailer-btn"),
  // Inline video
  heroVideoLayer:    () => document.getElementById("hero-video-layer"),
  heroVideoIframe:   () => document.getElementById("hero-video-iframe"),
  heroVideoControls: () => document.getElementById("hero-video-controls"),
  heroMuteBtn:       () => document.getElementById("hero-mute-btn"),
  heroVideoClose:    () => document.getElementById("hero-video-close"),
  iconMuted:         () => document.getElementById("icon-muted"),
  iconUnmuted:       () => document.getElementById("icon-unmuted"),
  // Nav
  sectionTitle:      () => document.getElementById("section-title"),
  sectionCount:      () => document.getElementById("section-count"),
  prevPageBtn:       () => document.getElementById("prev-page"),
  nextPageBtn:       () => document.getElementById("next-page"),
  pageInfo:          () => document.getElementById("page-info"),
  backBtn:           () => document.getElementById("back-btn"),
  searchInput:       () => document.getElementById("search-input"),
  searchBtn:         () => document.getElementById("search-btn"),
  navBrand:          () => document.getElementById("nav-brand"),
  navBtns:           () => document.querySelectorAll(".nav-btn"),
  navHamburger:      () => document.getElementById("nav-hamburger"),
  navBody:           () => document.getElementById("nav-body"),
  // Detail
  detailHeroBg:      () => document.getElementById("detail-hero-bg"),
  detailPoster:      () => document.getElementById("detail-poster"),
  detailTitle:       () => document.getElementById("detail-title"),
  detailTagline:     () => document.getElementById("detail-tagline"),
  detailBadges:      () => document.getElementById("detail-badges"),
  detailOverview:    () => document.getElementById("detail-overview"),
  detailStats:       () => document.getElementById("detail-stats"),
  detailTrailerBtn:  () => document.getElementById("detail-trailer-btn"),
  castRow:           () => document.getElementById("cast-row"),
  infoGrid:          () => document.getElementById("info-grid"),
  similarGrid:       () => document.getElementById("similar-grid"),
  // Modal
  modalOverlay:      () => document.getElementById("modal-overlay"),
  modalClose:        () => document.getElementById("modal-close"),
  trailerIframe:     () => document.getElementById("trailer-iframe"),
  toast:             () => document.getElementById("toast"),
};

// ──────────────────────────────────────────────
// API HELPERS
// ──────────────────────────────────────────────
async function apiFetch(endpoint, params = {}) {
  const url = new URL(`${CONFIG.BASE_URL}${endpoint}`);
  url.searchParams.set("api_key", CONFIG.API_KEY);
  url.searchParams.set("language", "en-US");
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`API error ${res.status}: ${res.statusText}`);
  return res.json();
}

function imgUrl(path, size = CONFIG.POSTER_SIZE) {
  if (!path) return null;
  return `${CONFIG.IMG_BASE}${size}${path}`;
}

function ratingColor(r) {
  if (r >= 7.5) return "var(--green)";
  if (r >= 5)   return "var(--accent)";
  return "var(--red)";
}

function formatMoney(n) {
  if (!n || n === 0) return "N/A";
  return "$" + (n >= 1e9 ? (n / 1e9).toFixed(1) + "B" : (n / 1e6).toFixed(0) + "M");
}

function formatRuntime(mins) {
  if (!mins) return "N/A";
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

// ──────────────────────────────────────────────
// FETCH MOVIES
// ──────────────────────────────────────────────
async function fetchMovies(filter = "trending", page = 1, query = "") {
  showLoading(true);
  try {
    let data;
    if (query) {
      data = await apiFetch("/search/movie", { query, page });
      DOM.sectionTitle().textContent = `Results for "${query}"`;
    } else {
      const endpoints = {
        trending:  "/trending/movie/week",
        popular:   "/movie/popular",
        top_rated: "/movie/top_rated",
        upcoming:  "/movie/upcoming",
      };
      const titles = {
        trending:  "Trending This Week",
        popular:   "What's Popular",
        top_rated: "Top Rated All Time",
        upcoming:  "Coming Soon",
      };
      data = await apiFetch(endpoints[filter] || "/trending/movie/week", { page });
      DOM.sectionTitle().textContent = titles[filter] || "Movies";
    }

    state.totalPages = Math.min(data.total_pages || 1, 500);
    DOM.sectionCount().textContent = `${data.total_results?.toLocaleString() || 0} movies`;
    renderGrid(data.results || []);
    updatePagination();

    if (data.results?.length && page === 1) {
      initHero(data.results);
    }
  } catch (err) {
    showError(err.message);
  } finally {
    showLoading(false);
  }
}

// ══════════════════════════════════════════════
// HERO SLIDESHOW — Ken Burns
// ══════════════════════════════════════════════

function initHero(movies) {
  state.heroMovies = movies.slice(0, 5);
  state.heroIndex  = 0;
  stopHeroTimer();
  stopHeroVideo();
  buildSlides();
  buildDots();
  goToSlide(0);
  startHeroTimer();
}

/**
 * Ken Burns approach: each slide is position:absolute, stacked.
 * Active slide gets opacity:1 + the kenBurns CSS animation.
 * We remove+re-add the class so the animation restarts per slide.
 */
function buildSlides() {
  const container = DOM.heroSlides();
  container.innerHTML = "";

  state.heroMovies.forEach((movie, i) => {
    const backdrop = imgUrl(movie.backdrop_path, CONFIG.BACKDROP_SIZE);
    const slide = document.createElement("div");
    slide.className = "hero-slide";
    slide.dataset.index = i;
    if (backdrop) slide.style.backgroundImage = `url(${backdrop})`;
    container.appendChild(slide);
  });
}

function buildDots() {
  const container = DOM.heroDots();
  container.innerHTML = "";

  state.heroMovies.forEach((_, i) => {
    const dot = document.createElement("button");
    dot.className = "hero-dot";
    dot.setAttribute("aria-label", `Slide ${i + 1}`);
    dot.addEventListener("click", () => { goToSlide(i); resetHeroTimer(); });
    container.appendChild(dot);
  });
}

function goToSlide(index) {
  const movies = state.heroMovies;
  if (!movies.length) return;

  // Stop any playing inline video first
  stopHeroVideo();

  index = (index + movies.length) % movies.length;
  state.heroIndex = index;

  // ── Ken Burns: remove .active from all, re-add to target ──
  // Removing + re-adding restarts the @keyframes animation cleanly
  document.querySelectorAll(".hero-slide").forEach((slide, i) => {
    slide.classList.remove("active");
    if (i === index) {
      // Brief timeout so browser registers the class removal before re-adding
      setTimeout(() => slide.classList.add("active"), 20);
    }
  });

  // ── Dots ──
  document.querySelectorAll(".hero-dot").forEach((dot, i) => {
    dot.classList.toggle("active", i === index);
  });

  // ── Text ──
  updateHeroContent(movies[index]);

  // ── Progress bar ──
  animateProgressBar();

  // ── Fetch trailer key in background, schedule auto-play ──
  scheduleHeroVideo(movies[index].id);
}

function updateHeroContent(movie) {
  const content = DOM.heroContent();
  content.classList.remove("animate");
  void content.offsetWidth; // force reflow to restart animation
  content.classList.add("animate");

  DOM.heroTitle().textContent    = movie.title || movie.name || "—";
  DOM.heroOverview().textContent = movie.overview || "";
  DOM.heroMeta().innerHTML = `
    <span class="meta-rating">★ ${movie.vote_average?.toFixed(1) || "N/A"}</span>
    <span class="meta-dot">•</span>
    <span>${movie.release_date?.slice(0, 4) || "—"}</span>
    <span class="meta-dot">•</span>
    <span>${movie.vote_count?.toLocaleString() || 0} votes</span>
  `;
  DOM.heroDetailsBtn().onclick = () => openDetail(movie.id);
  DOM.heroTrailerBtn().onclick = () => fetchAndPlayTrailer(movie.id);
}

function animateProgressBar() {
  const bar = DOM.heroProgressBar();
  bar.style.transition = "none";
  bar.style.width = "0%";
  void bar.offsetWidth;
  bar.style.transition = `width ${state.heroInterval}ms linear`;
  bar.style.width = "100%";
}

// ── Slide timer ──
function startHeroTimer() {
  state.heroTimer = setInterval(() => goToSlide(state.heroIndex + 1), state.heroInterval);
}
function stopHeroTimer() {
  if (state.heroTimer) { clearInterval(state.heroTimer); state.heroTimer = null; }
}
function resetHeroTimer() { stopHeroTimer(); startHeroTimer(); }


// ══════════════════════════════════════════════
// NETFLIX-STYLE INLINE HERO TRAILER
// ══════════════════════════════════════════════

/**
 * Fetches the trailer key for the current slide's movie,
 * then sets a timer to auto-play after heroVideoDelay ms.
 * If the slide changes before the timer fires, stopHeroVideo() cancels it.
 */
async function scheduleHeroVideo(movieId) {
  // Clear any pending video timer from previous slide
  if (state.heroVideoTimer) { clearTimeout(state.heroVideoTimer); state.heroVideoTimer = null; }
  state.heroVideoKey = null;

  try {
    const data = await apiFetch(`/movie/${movieId}/videos`);
    const trailer = (data.results || []).find(v => v.type === "Trailer" && v.site === "YouTube");
    if (!trailer) return;
    state.heroVideoKey = trailer.key;

    // Wait heroVideoDelay ms, then fade the video in over the backdrop
    state.heroVideoTimer = setTimeout(() => {
      playHeroVideo(trailer.key);
    }, state.heroVideoDelay);

  } catch {
    // Silently fail — no video is fine
  }
}

/**
 * Loads the YouTube iframe in the hero and fades it in.
 * Starts muted (browsers block unmuted autoplay).
 * The mute button lets the user toggle audio.
 */
function playHeroVideo(key) {
  if (!key) return;

  // Build embed URL
  // mute=1 required for autoplay; enablejsapi for postMessage control
  const src = `https://www.youtube.com/embed/${key}?autoplay=1&mute=1&controls=0&loop=1&playlist=${key}&modestbranding=1&rel=0`;
  DOM.heroVideoIframe().src = src;
  state.heroMuted = true;
  updateMuteIcon();

  // Fade video layer in
  DOM.heroVideoLayer().classList.add("playing");

  // Show controls
  DOM.heroVideoControls().classList.add("visible");

  // Pause the slide timer while video plays
  stopHeroTimer();
}

function stopHeroVideo() {
  // Clear pending timer
  if (state.heroVideoTimer) { clearTimeout(state.heroVideoTimer); state.heroVideoTimer = null; }

  // Unload the iframe by clearing src (stops audio/video)
  DOM.heroVideoIframe().src = "";

  // Hide video layer + controls
  DOM.heroVideoLayer().classList.remove("playing");
  DOM.heroVideoControls().classList.remove("visible");

  state.heroVideoKey = null;
}

/**
 * Toggle mute by reloading the iframe with mute=0 or mute=1.
 * YouTube's iframe API needs postMessage for this, but reloading
 * with the right param is simpler and works without the API script.
 */
function toggleHeroMute() {
  if (!state.heroVideoKey) return;
  state.heroMuted = !state.heroMuted;
  const muteParam = state.heroMuted ? "1" : "0";
  const src = `https://www.youtube.com/embed/${state.heroVideoKey}?autoplay=1&mute=${muteParam}&controls=0&loop=1&playlist=${state.heroVideoKey}&modestbranding=1&rel=0`;
  DOM.heroVideoIframe().src = src;
  updateMuteIcon();
}

function updateMuteIcon() {
  DOM.iconMuted().style.display   = state.heroMuted ? "block" : "none";
  DOM.iconUnmuted().style.display = state.heroMuted ? "none"  : "block";
}


// ──────────────────────────────────────────────
// MOVIE GRID
// ──────────────────────────────────────────────
function renderGrid(movies) {
  const grid = DOM.movieGrid();
  grid.innerHTML = "";
  if (!movies.length) {
    grid.innerHTML = `<p style="color:var(--text-muted);padding:40px 0;grid-column:1/-1">No movies found.</p>`;
    return;
  }
  movies.forEach(movie => {
    const poster = imgUrl(movie.poster_path);
    const card = document.createElement("div");
    card.className = "movie-card";
    card.innerHTML = `
      <div class="card-poster-wrap">
        ${poster
          ? `<img class="card-poster" src="${poster}" alt="${movie.title}" loading="lazy" />`
          : `<div class="card-no-poster">🎬</div>`}
        <div class="card-rating" style="color:${ratingColor(movie.vote_average)}">
          ★ ${movie.vote_average?.toFixed(1) || "?"}
        </div>
        <div class="card-overlay">
          <p class="card-overlay-text">${movie.overview || "No description."}</p>
        </div>
      </div>
      <div class="card-body">
        <p class="card-title">${movie.title || movie.name}</p>
        <div class="card-meta">
          <span>${movie.release_date?.slice(0,4) || "—"}</span>
          <span>·</span>
          <span>${movie.vote_count?.toLocaleString() || 0} votes</span>
        </div>
      </div>
    `;
    card.addEventListener("click", () => openDetail(movie.id));
    grid.appendChild(card);
  });
}

// ──────────────────────────────────────────────
// DETAIL VIEW
// ──────────────────────────────────────────────
async function openDetail(movieId) {
  DOM.homeView().style.display   = "none";
  DOM.detailView().style.display = "block";
  stopHeroTimer();
  stopHeroVideo();
  window.scrollTo({ top: 0, behavior: "smooth" });
  state.currentMovieId = movieId;

  DOM.castRow().innerHTML = `<div class="loading-spinner" style="padding:20px 0"><div class="spinner"></div></div>`;
  DOM.similarGrid().innerHTML = "";
  DOM.infoGrid().innerHTML = "";

  try {
    const [detail, credits, videos, similar] = await Promise.all([
      apiFetch(`/movie/${movieId}`),
      apiFetch(`/movie/${movieId}/credits`),
      apiFetch(`/movie/${movieId}/videos`),
      apiFetch(`/movie/${movieId}/similar`),
    ]);
    renderDetail(detail, videos);
    renderCast(credits.cast || []);
    renderMoreInfo(detail);
    renderGrid_similar(similar.results || []);
  } catch (err) {
    showToast("Failed to load movie details.");
    console.error(err);
  }
}

function renderDetail(movie, videosData) {
  const backdrop = imgUrl(movie.backdrop_path, CONFIG.BACKDROP_SIZE);
  const poster   = imgUrl(movie.poster_path);

  if (backdrop) DOM.detailHeroBg().style.backgroundImage = `url(${backdrop})`;
  DOM.detailPoster().src = poster || "";
  DOM.detailPoster().alt = movie.title;
  DOM.detailTitle().textContent    = movie.title;
  DOM.detailTagline().textContent  = movie.tagline ? `"${movie.tagline}"` : "";
  DOM.detailOverview().textContent = movie.overview || "No overview available.";

  const genres = (movie.genres || []).map(g => `<span class="badge badge-genre">${g.name}</span>`).join("");
  const rating = `<span class="badge badge-rating">★ ${movie.vote_average?.toFixed(1)}</span>`;
  const status = movie.status ? `<span class="badge badge-status">${movie.status}</span>` : "";
  DOM.detailBadges().innerHTML = rating + genres + status;

  DOM.detailStats().innerHTML = `
    <div class="stat-item"><span class="stat-label">Release</span><span class="stat-value">${movie.release_date || "—"}</span></div>
    <div class="stat-item"><span class="stat-label">Runtime</span><span class="stat-value">${formatRuntime(movie.runtime)}</span></div>
    <div class="stat-item"><span class="stat-label">Budget</span><span class="stat-value">${formatMoney(movie.budget)}</span></div>
    <div class="stat-item"><span class="stat-label">Revenue</span><span class="stat-value gold">${formatMoney(movie.revenue)}</span></div>
    <div class="stat-item"><span class="stat-label">Votes</span><span class="stat-value">${movie.vote_count?.toLocaleString()}</span></div>
    <div class="stat-item"><span class="stat-label">Popularity</span><span class="stat-value">${movie.popularity?.toFixed(0)}</span></div>
  `;

  const trailers = (videosData.results || []).filter(v => v.type === "Trailer" && v.site === "YouTube");
  if (trailers.length) {
    DOM.detailTrailerBtn().style.display = "inline-flex";
    DOM.detailTrailerBtn().onclick = () => openModal(`https://www.youtube.com/embed/${trailers[0].key}?autoplay=1`);
  } else {
    DOM.detailTrailerBtn().style.display = "none";
  }
}

function renderCast(cast) {
  const row = DOM.castRow();
  row.innerHTML = "";
  const visible = cast.slice(0, 20);
  if (!visible.length) { row.innerHTML = `<p style="color:var(--text-muted)">No cast info.</p>`; return; }
  visible.forEach(person => {
    const photo = imgUrl(person.profile_path, CONFIG.PROFILE_SIZE);
    const card = document.createElement("div");
    card.className = "cast-card";
    card.innerHTML = `
      ${photo ? `<img class="cast-photo" src="${photo}" alt="${person.name}" loading="lazy" />` : `<div class="cast-photo-placeholder">👤</div>`}
      <p class="cast-name">${person.name}</p>
      <p class="cast-character">${person.character || "—"}</p>
    `;
    row.appendChild(card);
  });
}

function renderMoreInfo(movie) {
  const items = [
    { label: "Original Title",      value: movie.original_title },
    { label: "Language",            value: movie.original_language?.toUpperCase() },
    { label: "Countries",           value: (movie.production_countries || []).map(c => c.name).join(", ") || "—" },
    { label: "Production",          value: (movie.production_companies || []).map(c => c.name).join(", ") || "—" },
    { label: "Spoken Languages",    value: (movie.spoken_languages || []).map(l => l.english_name).join(", ") || "—" },
    { label: "Homepage",            value: movie.homepage ? `<a href="${movie.homepage}" target="_blank" style="color:var(--accent)">Visit →</a>` : "—" },
  ];
  DOM.infoGrid().innerHTML = items.map(i => `
    <div class="info-card">
      <p class="info-card-label">${i.label}</p>
      <p class="info-card-value">${i.value || "—"}</p>
    </div>
  `).join("");
}

function renderGrid_similar(movies) {
  const grid = DOM.similarGrid();
  grid.innerHTML = "";
  const slice = movies.slice(0, 10);
  if (!slice.length) { grid.innerHTML = `<p style="color:var(--text-muted);grid-column:1/-1">No similar movies.</p>`; return; }
  slice.forEach(movie => {
    const poster = imgUrl(movie.poster_path);
    const card = document.createElement("div");
    card.className = "movie-card";
    card.innerHTML = `
      <div class="card-poster-wrap">
        ${poster ? `<img class="card-poster" src="${poster}" alt="${movie.title}" loading="lazy" />` : `<div class="card-no-poster">🎬</div>`}
        <div class="card-rating" style="color:${ratingColor(movie.vote_average)}">★ ${movie.vote_average?.toFixed(1) || "?"}</div>
      </div>
      <div class="card-body">
        <p class="card-title">${movie.title}</p>
        <div class="card-meta"><span>${movie.release_date?.slice(0,4) || "—"}</span></div>
      </div>
    `;
    card.addEventListener("click", () => openDetail(movie.id));
    grid.appendChild(card);
  });
}

// ──────────────────────────────────────────────
// MODAL TRAILER
// ──────────────────────────────────────────────
async function fetchAndPlayTrailer(movieId) {
  try {
    const data = await apiFetch(`/movie/${movieId}/videos`);
    const trailer = (data.results || []).find(v => v.type === "Trailer" && v.site === "YouTube");
    if (trailer) openModal(`https://www.youtube.com/embed/${trailer.key}?autoplay=1`);
    else showToast("No trailer available.");
  } catch { showToast("Could not fetch trailer."); }
}

function openModal(src) {
  DOM.trailerIframe().src = src;
  DOM.modalOverlay().style.display = "flex";
  document.body.style.overflow = "hidden";
}

function closeModal() {
  DOM.trailerIframe().src = "";
  DOM.modalOverlay().style.display = "none";
  document.body.style.overflow = "";
}

// ──────────────────────────────────────────────
// PAGINATION
// ──────────────────────────────────────────────
function updatePagination() {
  DOM.prevPageBtn().disabled = state.currentPage <= 1;
  DOM.nextPageBtn().disabled = state.currentPage >= state.totalPages;
  DOM.pageInfo().textContent = `Page ${state.currentPage} / ${state.totalPages}`;
}

// ──────────────────────────────────────────────
// LOADING / ERROR / TOAST
// ──────────────────────────────────────────────
function showLoading(show) {
  DOM.spinner().style.display    = show ? "flex" : "none";
  DOM.movieGrid().style.display  = show ? "none" : "grid";
  DOM.errorState().style.display = "none";
}
function showError(msg) {
  DOM.spinner().style.display    = "none";
  DOM.movieGrid().style.display  = "none";
  DOM.errorState().style.display = "flex";
  DOM.errorMsg().textContent = msg;
}
function showToast(msg, duration = 3000) {
  const t = DOM.toast();
  t.textContent = msg;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), duration);
}

// ──────────────────────────────────────────────
// NAVIGATION
// ──────────────────────────────────────────────
function goHome() {
  DOM.detailView().style.display = "none";
  DOM.homeView().style.display   = "block";
  window.scrollTo({ top: 0, behavior: "smooth" });
  if (state.heroMovies.length) {
    animateProgressBar();
    startHeroTimer();
  }
}

function setActiveNav(filter) {
  DOM.navBtns().forEach(btn => btn.classList.toggle("active", btn.dataset.filter === filter));
}

// ──────────────────────────────────────────────
// EVENTS
// ──────────────────────────────────────────────
function initEvents() {

  // ── Hamburger ──
  DOM.navHamburger().addEventListener("click", () => {
    const open = DOM.navBody().classList.toggle("open");
    DOM.navHamburger().classList.toggle("open", open);
  });

  // Close nav when a nav button is clicked on mobile
  DOM.navBtns().forEach(btn => {
    btn.addEventListener("click", () => {
      DOM.navBody().classList.remove("open");
      DOM.navHamburger().classList.remove("open");
    });
  });

  // ── Hero arrows ──
  DOM.heroPrev().addEventListener("click", () => { goToSlide(state.heroIndex - 1); resetHeroTimer(); });
  DOM.heroNext().addEventListener("click", () => { goToSlide(state.heroIndex + 1); resetHeroTimer(); });

  // ── Hero arrows ──
  DOM.heroPrev().addEventListener("click", () => { goToSlide(state.heroIndex - 1); resetHeroTimer(); });
  DOM.heroNext().addEventListener("click", () => { goToSlide(state.heroIndex + 1); resetHeroTimer(); });

 // ── Hero Interaction Logic ──
  const heroEl = DOM.heroContent();
  if (heroEl) {
    // Stop on tap (mobile)
    heroEl.addEventListener("touchstart", () => {
      state.isTouchPaused = true; 
      stopHeroTimer();
      if (state.heroVideoTimer) { 
        clearTimeout(state.heroVideoTimer); 
        state.heroVideoTimer = null;
      }
    }, { passive: true });

    // Stop on hover (desktop)
    heroEl.addEventListener("mouseenter", () => {
      if (state.isTouchPaused) return; 
      stopHeroTimer();
      if (state.heroVideoTimer) { 
        clearTimeout(state.heroVideoTimer); 
        state.heroVideoTimer = null;
      }
    });

    // Resume on mouse leave (desktop)
    heroEl.addEventListener("mouseleave", () => {
      if (state.isTouchPaused) return; 
      if (state.heroMovies.length && !DOM.heroVideoLayer().classList.contains("playing")) {
        startHeroTimer();
      }
    });
  }

  // ── Inline video controls ──
  DOM.heroMuteBtn().addEventListener("click", toggleHeroMute);
  DOM.heroVideoClose().addEventListener("click", () => {
    stopHeroVideo();
    resetHeroTimer();
  });

  // ── Nav filter tabs ──
  DOM.navBtns().forEach(btn => {
    btn.addEventListener("click", () => {
      state.currentFilter = btn.dataset.filter;
      state.currentPage   = 1;
      state.searchQuery   = "";
      DOM.searchInput().value = "";
      setActiveNav(state.currentFilter);
      goHome();
      fetchMovies(state.currentFilter, 1);
    });
  });

  // ── Brand → home ──
  DOM.navBrand().addEventListener("click", () => {
    state.currentFilter = "trending";
    state.currentPage   = 1;
    state.searchQuery   = "";
    DOM.searchInput().value = "";
    setActiveNav("trending");
    goHome();
    fetchMovies("trending", 1);
  });

  // ── Search ──
  const doSearch = () => {
    const q = DOM.searchInput().value.trim();
    if (!q) return;
    state.searchQuery = q;
    state.currentPage = 1;
    goHome();
    fetchMovies(state.currentFilter, 1, q);
  };
  DOM.searchBtn().addEventListener("click", doSearch);
  DOM.searchInput().addEventListener("keydown", e => { if (e.key === "Enter") doSearch(); });

  // ── Pagination ──
  DOM.prevPageBtn().addEventListener("click", () => {
    if (state.currentPage > 1) {
      state.currentPage--;
      fetchMovies(state.currentFilter, state.currentPage, state.searchQuery);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  });
  DOM.nextPageBtn().addEventListener("click", () => {
    if (state.currentPage < state.totalPages) {
      state.currentPage++;
      fetchMovies(state.currentFilter, state.currentPage, state.searchQuery);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  });

  // ── Back ──
  DOM.backBtn().addEventListener("click", goHome);

  // ── Modal ──
  DOM.modalClose().addEventListener("click", closeModal);
  DOM.modalOverlay().addEventListener("click", e => { if (e.target === DOM.modalOverlay()) closeModal(); });
  document.addEventListener("keydown", e => { if (e.key === "Escape") closeModal(); });

  // ── Retry ──
  document.getElementById("retry-btn")?.addEventListener("click", () => {
    fetchMovies(state.currentFilter, state.currentPage, state.searchQuery);
  });
}

// ──────────────────────────────────────────────
// INIT
// ──────────────────────────────────────────────
function init() {
  initEvents();
  fetchMovies("trending", 1);
}

init();