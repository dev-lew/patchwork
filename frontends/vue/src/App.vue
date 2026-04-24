<script setup>
import { onMounted, ref, computed, nextTick } from "vue";

const products = ref([]);
const collectionHero = ref(null);
const heroVideoEl = ref(null);
const videoIsPlaying = ref(true);

function toggleVideo() {
  const video = heroVideoEl.value;
  if (!video) return;
  if (video.paused) {
    video.play();
    videoIsPlaying.value = true;
  } else {
    video.pause();
    videoIsPlaying.value = false;
  }
}
const loading = ref(true);
const error = ref("");
const announcementMessage = "pre-order the first EWG verified pet wipes";
const fallbackHero = {
  title: "Clean Beauty for Dogs",
  subtitle: "For people who care about their dog's beauty routine as much as their own",
  video: "/static/videos/lilluv-collection-hero.mp4",
  poster: "/static/videos/lilluv-collection-hero-poster.jpg",
};

const FREE_SHIPPING_THRESHOLD = 75;

// ── Search ──────────────────────────────────────────────
const searchOpen = ref(false);
const searchQuery = ref("");
const searchInputEl = ref(null);

const POPULAR_SEARCHES = [
  "dry shampoo",
  "oat",
  "cactus flower",
  "the bandana",
  "discovery pack",
  "wipes",
];

const searchResults = computed(() => {
  const q = searchQuery.value.trim().toLowerCase();
  if (!q) return [];
  return products.value.filter(
    (p) =>
      p.name.toLowerCase().includes(q) ||
      (p.variant_label && p.variant_label.toLowerCase().includes(q)) ||
      (p.badge_text && p.badge_text.toLowerCase().includes(q))
  );
});

function openSearch() {
  searchOpen.value = true;
  nextTick(() => searchInputEl.value?.focus());
}

function closeSearch() {
  searchOpen.value = false;
  searchQuery.value = "";
}

function applyPopular(term) {
  searchQuery.value = term;
  nextTick(() => searchInputEl.value?.focus());
}

function handleSearchKey(e) {
  if (e.key === "Escape") closeSearch();
}

// ── Cart ─────────────────────────────────────────────────
const cartOpen = ref(false);
const cartItems = ref([]);
const addingProductId = ref(null);

const showLogin = ref(false);
const loggedIn = ref(false);
const loginUsername = ref("");
const loginPassword = ref("");
const loginError = ref("");
const loginLoading = ref(false);

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

const cartTotal = computed(() =>
  cartItems.value.reduce((sum, item) => sum + item.price * item.quantity, 0)
);

const cartCount = computed(() =>
  cartItems.value.reduce((sum, item) => sum + item.quantity, 0)
);

const shippingRemaining = computed(() =>
  Math.max(0, FREE_SHIPPING_THRESHOLD - cartTotal.value)
);

const shippingProgress = computed(() =>
  Math.min(100, (cartTotal.value / FREE_SHIPPING_THRESHOLD) * 100)
);

const upsellProducts = computed(() => {
  const inCartIds = new Set(cartItems.value.map((i) => i.id));
  return products.value.filter((p) => !inCartIds.has(p.id)).slice(0, 6);
});

// ── Data ─────────────────────────────────────────────────
async function fetchProducts() {
  loading.value = true;
  error.value = "";
  try {
    const response = await fetch("/api/storefront");
    if (!response.ok) throw new Error(`Request failed with ${response.status}`);
    const data = await response.json();
    collectionHero.value = data.collection_hero;
    products.value = data.products.map((product) => ({
      ...product,
      price: Number(product.price),
      compare_at_price:
        product.compare_at_price === null ? null : Number(product.compare_at_price),
      rating: Number(product.rating ?? 0),
    }));
  } catch (err) {
    error.value =
      err instanceof Error ? err.message : "Unable to load products right now.";
  } finally {
    loading.value = false;
  }
}

function formatPrice(value) {
  return currency.format(value);
}

function buildPriceLine(product) {
  if (product.compare_at_price && product.compare_at_price > product.price) {
    return `${formatPrice(product.price)} sale`;
  }
  return formatPrice(product.price);
}

function displayTitle(product) {
  if (!product.variant_label) return product.name;
  return product.name.replace(` - ${product.variant_label}`, "");
}

function starWidth(product) {
  return `${Math.max(0, Math.min(100, (product.rating / 5) * 100))}%`;
}

// ── Cart actions ──────────────────────────────────────────
function addToCart(product) {
  addingProductId.value = product.id;
  const existing = cartItems.value.find((i) => i.id === product.id);
  if (existing) {
    existing.quantity += 1;
  } else {
    cartItems.value.push({
      id: product.id,
      name: product.name,
      variant_label: product.variant_label,
      price: product.price,
      picture: product.picture,
      quantity: 1,
    });
  }
  cartOpen.value = true;
  closeSearch();
  setTimeout(() => { addingProductId.value = null; }, 600);
}

function removeFromCart(id) {
  const idx = cartItems.value.findIndex((i) => i.id === id);
  if (idx !== -1) cartItems.value.splice(idx, 1);
}

function updateQuantity(id, delta) {
  const item = cartItems.value.find((i) => i.id === id);
  if (!item) return;
  item.quantity = Math.max(0, item.quantity + delta);
  if (item.quantity === 0) removeFromCart(id);
}

function setQuantity(id, val) {
  const item = cartItems.value.find((i) => i.id === id);
  if (!item) return;
  const n = parseInt(val, 10);
  if (isNaN(n) || n <= 0) removeFromCart(id);
  else item.quantity = n;
}

function openCart() { cartOpen.value = true; }
function closeCart() { cartOpen.value = false; }

function openLogin() {
  loginError.value = "";
  loginPassword.value = "";
  showLogin.value = true;
}

function closeLogin() {
  showLogin.value = false;
}

async function loginUser() {
  loginError.value = "";
  loginLoading.value = true;

  try {
    const params = new URLSearchParams({
      username: loginUsername.value,
      password: loginPassword.value,
    });

    const response = await fetch(`/api/login?${params.toString()}`, {
      method: "POST",
      credentials: "include",
    });

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      const message = body?.detail || "Invalid username or password.";
      throw new Error(message);
    }

    loggedIn.value = true;
    showLogin.value = false;
  } catch (error) {
    loginError.value = error instanceof Error ? error.message : "Login failed.";
  } finally {
    loginLoading.value = false;
  }
}

async function logoutUser() {
  await fetch("/api/logout", {
    method: "POST",
    credentials: "include",
  });
  loggedIn.value = false;
}

onMounted(fetchProducts);
</script>

<template>
  <div v-if="showLogin" class="login-shell">
    <div class="login-panel">
      <h1>Sign in</h1>

      <form @submit.prevent="loginUser" class="login-form">
        <div class="field-row">
          <label for="username">Username</label>
          <input
            id="username"
            type="text"
            v-model="loginUsername"
            required
            autocomplete="username"
          />
        </div>

        <div class="field-row">
          <label for="password">Password</label>
          <input
            id="password"
            type="password"
            v-model="loginPassword"
            required
            autocomplete="current-password"
          />
        </div>

        <p v-if="loginError" class="login-error">{{ loginError }}</p>

        <div class="login-actions">
          <button type="button" class="secondary-button" @click="closeLogin">
            Cancel
          </button>
          <button type="submit" class="primary-button" :disabled="loginLoading">
            {{ loginLoading ? 'Signing in…' : 'Sign in' }}
          </button>
        </div>
      </form>
    </div>
  </div>

  <div v-else class="storefront-shell">
    <a href="/products/the-daily-wipe" class="announcement-bar" aria-label="Announcement">
      <span class="announcement-message">{{ announcementMessage }}</span>
    </a>

    <header class="site-header">
      <div class="site-header-inner">
        <nav class="header-nav header-nav-left" aria-label="Primary">
          <a href="/">shop</a>
          <a href="/">pawprint</a>
          <a href="/">about</a>
        </nav>

        <a href="/" class="brand-mark" aria-label="Lil Luv Dog">LIL LUV DOG</a>

        <div class="header-actions" aria-label="Store actions">
          <button
            type="button"
            class="icon-button"
            :aria-label="searchOpen ? 'Close search' : 'Open search'"
            @click="searchOpen ? closeSearch() : openSearch()"
          >
            <svg v-if="!searchOpen" width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <circle cx="7.5" cy="7.5" r="5.75" stroke="#3f443f" stroke-width="1.4"/>
              <line x1="11.8" y1="11.8" x2="16.2" y2="16.2" stroke="#3f443f" stroke-width="1.4" stroke-linecap="round"/>
            </svg>
            <svg v-else width="16" height="16" viewBox="0 0 18 17" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path fill="#3f443f" d="M.865 15.978a.5.5 0 0 0 .707.707l7.433-7.431 7.579 7.282a.501.501 0 0 0 .846-.37.5.5 0 0 0-.153-.351L9.712 8.546l7.417-7.416a.5.5 0 1 0-.707-.708L8.991 7.853 1.413.573a.5.5 0 1 0-.693.72l7.563 7.268z"/>
            </svg>
          </button>
          <button
            type="button"
            class="icon-button"
            :aria-label="loggedIn ? 'Logout' : 'Sign in'"
            @click="loggedIn ? logoutUser() : openLogin()"
          >
            <span class="header-icon header-icon-account" aria-hidden="true"></span>
          </button>
          <button type="button" class="icon-button cart-button" aria-label="Cart" @click="openCart">
            <span class="header-icon header-icon-cart" aria-hidden="true"></span>
            <span class="cart-count">{{ cartCount }}</span>
          </button>
        </div>
      </div>

      <!-- Search panel drops down from the header -->
      <Transition name="search-panel">
        <div v-if="searchOpen" class="search-panel" role="search">
          <div class="search-panel-inner">

            <!-- Input row -->
            <div class="search-input-row">
              <svg class="search-input-icon" width="16" height="16" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <circle cx="7.5" cy="7.5" r="5.75" stroke="currentColor" stroke-width="1.4"/>
                <line x1="11.8" y1="11.8" x2="16.2" y2="16.2" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
              </svg>
              <input
                ref="searchInputEl"
                v-model="searchQuery"
                class="search-input"
                type="search"
                placeholder="search"
                autocomplete="off"
                autocorrect="off"
                spellcheck="false"
                @keydown="handleSearchKey"
                aria-label="Search products"
              />
              <button
                v-if="searchQuery"
                type="button"
                class="search-clear"
                aria-label="Clear search"
                @click="searchQuery = ''"
              >
                <svg width="11" height="11" viewBox="0 0 18 17" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path fill="currentColor" d="M.865 15.978a.5.5 0 0 0 .707.707l7.433-7.431 7.579 7.282a.501.501 0 0 0 .846-.37.5.5 0 0 0-.153-.351L9.712 8.546l7.417-7.416a.5.5 0 1 0-.707-.708L8.991 7.853 1.413.573a.5.5 0 1 0-.693.72l7.563 7.268z"/>
                </svg>
              </button>
            </div>

            <!-- Empty state: popular searches -->
            <div v-if="!searchQuery.trim()" class="search-suggestions">
              <p class="search-label">popular searches</p>
              <div class="search-pills">
                <button
                  v-for="term in POPULAR_SEARCHES"
                  :key="term"
                  type="button"
                  class="search-pill"
                  @click="applyPopular(term)"
                >{{ term }}</button>
              </div>
            </div>

            <!-- Results -->
            <template v-else-if="searchResults.length > 0">
              <p class="search-label">{{ searchResults.length }} result{{ searchResults.length !== 1 ? 's' : '' }}</p>
              <ul class="search-results-list" role="listbox">
                <li
                  v-for="product in searchResults"
                  :key="product.id"
                  class="search-result-item"
                  role="option"
                >
                  <div class="search-result-link">
                    <div class="search-result-image">
                      <img :src="product.picture" :alt="product.name" />
                    </div>
                    <div class="search-result-copy">
                      <span class="search-result-name">{{ displayTitle(product) }}</span>
                      <span v-if="product.variant_label" class="search-result-variant">{{ product.variant_label }}</span>
                      <span class="search-result-price">{{ formatPrice(product.price) }}</span>
                    </div>
                    <button
                      type="button"
                      class="search-result-add"
                      @click="addToCart(product)"
                      :disabled="product.quantity === 0"
                      :aria-label="`Add ${product.name} to cart`"
                    >{{ product.quantity === 0 ? 'sold out' : 'add' }}</button>
                  </div>
                </li>
              </ul>
            </template>

            <!-- No results -->
            <div v-else class="search-no-results">
              <p>no results for "<strong>{{ searchQuery }}</strong>"</p>
              <p class="search-no-results-sub">try a different search term or browse all products.</p>
            </div>

          </div>
        </div>
      </Transition>
    </header>

    <!-- Backdrop closes search on outside click -->
    <Transition name="fade">
      <div v-if="searchOpen" class="search-backdrop" @click="closeSearch" aria-hidden="true"></div>
    </Transition>

    <main class="catalog-page">
      <section class="hero-video-shell">
        <div class="hero-video-frame" v-if="(collectionHero ?? fallbackHero).video">
          <video
            ref="heroVideoEl"
            :key="(collectionHero ?? fallbackHero).video"
            class="hero-video"
            playsinline autoplay loop muted preload="auto"
            :poster="(collectionHero ?? fallbackHero).poster ?? undefined"
          >
            <source :src="(collectionHero ?? fallbackHero).video" type="video/mp4" />
          </video>
          <button
            type="button"
            class="video-control-btn"
            :aria-label="videoIsPlaying ? 'Pause video' : 'Play video'"
            @click="toggleVideo"
          >
            <svg v-if="!videoIsPlaying" width="14" height="14" viewBox="0 0 14 14">
              <polygon points="2,1 12,7 2,13" fill="#fff"/>
            </svg>
            <svg v-else width="14" height="14" viewBox="0 0 14 14">
              <line x1="3" y1="0" x2="3" y2="14" stroke="#fff" stroke-width="2.5" stroke-linecap="round"/>
              <line x1="9" y1="0" x2="9" y2="14" stroke="#fff" stroke-width="2.5" stroke-linecap="round"/>
            </svg>
          </button>
          <div class="hero-overlay">
            <h1 class="hero-title">Clean Beauty <i>for Dogs</i></h1>
            <p class="hero-subtitle">{{ (collectionHero ?? fallbackHero).subtitle }}</p>
          </div>
        </div>
      </section>

      <section class="catalog-grid-shell">
        <div v-if="loading" class="state-card">Loading products...</div>
        <div v-else-if="error" class="state-card state-card-error">{{ error }}</div>
        <div v-else class="product-grid">
          <article v-for="product in products" :key="product.id" class="product-card">
            <div class="product-image-shell">
              <img :src="product.picture" :alt="product.name" class="product-image" />
              <div v-if="product.badge_text" class="media-badge">{{ product.badge_text }}</div>
              <button
                type="button"
                class="add-button"
                :disabled="product.quantity === 0 || addingProductId === product.id"
                @click="addToCart(product)"
              >
                <span v-if="addingProductId === product.id">Adding…</span>
                <span v-else-if="product.quantity === 0">Out of stock</span>
                <span v-else>Add to cart</span>
              </button>
            </div>
            <div class="product-copy">
              <h3 class="product-name">
                {{ displayTitle(product) }}
                <span v-if="product.variant_label" class="variant-name">{{ product.variant_label }}</span>
              </h3>
              <div class="rating-row">
                <div class="star-rating" aria-hidden="true">
                  <span class="star-rating-base">★★★★★</span>
                  <span class="star-rating-fill" :style="{ width: starWidth(product) }">★★★★★</span>
                </div>
                <span>{{ product.rating.toFixed(1) }} / 5.0</span>
                <span>({{ product.review_count }})</span>
              </div>
              <div class="price-block">
                <div class="price-row">
                  <span
                    v-if="product.compare_at_price && product.compare_at_price > product.price"
                    class="compare-price"
                  >{{ formatPrice(product.compare_at_price) }}</span>
                  <span class="current-price">{{ formatPrice(product.price) }}</span>
                </div>
                <div class="unit-price">Unit price / per</div>
              </div>
              <div class="stock-row">
                {{ product.quantity === 0 ? "Out of stock" : buildPriceLine(product) }}
              </div>
            </div>
          </article>
        </div>
      </section>
    </main>

    <!-- Cart Drawer -->
    <Transition name="cart-drawer-transition">
      <div v-if="cartOpen" class="cart-drawer-shell" role="dialog" aria-modal="true" aria-label="Cart">
        <button class="cart-overlay" @click="closeCart" aria-label="Close cart"></button>
        <div class="cart-drawer">
          <div class="cart-drawer-header">
            <span class="cart-drawer-title">cart</span>
            <button type="button" class="cart-drawer-close" aria-label="Close" @click="closeCart">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" width="18" height="17" viewBox="0 0 18 17">
                <path fill="currentColor" d="M.865 15.978a.5.5 0 0 0 .707.707l7.433-7.431 7.579 7.282a.501.501 0 0 0 .846-.37.5.5 0 0 0-.153-.351L9.712 8.546l7.417-7.416a.5.5 0 1 0-.707-.708L8.991 7.853 1.413.573a.5.5 0 1 0-.693.72l7.563 7.268z"/>
              </svg>
            </button>
          </div>
          <div class="cart-shipping">
            <p class="cart-shipping-copy">
              <span v-if="shippingRemaining > 0">add {{ formatPrice(shippingRemaining) }} more for free shipping.</span>
              <span v-else>🎉 you've unlocked free shipping!</span>
            </p>
            <div class="cart-shipping-bar">
              <span class="cart-shipping-progress" :style="{ width: shippingProgress + '%' }"></span>
            </div>
          </div>
          <div class="cart-drawer-body">
            <div v-if="cartItems.length === 0" class="cart-empty">your cart is empty.</div>
            <div v-else class="cart-items">
              <div v-for="item in cartItems" :key="item.id" class="cart-item">
                <div class="cart-item-image">
                  <img :src="item.picture" :alt="item.name" />
                </div>
                <div class="cart-item-info">
                  <div class="cart-item-title">{{ item.name }}</div>
                  <div v-if="item.variant_label" class="cart-item-variant">{{ item.variant_label }}</div>
                  <div class="cart-item-price">{{ formatPrice(item.price) }}</div>
                  <div class="cart-item-controls">
                    <div class="quantity-control">
                      <button type="button" class="quantity-button" aria-label="Decrease" @click="updateQuantity(item.id, -1)">−</button>
                      <input class="quantity-input" type="number" :value="item.quantity" min="1" @change="setQuantity(item.id, $event.target.value)" />
                      <button type="button" class="quantity-button" aria-label="Increase" @click="updateQuantity(item.id, 1)">+</button>
                    </div>
                    <button type="button" class="cart-remove" @click="removeFromCart(item.id)">Remove</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div v-if="upsellProducts.length > 0" class="cart-upsell">
            <div class="cart-upsell-header">you'd also luv</div>
            <div class="cart-upsell-list">
              <div v-for="up in upsellProducts" :key="up.id" class="cart-upsell-item">
                <div class="cart-upsell-image"><img :src="up.picture" :alt="up.name" /></div>
                <div class="cart-upsell-content">
                  <div class="cart-upsell-name">{{ up.name }}</div>
                  <div class="cart-upsell-price">{{ formatPrice(up.price) }}</div>
                  <button type="button" class="cart-upsell-button" @click="addToCart(up)">Add</button>
                </div>
              </div>
            </div>
          </div>
          <div class="cart-drawer-footer">
            <a href="/checkout" class="checkout-button">check out — {{ formatPrice(cartTotal) }}</a>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
/* ── Header needs position:relative so the search panel anchors to it ── */
.site-header {
  position: relative;
  z-index: 50;
}

/* ── Search panel ─────────────────────────────────────── */
.search-panel {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: rgb(var(--color-background));
  border-bottom: 1px solid rgba(63, 68, 63, 0.14);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.07);
  overflow: hidden;
}

.search-panel-inner {
  width: min(1240px, calc(100% - 2rem));
  margin: 0 auto;
  padding: 1rem 0 1.4rem;
}

/* Input row */
.search-input-row {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  border-bottom: 1px solid rgba(63, 68, 63, 0.2);
  padding-bottom: 0.65rem;
}

.search-input-icon {
  flex-shrink: 0;
  color: rgba(63, 68, 63, 0.45);
}

.search-input {
  flex: 1;
  border: 0;
  background: transparent;
  font: inherit;
  font-size: 1rem;
  color: rgb(var(--color-foreground));
  outline: none;
  padding: 0;
  -webkit-appearance: none;
}

.search-input::-webkit-search-cancel-button {
  display: none;
}

.search-input::placeholder {
  color: rgba(63, 68, 63, 0.38);
  text-transform: lowercase;
}

.search-clear {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.3rem;
  border: 0;
  background: transparent;
  color: rgba(63, 68, 63, 0.45);
  cursor: pointer;
  border-radius: 50%;
  transition: color 120ms;
}

.search-clear:hover {
  color: rgb(var(--color-foreground));
}

/* Shared label style */
.search-label {
  margin: 0.9rem 0 0.6rem;
  font-size: 0.7rem;
  letter-spacing: 0.09em;
  text-transform: uppercase;
  color: rgba(63, 68, 63, 0.46);
}

/* Popular searches */
.search-suggestions { }

.search-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
}

.search-pill {
  padding: 0.32rem 0.82rem;
  border: 1px solid rgba(63, 68, 63, 0.18);
  border-radius: 999px;
  background: transparent;
  font: inherit;
  font-size: 0.82rem;
  color: rgb(var(--color-foreground));
  cursor: pointer;
  text-transform: lowercase;
  transition: background 130ms, border-color 130ms;
}

.search-pill:hover {
  background: rgba(63, 68, 63, 0.06);
  border-color: rgba(63, 68, 63, 0.38);
}

/* Results */
.search-results-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.search-result-item {
  border-bottom: 1px solid rgba(63, 68, 63, 0.07);
}

.search-result-item:last-child {
  border-bottom: 0;
}

.search-result-link {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.7rem 0;
}

.search-result-image {
  flex-shrink: 0;
  width: 3.5rem;
  height: 3.5rem;
  background: var(--surface);
  overflow: hidden;
}

.search-result-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.search-result-copy {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.12rem;
  min-width: 0;
}

.search-result-name {
  font-size: 0.9rem;
  text-transform: lowercase;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.search-result-variant {
  font-size: 0.76rem;
  color: var(--muted);
  text-transform: lowercase;
}

.search-result-price {
  font-size: 0.8rem;
  color: var(--muted);
}

.search-result-add {
  flex-shrink: 0;
  padding: 0.38rem 0.95rem;
  border: 1px solid rgba(63, 68, 63, 0.28);
  background: transparent;
  font: inherit;
  font-size: 0.8rem;
  color: rgb(var(--color-foreground));
  text-transform: lowercase;
  cursor: pointer;
  transition: background 130ms, border-color 130ms, color 130ms;
}

.search-result-add:hover:not(:disabled) {
  background: rgb(var(--color-foreground));
  color: rgb(var(--color-background));
  border-color: rgb(var(--color-foreground));
}

.search-result-add:disabled {
  opacity: 0.38;
  cursor: default;
}

/* No results */
.search-no-results {
  padding: 1.1rem 0 0.2rem;
  font-size: 0.9rem;
}

.search-no-results p {
  margin: 0 0 0.28rem;
}

.search-no-results-sub {
  color: var(--muted);
  font-size: 0.8rem;
}

/* Dimmed backdrop */
.search-backdrop {
  position: fixed;
  inset: 0;
  z-index: 40;
  background: rgba(15, 17, 15, 0.16);
}

/* ── Transitions ─────────────────────────────────────── */
.search-panel-enter-active,
.search-panel-leave-active {
  transition: opacity 170ms ease, transform 210ms cubic-bezier(0.4, 0, 0.2, 1);
}

.search-panel-enter-from,
.search-panel-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 190ms ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* ── Cart drawer ─────────────────────────────────────── */
.cart-drawer-transition-enter-active,
.cart-drawer-transition-leave-active {
  transition: opacity 220ms ease;
}

.cart-drawer-transition-enter-active .cart-drawer,
.cart-drawer-transition-leave-active .cart-drawer {
  transition: transform 280ms cubic-bezier(0.4, 0, 0.2, 1);
}

.cart-drawer-transition-enter-from,
.cart-drawer-transition-leave-to {
  opacity: 0;
}

.cart-drawer-transition-enter-from .cart-drawer,
.cart-drawer-transition-leave-to .cart-drawer {
  transform: translateX(100%);
}

.product-image-shell {
  position: relative;
  overflow: hidden;
}

.add-button {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  transform: translateY(100%);
  opacity: 0;
  transition: transform 220ms cubic-bezier(0.4, 0, 0.2, 1), opacity 180ms ease;
  pointer-events: none;
}

.product-image-shell:hover .add-button {
  transform: translateY(0);
  opacity: 1;
  pointer-events: auto;
}

/* ── Hero video play/pause button ────────────────────── */
.video-control-btn {
  position: absolute;
  bottom: 1.1rem;
  right: 1.1rem;
  z-index: 10;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.4rem;
  border: none;
  background: transparent;
  cursor: pointer;
  opacity: 0.8;
  transition: opacity 160ms ease;
}

.video-control-btn:hover {
  opacity: 1;
}

.video-control-btn svg {
  display: block;
}
</style>