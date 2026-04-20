<script setup>
import { onMounted, ref, computed } from "vue";

const products = ref([]);
const collectionHero = ref(null);
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

// Cart state
const cartOpen = ref(false);
const cartItems = ref([]);
const addingProductId = ref(null);

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

// Cart computed values
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

// Upsell products — products not already in cart
const upsellProducts = computed(() => {
  const inCartIds = new Set(cartItems.value.map((i) => i.id));
  return products.value.filter((p) => !inCartIds.has(p.id)).slice(0, 6);
});

async function fetchProducts() {
  loading.value = true;
  error.value = "";

  try {
    const response = await fetch("/api/storefront");

    if (!response.ok) {
      throw new Error(`Request failed with ${response.status}`);
    }

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

// Cart actions
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

  setTimeout(() => {
    addingProductId.value = null;
  }, 600);
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
  if (isNaN(n) || n <= 0) {
    removeFromCart(id);
  } else {
    item.quantity = n;
  }
}

function openCart() {
  cartOpen.value = true;
}

function closeCart() {
  cartOpen.value = false;
}

function handleOverlayClick() {
  closeCart();
}

onMounted(fetchProducts);
</script>

<template>
  <div class="storefront-shell">
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

        <a href="/" class="brand-mark" aria-label="Lil Luv Dog inspired storefront">
          LIL LUV DOG
        </a>

        <div class="header-actions" aria-label="Store actions">
          <button type="button" class="icon-button" aria-label="Search">
            <span class="header-icon header-icon-search" aria-hidden="true"></span>
          </button>
          <button type="button" class="icon-button" aria-label="Account">
            <span class="header-icon header-icon-account" aria-hidden="true"></span>
          </button>
          <button
            type="button"
            class="icon-button cart-button"
            aria-label="Cart"
            @click="openCart"
          >
            <span class="header-icon header-icon-cart" aria-hidden="true"></span>
            <span class="cart-count">{{ cartCount }}</span>
          </button>
        </div>
      </div>
    </header>

    <main class="catalog-page">
      <section class="hero-video-shell">
        <div class="hero-video-frame" v-if="(collectionHero ?? fallbackHero).video">
          <video
            :key="(collectionHero ?? fallbackHero).video"
            class="hero-video"
            playsinline
            autoplay
            loop
            muted
            preload="auto"
            :poster="(collectionHero ?? fallbackHero).poster ?? undefined"
          >
            <source :src="(collectionHero ?? fallbackHero).video" type="video/mp4" />
          </video>

          <div class="hero-overlay">
            <h1 class="hero-title">
              Clean Beauty <i>for Dogs</i>
            </h1>
            <p class="hero-subtitle">
              {{ (collectionHero ?? fallbackHero).subtitle }}
            </p>
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
              <div v-if="product.badge_text" class="media-badge">
                {{ product.badge_text }}
              </div>
            </div>

            <div class="product-copy">
              <h3 class="product-name">
                {{ displayTitle(product) }}
                <span v-if="product.variant_label" class="variant-name">
                  {{ product.variant_label }}
                </span>
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
                  >
                    {{ formatPrice(product.compare_at_price) }}
                  </span>
                  <span class="current-price">{{ formatPrice(product.price) }}</span>
                </div>
                <div class="unit-price">Unit price / per</div>
              </div>

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
        <button
          class="cart-overlay"
          @click="handleOverlayClick"
          aria-label="Close cart"
        ></button>

        <div class="cart-drawer">
          <!-- Header -->
          <div class="cart-drawer-header">
            <span class="cart-drawer-title">cart</span>
            <button
              type="button"
              class="cart-drawer-close"
              aria-label="Close"
              @click="closeCart"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" width="18" height="17" viewBox="0 0 18 17">
                <path fill="currentColor" d="M.865 15.978a.5.5 0 0 0 .707.707l7.433-7.431 7.579 7.282a.501.501 0 0 0 .846-.37.5.5 0 0 0-.153-.351L9.712 8.546l7.417-7.416a.5.5 0 1 0-.707-.708L8.991 7.853 1.413.573a.5.5 0 1 0-.693.72l7.563 7.268z"/>
              </svg>
            </button>
          </div>

          <!-- Shipping progress -->
          <div class="cart-shipping">
            <p class="cart-shipping-copy">
              <span v-if="shippingRemaining > 0">
                add {{ formatPrice(shippingRemaining) }} more for free shipping.
              </span>
              <span v-else>🎉 you've unlocked free shipping!</span>
            </p>
            <div class="cart-shipping-bar">
              <span
                class="cart-shipping-progress"
                :style="{ width: shippingProgress + '%' }"
              ></span>
            </div>
          </div>

          <!-- Body -->
          <div class="cart-drawer-body">
            <div v-if="cartItems.length === 0" class="cart-empty">
              your cart is empty.
            </div>

            <div v-else class="cart-items">
              <div
                v-for="item in cartItems"
                :key="item.id"
                class="cart-item"
              >
                <div class="cart-item-image">
                  <img :src="item.picture" :alt="item.name" />
                </div>
                <div class="cart-item-info">
                  <div class="cart-item-title">{{ item.name }}</div>
                  <div v-if="item.variant_label" class="cart-item-variant">
                    {{ item.variant_label }}
                  </div>
                  <div class="cart-item-price">{{ formatPrice(item.price) }}</div>
                  <div class="cart-item-controls">
                    <div class="quantity-control">
                      <button
                        type="button"
                        class="quantity-button"
                        aria-label="Decrease quantity"
                        @click="updateQuantity(item.id, -1)"
                      >−</button>
                      <input
                        class="quantity-input"
                        type="number"
                        :value="item.quantity"
                        min="1"
                        @change="setQuantity(item.id, $event.target.value)"
                      />
                      <button
                        type="button"
                        class="quantity-button"
                        aria-label="Increase quantity"
                        @click="updateQuantity(item.id, 1)"
                      >+</button>
                    </div>
                    <button
                      type="button"
                      class="cart-remove"
                      @click="removeFromCart(item.id)"
                    >Remove</button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Upsells -->
          <div v-if="upsellProducts.length > 0" class="cart-upsell">
            <div class="cart-upsell-header">you'd also luv</div>
            <div class="cart-upsell-list">
              <div
                v-for="up in upsellProducts"
                :key="up.id"
                class="cart-upsell-item"
              >
                <div class="cart-upsell-image">
                  <img :src="up.picture" :alt="up.name" />
                </div>
                <div class="cart-upsell-content">
                  <div class="cart-upsell-name">{{ up.name }}</div>
                  <div class="cart-upsell-price">{{ formatPrice(up.price) }}</div>
                  <button
                    type="button"
                    class="cart-upsell-button"
                    @click="addToCart(up)"
                  >Add</button>
                </div>
              </div>
            </div>
          </div>

          <!-- Footer -->
          <div class="cart-drawer-footer">
            <a href="/checkout" class="checkout-button">
              check out — {{ formatPrice(cartTotal) }}
            </a>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
/* Cart drawer slide-in transition */
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

/* Add button feedback */
.add-button {
  transition: background 160ms ease, color 160ms ease, opacity 160ms ease;
}
</style>