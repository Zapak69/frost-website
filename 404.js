const particleCanvas = document.getElementById('particles');
const particleCtx = particleCanvas.getContext('2d');
let particleW, particleH, particles = [];
function resizeParticleCanvas() {
  particleW = particleCanvas.width = window.innerWidth;
  particleH = particleCanvas.height = window.innerHeight;
}
resizeParticleCanvas();
window.addEventListener('resize', resizeParticleCanvas);
for (let i = 0; i < 100; i++) particles.push({
  x: Math.random() * window.innerWidth,
  y: Math.random() * window.innerHeight,
  r: Math.random() * 1.5 + 0.5,
  speed: Math.random() * 0.4 + 0.1,
  drift: (Math.random() - 0.5) * 0.3,
  opacity: Math.random() * 0.4 + 0.1
});
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
(function animateParticles() {
  particleCtx.clearRect(0, 0, particleW, particleH);
  for (const p of particles) {
    particleCtx.beginPath();
    particleCtx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    particleCtx.fillStyle = `rgba(168,230,248,${p.opacity})`;
    particleCtx.fill();
    if (!reduceMotion) {
      p.y += p.speed; p.x += p.drift;
      if (p.y > particleH + 10) { p.y = -10; p.x = Math.random() * particleW; }
      if (p.x > particleW + 10) p.x = -10;
      if (p.x < -10) p.x = particleW + 10;
    }
  }
  requestAnimationFrame(animateParticles);
})();
