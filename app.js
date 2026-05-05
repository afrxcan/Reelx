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
  heroMovies: [],        // array of up to 5 movies for the hero
  heroIndex: 0,          // which slide is currently active
  heroTimer: null,       // holds the setInterval reference
  heroInterval: 6000,    // ms between slides (6 seconds)
};
 
// ──────────────────────────────────────────────
// DOM REFERENCES
// ──────────────────────────────────────────────
const DOM = {
  homeView:        () => document.getElementById("home-view"),
  detailView:      () => document.getElementById("detail-view"),
  movieGrid:       () => document.getElementById("movie-grid"),
  spinner:         () => document.getElementById("loading-spinner"),
  errorState:      () => document.getElementById("error-state"),
  errorMsg:        () => document.getElementById("error-message"),
  heroSlides:      () => document.getElementById("hero-slides"),
  heroDots:        () => document.getElementById("hero-dots"),
  heroPrev:        () => document.getElementById("hero-prev"),
  heroNext:        () => document.getElementById("hero-next"),
  heroProgressBar: () => document.getElementById("hero-progress-bar"),
  heroTitle:       () => document.getElementById("hero-title"),
  heroOverview:    () => document.getElementById("hero-overview"),
  heroMeta:        () => document.getElementById("hero-meta"),
  heroContent:     () => document.getElementById("hero-content"),
  heroTrailerBtn:  () => document.getElementById("hero-trailer-btn"),
  sectionTitle:    () => document.getElementById("section-title"),
  sectionCount:    () => document.getElementById("section-count"),
  prevPageBtn:     () => document.getElementById("prev-page"),
  nextPageBtn:     () => document.getElementById("next-page"),
  pageInfo:        () => document.getElementById("page-info"),
  backBtn:         () => document.getElementById("back-btn"),
  searchInput:     () => document.getElementById("search-input"),
  searchBtn:       () => document.getElementById("search-btn"),
  navBrand:        () => document.getElementById("nav-brand"),
  navBtns:         () => document.querySelectorAll(".nav-btn"),
  // Detail
  detailHeroBg:    () => document.getElementById("detail-hero-bg"),
  detailPoster:    () => document.getElementById("detail-poster"),
  detailTitle:     () => document.getElementById("detail-title"),
  detailTagline:   () => document.getElementById("detail-tagline"),
  detailBadges:    () => document.getElementById("detail-badges"),
  detailOverview:  () => document.getElementById("detail-overview"),
  detailStats:     () => document.getElementById("detail-stats"),
  detailTrailerBtn:() => document.getElementById("detail-trailer-btn"),
  castRow:         () => document.getElementById("cast-row"),
  infoGrid:        () => document.getElementById("info-grid"),
  similarGrid:     () => document.getElementById("similar-grid"),
  // Modal
  modalOverlay:    () => document.getElementById("modal-overlay"),
  modalClose:      () => document.getElementById("modal-close"),
  trailerIframe:   () => document.getElementById("trailer-iframe"),
  toast:           () => document.getElementById("toast"),
};
 
// ──────────────────────────────────────────────
// API HELPERS
// ──────────────────────────────────────────────
async function apiFetch(endpoint, params = {}) {
  if (CONFIG.API_KEY === "YOUR_TMDB_API_KEY_HERE") {
    throw new Error("Please set your TMDB API key in app.js (CONFIG.API_KEY)");
  }
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
 
function ratingColor(rating) {
  if (rating >= 7.5) return "var(--green)";
  if (rating >= 5) return "var(--accent)";
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
// FETCH MOVIES (home grid)
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
        trending: "/trending/movie/week",
        popular:  "/movie/popular",
        top_rated:"/movie/top_rated",
        upcoming: "/movie/upcoming",
      };
      const titles = {
        trending: "Trending This Week",
        popular:  "What's Popular",
        top_rated:"Top Rated All Time",
        upcoming: "Coming Soon",
      };
      data = await apiFetch(endpoints[filter] || "/trending/movie/week", { page });
      DOM.sectionTitle().textContent = titles[filter] || "Movies";
    }
 
    state.totalPages = Math.min(data.total_pages || 1, 500);
    DOM.sectionCount().textContent = `${data.total_results?.toLocaleString() || 0} movies`;
    renderGrid(data.results || []);
    updatePagination();
 
    // Build/rebuild hero slideshow from the first 5 results
    if (data.results?.length && page === 1) {
      initHero(data.results);
    }
  } catch (err) {
    showError(err.message);
  } finally {
    showLoading(false);
  }
}
 
// ──────────────────────────────────────────────
// HERO SLIDESHOW ENGINE
// ──────────────────────────────────────────────
 
/**
 * Called once when movies first load.
 * Builds all the slide layers and dot buttons,
 * then starts the auto-advance timer.
 */
function initHero(movies) {
  // Keep only the first 5 movies for the slideshow
  state.heroMovies = movies.slice(0, 5);
  state.heroIndex = 0;
 
  // Stop any existing timer before rebuilding
  stopHeroTimer();
 
  buildSlides();
  buildDots();
  goToSlide(0);      // show the first slide immediately
  startHeroTimer();
}
 
/**
 * Creates one div per movie, placed side by side in a flex row.
 * The track is shifted left by translateX(-index * 100%)
 * to bring the target slide into view.
 */
function buildSlides() {
  const container = DOM.heroSlides();
  container.innerHTML = "";
  // Reset track position when rebuilding
  container.style.transform = "translateX(0)";
 
  state.heroMovies.forEach((movie, i) => {
    const backdrop = imgUrl(movie.backdrop_path, CONFIG.BACKDROP_SIZE);
    const slide = document.createElement("div");
    slide.className = "hero-slide";
    slide.dataset.index = i;
    if (backdrop) slide.style.backgroundImage = `url(${backdrop})`;
    container.appendChild(slide);
  });
}
 
/**
 * Creates one dot button per slide.
 * Clicking a dot jumps to that slide.
 */
function buildDots() {
  const dotsContainer = DOM.heroDots();
  dotsContainer.innerHTML = "";
 
  state.heroMovies.forEach((_, i) => {
    const dot = document.createElement("button");
    dot.className = "hero-dot";
    dot.dataset.index = i;
    dot.setAttribute("aria-label", `Go to slide ${i + 1}`);
    dot.addEventListener("click", () => {
      goToSlide(i);
      resetHeroTimer();   // restart timer so it doesn't skip immediately
    });
    dotsContainer.appendChild(dot);
  });
}
 
/**
 * The core function — moves to a specific slide by index.
 *
 * How the slide works:
 *   All slides sit in a flex row that's as wide as (numSlides × 100%).
 *   Shifting the row by -index × 100% brings the target slide into view.
 *   Example: index 2 → translateX(-200%) → third slide is visible.
 */
function goToSlide(index) {
  const movies = state.heroMovies;
  if (!movies.length) return;
 
  // Wrap around: going past the last slide loops to first, and vice versa
  index = (index + movies.length) % movies.length;
  state.heroIndex = index;
 
  // ── 1. Slide the track left ──
  // Shifting by -(index * 100%) moves exactly `index` slides off-screen to the left
  DOM.heroSlides().style.transform = `translateX(-${index * 100}%)`;
 
  // ── 2. Update dots ──
  document.querySelectorAll(".hero-dot").forEach((dot, i) => {
    dot.classList.toggle("active", i === index);
  });
 
  // ── 3. Update text content with animation ──
  updateHeroContent(movies[index]);
 
  // ── 4. Restart progress bar ──
  animateProgressBar();
}
 
/**
 * Updates the title, overview, rating, and button handlers
 * for the currently active slide.
 */
function updateHeroContent(movie) {
  const content = DOM.heroContent();
 
  // Remove animation class, force reflow, re-add — this restarts the animation
  content.classList.remove("animate");
  void content.offsetWidth;   // triggers reflow
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
 
/**
 * Animates the bottom progress bar from 0% to 100%
 * over the slide interval duration.
 */
function animateProgressBar() {
  const bar = DOM.heroProgressBar();
  // Reset to 0 instantly
  bar.style.transition = "none";
  bar.style.width = "0%";
  // Force reflow so the reset registers before we animate
  void bar.offsetWidth;
  // Animate to 100% over the slide interval
  bar.style.transition = `width ${state.heroInterval}ms linear`;
  bar.style.width = "100%";
}
 
// ── Timer helpers ──
 
function startHeroTimer() {
  state.heroTimer = setInterval(() => {
    goToSlide(state.heroIndex + 1);
  }, state.heroInterval);
}
 
function stopHeroTimer() {
  if (state.heroTimer) {
    clearInterval(state.heroTimer);
    state.heroTimer = null;
  }
}
 
function resetHeroTimer() {
  stopHeroTimer();
  startHeroTimer();
}
 
// ──────────────────────────────────────────────
// RENDER MOVIE GRID
// ──────────────────────────────────────────────
function renderGrid(movies) {
  const grid = DOM.movieGrid();
  grid.innerHTML = "";
  if (!movies.length) {
    grid.innerHTML = `<p style="color:var(--text-muted); padding: 40px 0; grid-column:1/-1">No movies found.</p>`;
    return;
  }
  movies.forEach(movie => {
    const poster = imgUrl(movie.poster_path);
    const rating = movie.vote_average?.toFixed(1) || "?";
    const year = movie.release_date?.slice(0, 4) || "—";
    const card = document.createElement("div");
    card.className = "movie-card";
    card.innerHTML = `
      <div class="card-poster-wrap">
        ${poster
          ? `<img class="card-poster" src="${poster}" alt="${movie.title}" loading="lazy" />`
          : `<div class="card-no-poster">🎬</div>`}
        <div class="card-rating" style="color:${ratingColor(movie.vote_average)}">
          ★ ${rating}
        </div>
        <div class="card-overlay">
          <p class="card-overlay-text">${movie.overview || "No description available."}</p>
        </div>
      </div>
      <div class="card-body">
        <p class="card-title">${movie.title || movie.name}</p>
        <div class="card-meta">
          <span>${year}</span>
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
// OPEN DETAIL VIEW
// ──────────────────────────────────────────────
async function openDetail(movieId) {
  DOM.homeView().style.display = "none";
  DOM.detailView().style.display = "block";
  stopHeroTimer();   // pause slideshow while detail is open
  window.scrollTo({ top: 0, behavior: "smooth" });
  state.currentMovieId = movieId;
 
  // Clear previous
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
 
// ──────────────────────────────────────────────
// RENDER DETAIL
// ──────────────────────────────────────────────
function renderDetail(movie, videosData) {
  const backdrop = imgUrl(movie.backdrop_path, CONFIG.BACKDROP_SIZE);
  const poster = imgUrl(movie.poster_path);
 
  if (backdrop) DOM.detailHeroBg().style.backgroundImage = `url(${backdrop})`;
  DOM.detailPoster().src = poster || "";
  DOM.detailPoster().alt = movie.title;
  DOM.detailTitle().textContent = movie.title;
  DOM.detailTagline().textContent = movie.tagline ? `"${movie.tagline}"` : "";
  DOM.detailOverview().textContent = movie.overview || "No overview available.";
 
  // Badges
  const genres = (movie.genres || []).map(g =>
    `<span class="badge badge-genre">${g.name}</span>`).join("");
  const rating = `<span class="badge badge-rating">★ ${movie.vote_average?.toFixed(1)}</span>`;
  const status = movie.status
    ? `<span class="badge badge-status">${movie.status}</span>` : "";
  DOM.detailBadges().innerHTML = rating + genres + status;
 
  // Stats
  DOM.detailStats().innerHTML = `
    <div class="stat-item">
      <span class="stat-label">Release Date</span>
      <span class="stat-value">${movie.release_date || "—"}</span>
    </div>
    <div class="stat-item">
      <span class="stat-label">Runtime</span>
      <span class="stat-value">${formatRuntime(movie.runtime)}</span>
    </div>
    <div class="stat-item">
      <span class="stat-label">Budget</span>
      <span class="stat-value">${formatMoney(movie.budget)}</span>
    </div>
    <div class="stat-item">
      <span class="stat-label">Revenue</span>
      <span class="stat-value gold">${formatMoney(movie.revenue)}</span>
    </div>
    <div class="stat-item">
      <span class="stat-label">Votes</span>
      <span class="stat-value">${movie.vote_count?.toLocaleString()}</span>
    </div>
    <div class="stat-item">
      <span class="stat-label">Popularity</span>
      <span class="stat-value">${movie.popularity?.toFixed(0)}</span>
    </div>
  `;
 
  // Trailer button
  const trailers = (videosData.results || []).filter(v => v.type === "Trailer" && v.site === "YouTube");
  if (trailers.length) {
    DOM.detailTrailerBtn().style.display = "inline-flex";
    DOM.detailTrailerBtn().onclick = () => openModal(`https://www.youtube.com/embed/${trailers[0].key}?autoplay=1`);
  } else {
    DOM.detailTrailerBtn().style.display = "none";
  }
}
 
// ──────────────────────────────────────────────
// RENDER CAST
// ──────────────────────────────────────────────
function renderCast(cast) {
  const row = DOM.castRow();
  row.innerHTML = "";
  const visible = cast.slice(0, 20);
  if (!visible.length) {
    row.innerHTML = `<p style="color:var(--text-muted)">No cast info available.</p>`;
    return;
  }
  visible.forEach(person => {
    const photo = imgUrl(person.profile_path, CONFIG.PROFILE_SIZE);
    const card = document.createElement("div");
    card.className = "cast-card";
    card.innerHTML = `
      ${photo
        ? `<img class="cast-photo" src="${photo}" alt="${person.name}" loading="lazy" />`
        : `<div class="cast-photo-placeholder">👤</div>`}
      <p class="cast-name">${person.name}</p>
      <p class="cast-character">${person.character || "—"}</p>
    `;
    row.appendChild(card);
  });
}
 
// ──────────────────────────────────────────────
// RENDER MORE INFO
// ──────────────────────────────────────────────
function renderMoreInfo(movie) {
  const grid = DOM.infoGrid();
  const items = [
    { label: "Original Title", value: movie.original_title },
    { label: "Original Language", value: movie.original_language?.toUpperCase() },
    { label: "Production Countries", value: (movie.production_countries || []).map(c => c.name).join(", ") || "—" },
    { label: "Production Companies", value: (movie.production_companies || []).map(c => c.name).join(", ") || "—" },
    { label: "Spoken Languages", value: (movie.spoken_languages || []).map(l => l.english_name).join(", ") || "—" },
    { label: "Homepage", value: movie.homepage
      ? `<a href="${movie.homepage}" target="_blank" style="color:var(--accent)">Visit Site →</a>`
      : "—" },
  ];
  grid.innerHTML = items.map(i => `
    <div class="info-card">
      <p class="info-card-label">${i.label}</p>
      <p class="info-card-value">${i.value || "—"}</p>
    </div>
  `).join("");
}
 
// ──────────────────────────────────────────────
// RENDER SIMILAR MOVIES (small grid)
// ──────────────────────────────────────────────
function renderGrid_similar(movies) {
  const grid = DOM.similarGrid();
  grid.innerHTML = "";
  const slice = movies.slice(0, 10);
  if (!slice.length) {
    grid.innerHTML = `<p style="color:var(--text-muted); grid-column:1/-1">No similar movies found.</p>`;
    return;
  }
  slice.forEach(movie => {
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
      </div>
      <div class="card-body">
        <p class="card-title">${movie.title}</p>
        <div class="card-meta">
          <span>${movie.release_date?.slice(0,4) || "—"}</span>
        </div>
      </div>
    `;
    card.addEventListener("click", () => openDetail(movie.id));
    grid.appendChild(card);
  });
}
 
// ──────────────────────────────────────────────
// TRAILER
// ──────────────────────────────────────────────
async function fetchAndPlayTrailer(movieId) {
  try {
    const data = await apiFetch(`/movie/${movieId}/videos`);
    const trailer = (data.results || []).find(v => v.type === "Trailer" && v.site === "YouTube");
    if (trailer) {
      openModal(`https://www.youtube.com/embed/${trailer.key}?autoplay=1`);
    } else {
      showToast("No trailer available for this movie.");
    }
  } catch {
    showToast("Could not fetch trailer.");
  }
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
// LOADING / ERROR UI
// ──────────────────────────────────────────────
function showLoading(show) {
  DOM.spinner().style.display = show ? "flex" : "none";
  DOM.movieGrid().style.display = show ? "none" : "grid";
  DOM.errorState().style.display = "none";
}
 
function showError(msg) {
  DOM.spinner().style.display = "none";
  DOM.movieGrid().style.display = "none";
  DOM.errorState().style.display = "flex";
  DOM.errorMsg().textContent = msg;
}
 
function showToast(msg, duration = 3000) {
  const toast = DOM.toast();
  toast.textContent = msg;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), duration);
}
 
// ──────────────────────────────────────────────
// NAVIGATION
// ──────────────────────────────────────────────
function goHome() {
  DOM.detailView().style.display = "none";
  DOM.homeView().style.display = "block";
  window.scrollTo({ top: 0, behavior: "smooth" });
  // Resume slideshow if movies are loaded
  if (state.heroMovies.length) {
    animateProgressBar();
    startHeroTimer();
  }
}
 
function setActiveNav(filter) {
  DOM.navBtns().forEach(btn => {
    btn.classList.toggle("active", btn.dataset.filter === filter);
  });
}
 
// ──────────────────────────────────────────────
// EVENT LISTENERS
// ──────────────────────────────────────────────
function initEvents() {
  // Hero arrows
  DOM.heroPrev().addEventListener("click", () => {
    goToSlide(state.heroIndex - 1);
    resetHeroTimer();
  });
  DOM.heroNext().addEventListener("click", () => {
    goToSlide(state.heroIndex + 1);
    resetHeroTimer();
  });
 
  // Pause slideshow on hover, resume on leave
  document.getElementById("hero-section").addEventListener("mouseenter", stopHeroTimer);
  document.getElementById("hero-section").addEventListener("mouseleave", () => {
    if (state.heroMovies.length) startHeroTimer();
  });
 
  // Nav filter buttons
  DOM.navBtns().forEach(btn => {
    btn.addEventListener("click", () => {
      state.currentFilter = btn.dataset.filter;
      state.currentPage = 1;
      state.searchQuery = "";
      DOM.searchInput().value = "";
      setActiveNav(state.currentFilter);
      goHome();
      fetchMovies(state.currentFilter, 1);
    });
  });
 
  // Brand → home
  DOM.navBrand().addEventListener("click", () => {
    state.currentFilter = "trending";
    state.currentPage = 1;
    state.searchQuery = "";
    DOM.searchInput().value = "";
    setActiveNav("trending");
    goHome();
    fetchMovies("trending", 1);
  });
 
  // Search
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
 
  // Pagination
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
 
  // Back button
  DOM.backBtn().addEventListener("click", goHome);
 
  // Modal close
  DOM.modalClose().addEventListener("click", closeModal);
  DOM.modalOverlay().addEventListener("click", e => {
    if (e.target === DOM.modalOverlay()) closeModal();
  });
 
  // Retry button
  document.getElementById("retry-btn")?.addEventListener("click", () => {
    fetchMovies(state.currentFilter, state.currentPage, state.searchQuery);
  });
 
  // ESC closes modal
  document.addEventListener("keydown", e => {
    if (e.key === "Escape") closeModal();
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
 






