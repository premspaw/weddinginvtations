const progressBar = document.querySelector('.progress');
const mandapam = document.querySelector('.mandapam');
const petalField = document.querySelector('.petal-field');
const stage = document.querySelector('.stage3d');
const depthBack = document.querySelector('.mandapam-depth-back');
const depthFront = document.querySelector('.mandapam-depth-front');

for (let index = 0; index < 30; index += 1) {
  const petal = document.createElement('i');
  petal.style.left = `${(index * 17) % 100}%`;
  petal.style.animationDelay = `${(index % 8) * -0.7}s`;
  petal.style.scale = `${0.6 + (index % 5) * 0.12}`;
  petalField.appendChild(petal);
}

function syncScrollMagic() {
  const max = document.documentElement.scrollHeight - window.innerHeight;
  const progress = max <= 0 ? 0 : window.scrollY / max;
  progressBar.style.transform = `scaleX(${progress})`;
  const side = Number(stage.dataset.side || 0);
  const lift = progress * -90;
  mandapam.style.transform = `translate3d(${side * 12}px, ${lift}px, 0) rotateY(${progress * 36 + side * 8}deg) rotateX(${-side * 2}deg)`;
  depthBack.style.transform = `translate3d(${-side * 36}px, ${progress * -36}px, -90px) scale(.9) rotateY(${-12 - side * 9}deg)`;
  depthFront.style.transform = `translate3d(${side * 48}px, ${progress * -72}px, 120px) scale(.72) rotateY(${side * 10}deg)`;
  document.querySelectorAll('.story-orb').forEach((orb, index) => {
    const rect = orb.getBoundingClientRect();
    const visible = 1 - Math.min(Math.abs(rect.top - window.innerHeight * 0.45) / window.innerHeight, 1);
    orb.style.transform = `translateY(${index * 22 - visible * 40}px) rotate(${visible * 2}deg)`;
  });
}

window.addEventListener('scroll', syncScrollMagic, { passive: true });
window.addEventListener('resize', syncScrollMagic);
syncScrollMagic();

const canvas = document.querySelector('.scratch-layer');
const card = document.querySelector('.scratch-card');
const ctx = canvas.getContext('2d');

function paintScratchCover() {
  const ratio = window.devicePixelRatio || 1;
  canvas.width = canvas.offsetWidth * ratio;
  canvas.height = canvas.offsetHeight * ratio;
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  const gradient = ctx.createLinearGradient(0, 0, canvas.offsetWidth, canvas.offsetHeight);
  gradient.addColorStop(0, '#f9d56e');
  gradient.addColorStop(0.45, '#b3163d');
  gradient.addColorStop(1, '#ffe8a3');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.offsetWidth, canvas.offsetHeight);
  ctx.fillStyle = 'rgba(255,255,255,.82)';
  ctx.font = '700 18px Inter, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Scratch to reveal the wedding details ✨', canvas.offsetWidth / 2, canvas.offsetHeight / 2);
}

function scratchAt(event) {
  const rect = canvas.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  ctx.globalCompositeOperation = 'destination-out';
  ctx.beginPath();
  ctx.arc(x, y, 28, 0, Math.PI * 2);
  ctx.fill();
  const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  let clear = 0;
  for (let index = 3; index < pixels.length; index += 16) {
    if (pixels[index] === 0) clear += 1;
  }
  if (clear / (pixels.length / 16) > 0.42) card.classList.add('revealed');
}

paintScratchCover();
window.addEventListener('resize', paintScratchCover);
canvas.addEventListener('pointerdown', scratchAt);
canvas.addEventListener('pointermove', (event) => {
  if (event.buttons === 1) scratchAt(event);
});


function setSideMotion(clientX) {
  const rect = stage.getBoundingClientRect();
  const side = Math.max(-1, Math.min(1, ((clientX - rect.left) / rect.width - 0.5) * 2));
  stage.dataset.side = side.toFixed(3);
  stage.classList.add('is-tilting');
  syncScrollMagic();
}

stage.addEventListener('pointermove', (event) => setSideMotion(event.clientX));
stage.addEventListener('pointerleave', () => {
  stage.dataset.side = '0';
  stage.classList.remove('is-tilting');
  syncScrollMagic();
});
stage.addEventListener('touchmove', (event) => {
  if (event.touches[0]) setSideMotion(event.touches[0].clientX);
}, { passive: true });
