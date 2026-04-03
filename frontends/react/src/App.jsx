import React, { useEffect, useState } from "react";
import Header from "./Header";
import CollectionHero from "./CollectionHero";

export default function App() {
  const [products, setProducts] = useState([]);

  useEffect(() => {
    fetch("http://localhost:8000/api/products")
      .then((res) => res.json())
      .then((data) => setProducts(data))
      .catch((err) => console.error(err));
  }, []);

  return (
    <div>
      <Header />
      <main style={{ height: "20vh" }}>
        <CollectionHero />
      </main>
      <div className="p-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {products.map((product) => {
            const imageUrl = `http://localhost:8000${product.picture}`;
            console.log(product.picture);

            return (
              <div
                key={product.id}
                className="bg-white rounded-lg shadow p-4 text-center"
              >
                <img
                  src={imageUrl}
                  alt={product.name}
                  className="h-40 w-full object-cover rounded mb-3"
                />

                <h3 className="text-sm font-medium">
                  {product.name}
                </h3>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

}