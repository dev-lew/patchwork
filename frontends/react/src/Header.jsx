import { useState, useEffect } from "react";
import "./Header.css";

export default function Header() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className={`header-wrapper ${scrolled ? "scrolled" : ""}`}>
      <header className="header">
        <nav className="header__left">
          <a href="/shop"  style={{ color: scrolled ? "#3F443F" : "#ffffff" }}>shop</a>
          <a href="/about"  style={{ color: scrolled ? "#3F443F" : "#ffffff" }}>about</a>
        </nav>

        <div className="header__center">
            <a href="/" class="text-lg font-semibold tracking-[0.25em] text-black text-white" style={{ color: scrolled ? "#3F443F" : "#ffffff", fontSize: "21px" }}>
              PATCHWORK STORE
            </a>
        </div>

        <div className="header__right">
          <button  style={{ color: scrolled ? "#3F443F" : "#ffffff" }}>Search</button>
          <a href="/cart"  style={{ color: scrolled ? "#3F443F" : "#ffffff" }}>Cart (0)</a>
        </div>
      </header>
    </div>
  );
}
