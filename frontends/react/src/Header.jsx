import { useState, useEffect } from "react";
import "./Header.css";

export default function Header({ searchOpen, setSearchOpen, cartOpen, setCartOpen, cartCount, children }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className={`header-wrapper ${scrolled || searchOpen ? "scrolled" : ""}`} style={{ position: "fixed" }}>
      <header className="header">
        <nav className="header__left">
          <a href="/shop"  style={{ color: scrolled || searchOpen ? "#3F443F" : "#ffffff" }}>shop</a>
          <a href="/about"  style={{ color: scrolled || searchOpen ? "#3F443F" : "#ffffff" }}>about</a>
        </nav>

        <div className="header__center">
            <a href="/" className="text-lg font-semibold tracking-[0.25em]" style={{ color: scrolled || searchOpen ? "#3F443F" : "#ffffff", fontSize: "21px" }}>
              PATCHWORK STORE
            </a>
        </div>

        <div className="header__right">
          <button onClick={() => setSearchOpen(!searchOpen)} style={{ color: scrolled || searchOpen ? "#3F443F" : "#ffffff", display: 'flex', alignItems: 'center', gap: '8px' }}>
            <svg width="16" height="17" viewBox="0 0 16 17" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="7.5" cy="7.5" r="6.81818" stroke="currentColor" strokeWidth="1.36364"></circle>
              <path d="M11.7852 12.856L14.9994 16.0702" stroke="currentColor" strokeWidth="1.36364"></path>
            </svg>
            Search
          </button>
          <button onClick={() => setCartOpen(!cartOpen)} style={{ color: scrolled || searchOpen ? "#3F443F" : "#ffffff" }}>Cart ({cartCount})</button>
        </div>
      </header>
      {children}
    </div>
  );
}
