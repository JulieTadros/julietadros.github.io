(() => {
  const gallery = document.querySelector('.journal-carousel');
  if (!gallery) return;
  const slides = [...gallery.children];
  const counter = document.querySelector('[data-journal-counter]');
  let active = 0;
  const show = (step) => {
    active = (active + step + slides.length) % slides.length;
    slides.forEach((slide, i) => { slide.hidden = i !== active; });
    counter.textContent = `${active + 1} / ${slides.length}`;
  };
  document.querySelector('[data-journal-prev]').addEventListener('click', () => show(-1));
  document.querySelector('[data-journal-next]').addEventListener('click', () => show(1));
})();
