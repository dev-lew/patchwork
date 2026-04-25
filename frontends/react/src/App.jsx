import React, { useEffect, useState, useMemo, useRef } from "react";
import Header from "./Header";
import CollectionHero from "./CollectionHero";
import HoverVideoController from "./HoverVideoController";
import "./App.css";

export default function App() {
  const [products, setProducts] = useState([]);
  const [cartItems, setCartItems] = useState([]);
  const [addingProductId, setAddingProductId] = useState(null);

  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [cartOpen, setCartOpen] = useState(false);

  const [activeVideoSocket, setActiveVideoSocket] = useState(null);

  const searchInputRef = useRef(null);

  const FREE_SHIPPING_THRESHOLD = 75;
  const POPULAR_SEARCHES = [
    "dry shampoo",
    "bandana",
    "discovery pack"
  ];

  useEffect(() => {
    fetch("http://localhost:8000/api/products")
      .then((res) => res.json())
      .then((data) => setProducts(data.map(product => ({
        ...product,
        price: Number(product.price)
      }))))
      .catch((err) => console.error(err));
  }, []);

  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return products.filter((p) =>
      p.name.toLowerCase().includes(q)
    );
  }, [searchQuery, products]);

  const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
  const formatPrice = (value) => currency.format(value);

  const cartTotal = useMemo(() => cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0), [cartItems]);
  const cartCount = useMemo(() => cartItems.reduce((sum, item) => sum + item.quantity, 0), [cartItems]);
  const shippingRemaining = Math.max(0, FREE_SHIPPING_THRESHOLD - cartTotal);
  const shippingProgress = Math.min(100, (cartTotal / FREE_SHIPPING_THRESHOLD) * 100);

  const upsellProducts = useMemo(() => {
    const inCartIds = new Set(cartItems.map((i) => i.id));
    return products.filter((p) => !inCartIds.has(p.id)).slice(0, 6);
  }, [products, cartItems]);

  const getImageUrl = (url) => url.startsWith("/") ? `http://localhost:8000${url}` : url;

  function addToCart(product) {
    setAddingProductId(product.id);
    const existing = cartItems.find((i) => i.id === product.id);
    if (existing) {
      setCartItems(cartItems.map(i => i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i));
    } else {
      setCartItems([...cartItems, {
        id: product.id,
        name: product.name,
        price: product.price,
        picture: getImageUrl(product.picture),
        quantity: 1
      }]);
    }
    setCartOpen(true);
    setSearchOpen(false);
    setTimeout(() => { setAddingProductId(null); }, 600);
  }

  function removeFromCart(id) {
    setCartItems(cartItems.filter((i) => i.id !== id));
  }

  function updateQuantity(id, delta) {
    setCartItems(cartItems.map(item => {
      if (item.id === id) {
        const q = Math.max(0, item.quantity + delta);
        return { ...item, quantity: q };
      }
      return item;
    }).filter(i => i.quantity > 0));
  }

  function setQuantity(id, val) {
    const n = parseInt(val, 10);
    if (isNaN(n) || n <= 0) {
      removeFromCart(id);
    } else {
      setCartItems(cartItems.map(item => item.id === id ? { ...item, quantity: n } : item));
    }
  }

  function checkout() {
    setCartItems([]);
    setCartOpen(false);
  }

  return (
    <div className="w-full relative">
      <Header
        searchOpen={searchOpen}
        setSearchOpen={setSearchOpen}
        cartOpen={cartOpen}
        setCartOpen={setCartOpen}
        cartCount={cartCount}
      >
        {searchOpen && (
          <div className="search-panel">
            <div className="search-panel-inner">
              <div className="search-input-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                <button type="button" className="search__button field__button" aria-label="Search" style={{ background: 'transparent', border: 'none', display: 'flex', padding: 0 }} disabled>
                  <svg width="24" height="24" viewBox="0 0 16 17" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
                    <circle cx="7.5" cy="7.5" r="6.81818" stroke="#3F443F" strokeWidth="1.36364"></circle>
                    <path d="M11.7852 12.856L14.9994 16.0702" stroke="#3F443F" strokeWidth="1.36364"></path>
                  </svg>
                </button>
                <input
                  ref={searchInputRef}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="search-input"
                  type="search"
                  placeholder="search"
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck="false"
                  aria-label="Search products"
                />
                <button type="button" className="search-modal__close-button modal__close-button link link--text focus-inset" aria-label="Clear" onClick={() => setSearchQuery("")} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', background: 'transparent', cursor: 'pointer', padding: 0 }}>
                  <svg className="icon icon-close" aria-hidden="true" focusable="false" width="22" height="22" viewBox="0 0 18 18" fill="none">
                    <path d="M16.5 1.5L1.5 16.5M1.5 1.5L16.5 16.5" stroke="#3F443F" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>

              {!searchQuery.trim() ? (
                <div className="search-suggestions">
                  <p className="search-label">popular searches</p>
                  <div className="search-pills">
                    {POPULAR_SEARCHES.map((term) => (
                      <button key={term} type="button" className="search-pill" onClick={() => setSearchQuery(term)}>
                        {term}
                      </button>
                    ))}
                  </div>
                </div>
              ) : searchResults.length > 0 ? (
                <>
                  <p className="search-label">{searchResults.length} result{searchResults.length !== 1 ? 's' : ''}</p>
                  <ul className="search-results-list" role="listbox">
                    {searchResults.map((product) => (
                      <li key={product.id} className="search-result-item" role="option">
                        <div className="search-result-link" onClick={() => addToCart(product)} style={{ cursor: 'pointer' }}>
                          <div className="search-result-image">
                            <img src={getImageUrl(product.picture)} alt={product.name} />
                          </div>
                          <div className="search-result-copy">
                            <span className="search-result-name">{product.name}</span>
                            <span className="search-result-price">{formatPrice(product.price)}</span>
                          </div>
                          <button
                            type="button"
                            className="search-result-add"
                            onClick={(e) => { e.stopPropagation(); addToCart(product); }}
                            disabled={product.quantity === 0}
                          >
                            {product.quantity === 0 ? 'sold out' : 'add'}
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <div className="search-no-results">
                  <p>no results for "<strong>{searchQuery}</strong>"</p>
                  <p className="search-no-results-sub">try a different search term or browse all products.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </Header>
      {searchOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 40 }} onClick={() => setSearchOpen(false)}></div>
      )}

      <div className={`site-content ${searchOpen ? "content-blurred" : ""}`}>
        <main className="w-full pt-[60px]">
          <CollectionHero />
        </main>

        <div className="w-full clear-both"></div>

        <section className="products-section">
          <div className="products-shell">
            <div className="products-grid">
              {products.map((product) => {
                const imageUrl = getImageUrl(product.picture);

                return (
                  <article key={product.id} className="product-card">
                    <div 
                      className="product-card__media"
                      onMouseEnter={(e) => setActiveVideoSocket(e.currentTarget.querySelector('.video-socket'))}
                      onMouseLeave={() => setActiveVideoSocket(null)}
                    >
                      <div className="product-card__media-inner">
                        <img
                          src={imageUrl}
                          alt={product.name}
                          className="product-card__image"
                        />
                        <div className="video-socket"></div>
                        <button
                          className="product-card__add-banner"
                          style={{ zIndex: 2 }}
                          onClick={() => addToCart(product)}
                          disabled={product.quantity === 0 || addingProductId === product.id}
                        >
                          {addingProductId === product.id ? "Adding..." : (product.quantity === 0 ? "Out of stock" : "Add to cart")}
                        </button>
                      </div>
                    </div>
                    <div className="product-card__content">
                      <h3 className="product-card__title">{product.name}</h3>
                      <div className="product-card__meta">
                        <span className="product-card__stock">
                          {product.quantity > 0 ? "In stock" : "Out of stock"}
                        </span>
                        <span className="product-card__price">
                          {formatPrice(product.price)}
                        </span>
                      </div>
                      <div className="product-card__divider" />
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </section>
      </div>

      {cartOpen && (
        <div className="cart-drawer-shell" role="dialog" aria-modal="true" aria-label="Cart">
          <button className="cart-overlay" onClick={() => setCartOpen(false)} aria-label="Close cart"></button>
          <div className="cart-drawer">
            <div className="cart-drawer-header">
              <span className="cart-drawer-title">cart</span>
              <button type="button" className="cart-drawer-close search-modal__close-button modal__close-button link link--text focus-inset" aria-label="Close" onClick={() => setCartOpen(false)}>
                <svg className="icon icon-close" aria-hidden="true" focusable="false" width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path d="M16.5 1.5L1.5 16.5M1.5 1.5L16.5 16.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>

            <div className="cart-shipping">
              <p className="cart-shipping-copy">
                {shippingRemaining > 0 ? (
                  <span>add {formatPrice(shippingRemaining)} more for free shipping.</span>
                ) : (
                  <span>🎉 you've unlocked free shipping!</span>
                )}
              </p>
              <div className="cart-shipping-bar">
                <span className="cart-shipping-progress" style={{ width: shippingProgress + '%' }}></span>
              </div>
            </div>

            <div className="cart-drawer-body">
              {cartItems.length === 0 ? (
                <div className="cart-empty">your cart is empty.</div>
              ) : (
                <div className="cart-items">
                  {cartItems.map((item) => (
                    <div key={item.id} className="cart-item">
                      <div className="cart-item-image">
                        <img src={item.picture} alt={item.name} />
                      </div>
                      <div className="cart-item-info">
                        <div className="cart-item-title">{item.name}</div>
                        <div className="cart-item-price">{formatPrice(item.price)}</div>
                        <div className="cart-item-controls">
                          <div className="quantity-control">
                            <button type="button" className="quantity-button" aria-label="Decrease" onClick={() => updateQuantity(item.id, -1)}>−</button>
                            <input className="quantity-input" type="number" value={item.quantity} min="1" onChange={(e) => setQuantity(item.id, e.target.value)} />
                            <button type="button" className="quantity-button" aria-label="Increase" onClick={() => updateQuantity(item.id, 1)}>+</button>
                          </div>
                          <button type="button" className="cart-remove" onClick={() => removeFromCart(item.id)}>Remove</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {upsellProducts.length > 0 && (
              <div className="cart-upsell">
                <div className="cart-upsell-header">you'd also luv</div>
                <div className="cart-upsell-list">
                  {upsellProducts.map((up) => (
                    <div key={up.id} className="cart-upsell-item">
                      <div className="cart-upsell-image"><img src={getImageUrl(up.picture)} alt={up.name} /></div>
                      <div className="cart-upsell-content">
                        <div className="cart-upsell-name">{up.name}</div>
                        <div className="cart-upsell-price">{formatPrice(up.price)}</div>
                        <button type="button" className="cart-upsell-button" onClick={() => addToCart(up)}>Add</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="cart-drawer-footer">
              <button onClick={checkout} className="checkout-button">check out — {formatPrice(cartTotal)}</button>
            </div>
          </div>
        </div>
      )}

      <HoverVideoController activeSocket={activeVideoSocket} />
    </div>
  );
}
