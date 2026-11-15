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

/* Replay the grayscale denoising transition on load and on every switch. */
(() => {
  const button = document.querySelector('.portrait-switch');
  if (!button) return;

  const portrait = button.querySelector('img');
  const sources = [portrait.src, button.dataset.alternateSrc];
  const images = sources.map((src) => {
    const image = new Image();
    image.src = src;
    return image;
  });
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let current = 0;
  let sequence = 0;

  async function show(index) {
    const run = ++sequence;
    const image = images[index];
    try {
      if (image.decode) await image.decode();
      else if (!image.complete) await new Promise((resolve, reject) => {
        image.onload = resolve;
        image.onerror = reject;
      });
    } catch {
      return;
    }
    if (run !== sequence || !image.naturalWidth) return;

    current = index;
    button.classList.remove('is-denoising');
    portrait.classList.toggle('is-portrait', index === 1);
    portrait.src = sources[index];
    button.setAttribute('aria-label', index === 0 ? 'Show portrait photo' : 'Show original profile picture');
    if (reducedMotion.matches) return;

    // A layout read restarts both animations, including repeated rapid clicks.
    void button.offsetWidth;
    button.classList.add('is-denoising');
  }

  button.addEventListener('click', () => show(1 - current));
  show(0);
})();
