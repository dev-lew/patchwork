import React, { useEffect, useState } from "react";
import Header from "./Header";
import CollectionHero from "./CollectionHero";
import "./App.css";

export default function App() {
  const [products, setProducts] = useState([]);

  useEffect(() => {
    fetch("http://localhost:8000/api/products")
      .then((res) => res.json())
      .then((data) => setProducts(data))
      .catch((err) => console.error(err));
  }, []);

  return (
    <div className="w-full">
      <Header />
      <main className="w-full">
        <CollectionHero />
      </main>
      {/* Explicitly clear the float from the video hero */}
      <div className="w-full clear-both"></div>
      <section className="products-section">
        <div className="products-shell">
          <div className="products-grid">
            {products.map((product) => {
              const imageUrl = product.picture.startsWith("/")
                ? `http://localhost:8000${product.picture}`
                : product.picture;

              return (
                <article key={product.id} className="product-card">
                  <div className="product-card__media">
                    <img
                      src={imageUrl}
                      alt={product.name}
                      className="product-card__image"
                    />
                  </div>
                  <div className="product-card__content">
                    <h3 className="product-card__title">{product.name}</h3>
                    <div className="product-card__meta">
                      <span className="product-card__stock">
                        {product.quantity > 0 ? "In stock" : "Out of stock"}
                      </span>
                      <span className="product-card__price">
                        ${Number(product.price).toFixed(2)}
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
  );
}
