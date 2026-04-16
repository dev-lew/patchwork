if (window.location.pathname === "/html/products") {
  const header = document.getElementById("site-header");
  const headerLinks = document.querySelectorAll("#site-header a");
  const headerSvgs = document.querySelectorAll("#site-header svg");

  const onScroll = () => {
    if (window.scrollY > 10) {
      headerLinks.forEach((el) => {
        el.classList.add("text-black/80");
        el.classList.remove("text-white");
      });

      headerSvgs.forEach((el) => {
        el.classList.add("stroke-black/80");
        el.classList.remove("stroke-white");
      });

      header.classList.add("bg-white/70", "backdrop-blur", "border-black");
      header.classList.remove("border-white");
    } else {
      headerLinks.forEach((el) => {
        el.classList.remove("text-black/80");
        el.classList.add("text-white");
      });

      headerSvgs.forEach((el) => {
        el.classList.remove("stroke-black/80");
        el.classList.add("stroke-white");
      });

      header.classList.remove("bg-white/70", "backdrop-blur", "border-black");
      header.classList.add("border-white");
    }
  };

  window.addEventListener("scroll", onScroll);
  onScroll();
}
