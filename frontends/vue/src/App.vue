<script setup>
import { computed, onMounted, ref } from "vue";

const products = ref([]);
const loading = ref(true);
const error = ref("");
const selectedCategory = ref("all");
const searchQuery = ref("");
const sortBy = ref("featured");

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

const promoMessages = [
  "fresh looks for every aisle stroll",
  "small-batch style, everyday essentials",
  "designed for giftable moments and daily rituals",
  "free-flowing storefront energy, now in Vue",
];

const categoryMeta = {
  accessories: "easy finishing pieces",
  bags: "grab-and-go staples",
  beauty: "daily self-care favorites",
  clothing: "soft wardrobe basics",
  decor: "warm, lived-in accents",
  footwear: "ready-for-anywhere pairs",
  hair: "good-hair-day helpers",
  home: "comfort-first living",
  kitchen: "countertop essentials",
  outerwear: "light layers",
  skincare: "simple hydration",
  tops: "foundation pieces",
};

async function fetchProducts() {
  loading.value = true;
  error.value = "";

  try {
    const response = await fetch("/api/products");

    if (!response.ok) {
      throw new Error(`Request failed with ${response.status}`);
    }

    const data = await response.json();
    products.value = data.map((product, index) => ({
      ...product,
      price: Number(product.price),
      accentLabel: buildAccentLabel(product, index),
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

function buildAccentLabel(product, index) {
  if (product.quantity <= 5) {
    return "Limited stock";
  }

  if (product.categories.includes("home") || product.categories.includes("decor")) {
    return "Best for nesting";
  }

  if (product.categories.includes("beauty") || product.categories.includes("hair")) {
    return "Self-care pick";
  }

  if (product.categories.length > 1) {
    return "Multi-category favorite";
  }

  return index % 2 === 0 ? "Editor pick" : "New arrival";
}

const categories = computed(() => {
  const uniqueCategories = new Set(
    products.value.flatMap((product) => product.categories),
  );

  return [
    {
      value: "all",
      label: "Shop all",
      description: "every curated product",
    },
    ...Array.from(uniqueCategories)
      .sort()
      .map((category) => ({
        value: category,
        label: category.replace("-", " "),
        description: categoryMeta[category] ?? "curated essentials",
      })),
  ];
});

const featuredProducts = computed(() =>
  [...products.value]
    .sort((first, second) => second.quantity - first.quantity)
    .slice(0, 3),
);

const filteredProducts = computed(() => {
  const normalizedQuery = searchQuery.value.trim().toLowerCase();

  let nextProducts = products.value.filter((product) => {
    const matchesCategory =
      selectedCategory.value === "all" ||
      product.categories.includes(selectedCategory.value);
    const matchesSearch =
      normalizedQuery.length === 0 ||
      product.name.toLowerCase().includes(normalizedQuery) ||
      product.description.toLowerCase().includes(normalizedQuery) ||
      product.categories.some((category) =>
        category.toLowerCase().includes(normalizedQuery),
      );

    return matchesCategory && matchesSearch;
  });

  if (sortBy.value === "price-low") {
    nextProducts = [...nextProducts].sort((a, b) => a.price - b.price);
  } else if (sortBy.value === "price-high") {
    nextProducts = [...nextProducts].sort((a, b) => b.price - a.price);
  } else if (sortBy.value === "name") {
    nextProducts = [...nextProducts].sort((a, b) => a.name.localeCompare(b.name));
  } else {
    nextProducts = [...nextProducts].sort((a, b) => {
      if (a.quantity !== b.quantity) {
        return b.quantity - a.quantity;
      }

      return a.name.localeCompare(b.name);
    });
  }

  return nextProducts;
});

const inventorySummary = computed(() => {
  const totalUnits = products.value.reduce(
    (sum, product) => sum + product.quantity,
    0,
  );

  return `${products.value.length} products, ${totalUnits} units ready to ship`;
});

onMounted(fetchProducts);
</script>

<template>
  <div class="page-shell">
    <div class="announcement-bar">
      <div class="announcement-track">
        <span v-for="message in promoMessages" :key="message">
          {{ message }}
        </span>
        <span v-for="message in promoMessages" :key="`${message}-clone`">
          {{ message }}
        </span>
      </div>
    </div>

    <header class="site-header">
      <div class="brand-lockup">
        <span class="eyebrow">Patchwork</span>
        <h1>Collection Studio</h1>
      </div>
      <nav class="top-nav" aria-label="Primary">
        <a href="#collection">shop all</a>
        <a href="#featured">featured</a>
        <a href="#about">about</a>
      </nav>
    </header>

    <main>
      <section class="hero">
        <div class="hero-copy">
          <p class="eyebrow">Vue storefront recreation</p>
          <h2>For people who care about the shelf, the story, and the scroll.</h2>
          <p class="hero-text">
            Inspired by the editorial rhythm of the Lil Luv collection page, this
            version keeps the airy product-first mood while pulling live inventory
            from your backend.
          </p>
          <div class="hero-actions">
            <a href="#collection" class="primary-link">Browse collection</a>
            <span class="inventory-pill">{{ inventorySummary }}</span>
          </div>
        </div>

        <div class="hero-panel">
          <div class="hero-panel-inner">
            <p class="panel-label">Current mood</p>
            <p class="panel-title">Soft neutrals, bold product photography, clean utility.</p>
            <ul class="hero-notes">
              <li>Live search across product names, descriptions, and categories</li>
              <li>Category filtering pulled from backend data</li>
              <li>Responsive product cards with stock-aware badges</li>
            </ul>
          </div>
        </div>
      </section>

      <section id="featured" class="featured-strip">
        <article
          v-for="product in featuredProducts"
          :key="product.id"
          class="feature-card"
        >
          <div class="feature-copy">
            <p class="eyebrow">{{ product.accentLabel }}</p>
            <h3>{{ product.name }}</h3>
            <p>{{ product.description }}</p>
          </div>
          <span class="feature-price">{{ currency.format(product.price) }}</span>
        </article>
      </section>

      <section id="collection" class="collection-shell">
        <div class="collection-header">
          <div>
            <p class="eyebrow">All products</p>
            <h2>Shop the full assortment</h2>
          </div>

          <div class="toolbar">
            <label class="search-field">
              <span class="sr-only">Search products</span>
              <input
                v-model="searchQuery"
                type="search"
                placeholder="Search products"
              />
            </label>

            <label class="sort-field">
              <span class="sr-only">Sort products</span>
              <select v-model="sortBy">
                <option value="featured">Featured</option>
                <option value="price-low">Price: low to high</option>
                <option value="price-high">Price: high to low</option>
                <option value="name">Name</option>
              </select>
            </label>
          </div>
        </div>

        <div class="category-row" aria-label="Category filters">
          <button
            v-for="category in categories"
            :key="category.value"
            :class="[
              'category-pill',
              { active: selectedCategory === category.value },
            ]"
            @click="selectedCategory = category.value"
          >
            <span>{{ category.label }}</span>
            <small>{{ category.description }}</small>
          </button>
        </div>

        <div v-if="loading" class="state-card">
          <p class="eyebrow">Loading</p>
          <p>Pulling products from the backend.</p>
        </div>

        <div v-else-if="error" class="state-card error">
          <p class="eyebrow">Something went wrong</p>
          <p>{{ error }}</p>
        </div>

        <div v-else-if="filteredProducts.length === 0" class="state-card">
          <p class="eyebrow">No matches</p>
          <p>Try another category or widen your search.</p>
        </div>

        <div v-else class="product-grid">
          <article
            v-for="product in filteredProducts"
            :key="product.id"
            class="product-card"
          >
            <div class="media-shell">
              <img :src="product.picture" :alt="product.name" />
              <span class="product-badge">{{ product.accentLabel }}</span>
            </div>

            <div class="product-body">
              <div class="product-heading">
                <h3>{{ product.name }}</h3>
                <span class="product-price">
                  {{ currency.format(product.price) }}
                </span>
              </div>

              <p class="product-description">{{ product.description }}</p>

              <div class="product-meta">
                <div class="category-tags">
                  <span
                    v-for="category in product.categories"
                    :key="`${product.id}-${category}`"
                  >
                    {{ category }}
                  </span>
                </div>
                <span
                  :class="[
                    'stock-chip',
                    { soldout: product.quantity === 0 },
                  ]"
                >
                  {{ product.quantity === 0 ? "Out of stock" : `${product.quantity} in stock` }}
                </span>
              </div>
            </div>
          </article>
        </div>
      </section>

      <section id="about" class="about-panel">
        <p class="eyebrow">Why this structure works</p>
        <h2>
          It captures the same browseable, editorial storefront energy while staying
          grounded in your own product data model.
        </h2>
      </section>
    </main>
  </div>
</template>
