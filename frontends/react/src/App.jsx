import React, { useEffect, useState, useMemo, useRef } from "react";
import Header from "./Header";
import CollectionHero from "./CollectionHero";
import HoverVideoController from "./HoverVideoController";
import "./App.css";

export default function App() {
  const [products, setProducts] = useState([]);
  const [cartItems, setCartItems] = useState(() => {
    const user = localStorage.getItem("loggedInUser") || null;
    let localKey = user ? `patchwork_cart_${user}` : 'patchwork_cart_guest';
    const saved = localStorage.getItem(localKey);
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { }
    }
    return [];
  });
  const [addingProductId, setAddingProductId] = useState(null);

  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [cartOpen, setCartOpen] = useState(false);

  const [accountOpen, setAccountOpen] = useState(false);
  const [loggedInUser, setLoggedInUser] = useState(() => localStorage.getItem("loggedInUser") || null);
  const [authMode, setAuthMode] = useState("login");
  const [authUsername, setAuthUsername] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authEmail, setAuthEmail] = useState("");
  const [authError, setAuthError] = useState("");

  const [cartId, setCartId] = useState(null);

  const [activeVideoSocket, setActiveVideoSocket] = useState(null);

  const searchInputRef = useRef(null);

  const FREE_SHIPPING_THRESHOLD = 75;
  const POPULAR_SEARCHES = [
    "dry shampoo",
    "bandana",
    "discovery pack"
  ];

  useEffect(() => {
    fetch("/api/products")
      .then((res) => res.json())
      .then((data) => setProducts(data.map(product => ({
        ...product,
        price: Number(product.price)
      }))))
      .catch((err) => console.error(err));
  }, []);

  useEffect(() => {
    if (loggedInUser) {
      localStorage.setItem("loggedInUser", loggedInUser);
    } else {
      localStorage.removeItem("loggedInUser");
    }
  }, [loggedInUser]);



  useEffect(() => {
    let localKey = loggedInUser ? `patchwork_cart_${loggedInUser}` : 'patchwork_cart_guest';
    localStorage.setItem(localKey, JSON.stringify(cartItems));
  }, [cartItems, loggedInUser]);

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

  async function getOrCreateCartId(fallbackProductId) {
    if (cartId) return cartId;
    const targetId = fallbackProductId || (products.length > 0 ? products[0].id : null);
    if (!targetId) return null;

    try {
      const res = await fetch(`/html/products/${targetId}`, { credentials: 'include' });
      const html = await res.text();
      const match = html.match(/\/html\/carts\/([\w-]+)\/items/);
      if (match) {
        setCartId(match[1]);
        return match[1];
      }
    } catch (e) { }
    return null;
  }

  async function addToCart(product) {
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

    const cid = await getOrCreateCartId(product.id);
    if (cid) {
      const formData = new URLSearchParams();
      formData.append("product_id", product.id);
      formData.append("quantity", "1");
      await fetch(`/html/carts/${cid}/items`, {
        method: "POST",
        body: formData,
        credentials: "include"
      }).catch(e => console.error("Add remote error", e));
    }

    setCartOpen(true);
    setSearchOpen(false);
    setAccountOpen(false);
    setTimeout(() => { setAddingProductId(null); }, 600);
  }

  async function removeFromCart(id) {
    setCartItems(cartItems.filter((i) => i.id !== id));

    const cid = await getOrCreateCartId(id);
    if (cid) {
      await fetch(`/html/carts/${cid}/items/${id}/delete`, {
        method: "POST",
        credentials: "include"
      }).catch(e => console.error("Delete remote error", e));
    }
  }

  async function updateQuantity(id, delta) {
    const item = cartItems.find(i => i.id === id);
    if (!item) return;
    const newQty = Math.max(0, item.quantity + delta);

    if (newQty === 0) {
      return removeFromCart(id);
    }

    setCartItems(cartItems.map(i => i.id === id ? { ...i, quantity: newQty } : i));

    const cid = await getOrCreateCartId(id);
    if (cid) {
      const formData = new URLSearchParams();
      formData.append("quantity", newQty.toString());
      await fetch(`/html/carts/${cid}/items/${id}`, {
        method: "POST",
        body: formData,
        credentials: "include"
      }).catch(e => console.error("Update remote error", e));
    }
  }

  async function setQuantity(id, val) {
    const n = parseInt(val, 10);
    if (isNaN(n) || n <= 0) {
      return removeFromCart(id);
    } else {
      setCartItems(cartItems.map(item => item.id === id ? { ...item, quantity: n } : item));

      const cid = await getOrCreateCartId(id);
      if (cid) {
        const formData = new URLSearchParams();
        formData.append("quantity", n.toString());
        await fetch(`/html/carts/${cid}/items/${id}`, {
          method: "POST",
          body: formData,
          credentials: "include"
        }).catch(e => console.error("Update remote error", e));
      }
    }
  }

  function checkout() {
    setCartItems([]);
    setCartOpen(false);
  }

  async function handleAuth(e) {
    e.preventDefault();
    setAuthError("");
    try {
      if (authMode === "register") {
        const formData = new URLSearchParams();
        formData.append("username", authUsername);
        formData.append("email", authEmail);
        formData.append("password", authPassword);
        formData.append("confirm_password", authPassword);

        const res = await fetch("/html/account/create", {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded"
          },
          body: formData,
          credentials: "include"
        });

        if (res.url.includes("/html/account/create")) {
          throw new Error("Registration failed. Verification error or username already taken.");
        }
      } else {
        const loginRes = await fetch(`/api/login?username=${encodeURIComponent(authUsername)}&password=${encodeURIComponent(authPassword)}`, {
          method: "POST",
          credentials: "include"
        });
        if (!loginRes.ok) {
          const err = await loginRes.json().catch(() => ({}));
          throw new Error(err.detail || "Login failed");
        }
      }

      setLoggedInUser(authUsername);

      const guestCartStr = localStorage.getItem('patchwork_cart_guest');
      const userCartStr = localStorage.getItem(`patchwork_cart_${authUsername}`);
      let userCart = [];
      if (userCartStr) {
        try { userCart = JSON.parse(userCartStr); } catch (e) { }
      }
      if (guestCartStr) {
        try {
          let guestCart = JSON.parse(guestCartStr);
          for (let item of guestCart) {
            const existing = userCart.find(i => i.id === item.id);
            if (existing) existing.quantity += item.quantity;
            else userCart.push(item);
          }
        } catch (e) { }
        localStorage.removeItem('patchwork_cart_guest');
      }
      setCartItems(userCart);

      setAuthUsername("");
      setAuthPassword("");
      setAuthEmail("");
      setAccountOpen(false);
    } catch (err) {
      setAuthError(err.message);
    }
  }

  async function handleLogout() {
    try {
      await fetch("/api/logout", {
        method: "POST",
        credentials: "include"
      });
    } catch (e) { }
    setLoggedInUser(null);
    setCartItems([]);
  }

  return (
    <div className="w-full relative">
      <Header
        searchOpen={searchOpen}
        setSearchOpen={setSearchOpen}
        cartOpen={cartOpen}
        setCartOpen={setCartOpen}
        accountOpen={accountOpen}
        setAccountOpen={setAccountOpen}
        loggedInUser={loggedInUser}
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

      {accountOpen && (
        <div className="cart-drawer-shell" role="dialog" aria-modal="true" aria-label="Account">
          <button className="cart-overlay" onClick={() => setAccountOpen(false)} aria-label="Close account"></button>
          <div className="cart-drawer">
            <div className="cart-drawer-header">
              <span className="cart-drawer-title">account</span>
              <button type="button" className="cart-drawer-close search-modal__close-button modal__close-button link link--text focus-inset" aria-label="Close" onClick={() => setAccountOpen(false)}>
                <svg className="icon icon-close" aria-hidden="true" focusable="false" width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path d="M16.5 1.5L1.5 16.5M1.5 1.5L16.5 16.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>

            <div className="cart-drawer-body">
              {loggedInUser ? (
                <div style={{ padding: '24px 0', display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  <div style={{ fontSize: '18px' }}>hello, <strong>{loggedInUser}</strong>!</div>
                  <button type="button" className="checkout-button" onClick={handleLogout} style={{ marginTop: 'auto' }}>log out</button>
                </div>
              ) : (
                <div style={{ padding: '24px 0', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ fontSize: '18px', marginBottom: '8px' }}>{authMode === 'login' ? 'log in' : 'create account'}</div>

                  {authError && <div style={{ color: '#d9534f', fontSize: '13px', border: '1px solid #d9534f', padding: '10px', borderRadius: '4px' }}>{authError}</div>}

                  <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {authMode === 'register' && (
                      <input
                        type="email"
                        placeholder="email"
                        required
                        value={authEmail}
                        onChange={e => setAuthEmail(e.target.value)}
                        style={{ padding: '12px', border: '1px solid #e0e0e0', borderRadius: '4px', fontSize: '15px' }}
                      />
                    )}
                    <input
                      type="text"
                      placeholder="username"
                      required
                      value={authUsername}
                      onChange={e => setAuthUsername(e.target.value)}
                      style={{ padding: '12px', border: '1px solid #e0e0e0', borderRadius: '4px', fontSize: '15px' }}
                    />
                    <input
                      type="password"
                      placeholder="password"
                      required
                      value={authPassword}
                      onChange={e => setAuthPassword(e.target.value)}
                      style={{ padding: '12px', border: '1px solid #e0e0e0', borderRadius: '4px', fontSize: '15px' }}
                    />
                    <button type="submit" className="checkout-button" style={{ marginTop: '12px' }}>
                      {authMode === 'login' ? 'sign in' : 'register'}
                    </button>
                  </form>

                  <button
                    type="button"
                    onClick={() => { setAuthMode(authMode === 'login' ? 'register' : 'login'); setAuthError(""); }}
                    style={{ background: 'none', border: 'none', textDecoration: 'underline', cursor: 'pointer', color: '#3f443f', marginTop: '16px', fontSize: '14px' }}
                  >
                    {authMode === 'login' ? 'need an account? register' : 'already have an account? log in'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <HoverVideoController activeSocket={activeVideoSocket} />
    </div>
  );
}
