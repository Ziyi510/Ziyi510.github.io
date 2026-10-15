/* Keep the outline in sync with the section being read. Links work without JS. */
(() => {
  const sections = Array.from(document.querySelectorAll('.home-section[id]'));
  const links = Array.from(document.querySelectorAll('.home-outline a'));
  let pending = false;
  function update() {
    let current = sections[0];
    for (const section of sections) {
      if (section.getBoundingClientRect().top <= 140) current = section;
    }
    for (const link of links) {
      if (current && link.hash === '#' + current.id) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    }
    pending = false;
  }
  window.addEventListener('scroll', () => {
    if (!pending) { pending = true; requestAnimationFrame(update); }
  }, { passive: true });
  window.addEventListener('resize', update);
  update();
})();
