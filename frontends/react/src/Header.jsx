import { useState, useEffect } from "react";
import "./Header.css";

export default function Header({ searchOpen, setSearchOpen, cartOpen, setCartOpen, accountOpen, setAccountOpen, loggedInUser, cartCount, children }) {
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
          <a href="/shop" style={{ color: scrolled || searchOpen ? "#3F443F" : "#ffffff" }}>shop</a>
          <a href="/about" style={{ color: scrolled || searchOpen ? "#3F443F" : "#ffffff" }}>about</a>
        </nav>

        <div className="header__center">
          <a href="/" className="text-lg font-semibold tracking-[0.25em]" style={{ color: scrolled || searchOpen ? "#3F443F" : "#ffffff", fontSize: "21px" }}>
            PATCHWORK STORE
          </a>
        </div>

        <div className="header__right">
          <button onClick={() => { setSearchOpen(!searchOpen); setCartOpen(false); setAccountOpen(false); }} style={{ color: scrolled || searchOpen ? "#3F443F" : "#ffffff", display: 'flex', alignItems: 'center', gap: '8px' }}>
            <svg width="16" height="17" viewBox="0 0 16 17" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="7.5" cy="7.5" r="6.81818" stroke="currentColor" strokeWidth="1.36364"></circle>
              <path d="M11.7852 12.856L14.9994 16.0702" stroke="currentColor" strokeWidth="1.36364"></path>
            </svg>
            Search
          </button>

          <button onClick={() => { setAccountOpen(!accountOpen); setSearchOpen(false); setCartOpen(false); }} style={{ color: scrolled || searchOpen ? "#3F443F" : "#ffffff", display: 'flex', alignItems: 'center', gap: '8px' }}>
            <svg width="20" height="20" viewBox="0 0 24 23" fill="none" xmlns="http://www.w3.org/2000/svg">
              <g clipPath="url(#clip0_3544_581)">
                <path d="M16.8811 7.66406C17.1502 10.0624 17.204 15.0576 15.2663 15.8516C13.3286 16.6455 12.1265 15.0245 11.7676 14.1148" stroke="currentColor" strokeWidth="1.05"></path>
                <path d="M6.6541 7.66406C6.38498 10.0624 6.33115 15.0576 8.26884 15.8516C10.2065 16.6455 11.4087 15.0245 11.7676 14.1148" stroke="currentColor" strokeWidth="1.05"></path>
                <path d="M11.2426 1.88923C10.3426 1.47108 7.69849 0.928893 6.42212 2.93603C4.82667 5.44495 1.26758 9.66448 1.26758 10.5768C1.26758 11.4891 2.37212 15.9368 3.84485 16.0508C5.31758 16.1649 7.07857 15.5406 7.2013 14.8564" stroke="currentColor" strokeWidth="1.05"></path>
                <path d="M11.2426 1.88923C12.2426 1.47125 15.1221 0.928933 16.5403 2.93527C18.313 5.4432 22.2676 9.66105 22.2676 10.573C22.2676 11.485 21.0403 15.9309 19.4039 16.0449C17.7676 16.1589 16.1772 15.7609 16.0408 15.0769" stroke="currentColor" strokeWidth="1.05"></path>
                <circle cx="11.768" cy="12.9142" r="1.575" stroke="currentColor" strokeWidth="1.05"></circle>
                <path d="M7 15C5.8256 15.7619 3.59424 18.4286 4.064 23" stroke="currentColor"></path>
                <path d="M16 15C17.1744 15.7619 19.4058 18.4286 18.936 23" stroke="currentColor"></path>
              </g>
              <defs>
                <clipPath id="clip0_3544_581">
                  <rect width="23" height="23" fill="transparent" transform="translate(0.267578)"></rect>
                </clipPath>
              </defs>
            </svg>
            {loggedInUser ? loggedInUser : 'Account'}
          </button>

          <button onClick={() => { setCartOpen(!cartOpen); setSearchOpen(false); setAccountOpen(false); }} style={{ color: scrolled || searchOpen ? "#3F443F" : "#ffffff", display: 'flex', alignItems: 'center', gap: '8px' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M15.269 10.6842V4.26925C15.269 2.46369 13.8053 1 11.9998 1H11.2751C9.46955 1 8.00586 2.4637 8.00586 4.26926V10.6842" stroke="currentColor" strokeWidth="1.08975"></path>
              <path d="M5.52441 7.59766H18.0107C19.3665 7.59766 20.5162 8.59446 20.708 9.93652L22.6396 23.4551H0.895508L2.82715 9.93652C3.01897 8.59446 4.16869 7.59766 5.52441 7.59766Z" stroke="currentColor" strokeWidth="1.08975"></path>
            </svg>
            Cart ({cartCount})
          </button>
        </div>
      </header>
      {children}
    </div>
  );
}
