<script setup>
import { onMounted, ref } from "vue";

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

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
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
      err instanceof Error
        ? err.message
        : "Unable to load products right now.";
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
  if (!product.variant_label) {
    return product.name;
  }

  return product.name.replace(` - ${product.variant_label}`, "");
}

function starWidth(product) {
  return `${Math.max(0, Math.min(100, (product.rating / 5) * 100))}%`;
}

onMounted(fetchProducts);
</script>

<template>
  <div class="storefront-shell">
    <a
      href="/products/the-daily-wipe"
      class="announcement-bar"
      aria-label="Announcement"
    >
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
          <button type="button" class="icon-button cart-button" aria-label="Cart">
            <span class="header-icon header-icon-cart" aria-hidden="true"></span>
            <span class="cart-count">0</span>
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
        <div v-if="loading" class="state-card">
          Loading products...
        </div>

        <div v-else-if="error" class="state-card state-card-error">
          {{ error }}
        </div>

        <div v-else class="product-grid">
          <article
            v-for="product in products"
            :key="product.id"
            class="product-card"
          >
            <div class="product-image-shell">
              <img
                :src="product.picture"
                :alt="product.name"
                class="product-image"
              />
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
                  <span class="star-rating-fill" :style="{ width: starWidth(product) }">
                    ★★★★★
                  </span>
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
                :disabled="product.quantity === 0"
              >
                {{ product.quantity === 0 ? "Out of stock" : "Add to cart" }}
              </button>

              <div class="stock-row">
                {{ product.quantity === 0 ? "Out of stock" : buildPriceLine(product) }}
              </div>
            </div>
          </article>
        </div>
      </section>
    </main>
  </div>
</template>
