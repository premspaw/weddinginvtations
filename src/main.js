/**
 * South Indian 3D Parallax Wedding Invitation & Lagna Patrika
 * Controls Mobile Parallax, Multi-Slot Photo Upload, Scroll-Drawn Story Timeline,
 * Guest View Mode, Inline Editable Texts, Host Settings Panel, Countdown, RSVP, Audio Synth & Custom MP3 Uploads, MongoDB Integration
 */

let invitationData = {
  customText: {},
  customImages: {},
  weddingDate: '2026-11-24T07:45',
  mapUrl: 'https://maps.google.com/?q=Mylapore+Chennai',
  customAudioUrl: ''
};

document.addEventListener('DOMContentLoaded', async () => {
  await fetchInvitationData();
  initViewModeEngine();
  initEditableTextEngine();
  initHostConfigPanel();
  initMotionObserver();
  initParallaxEngine();
  initPetalParticles();
  initScratchCard();
  initCountdownTimer();
  initAudioPlayer();
  initRSVPForm();
  initMultiSlotPhotoUploader();
  initTiltEffects();
});

/* ==========================================================================
   API Database Fetch Engine
   ========================================================================== */
async function fetchInvitationData() {
  try {
    const res = await fetch('/api/invitation');
    if (res.ok) {
      const data = await res.json();
      invitationData = {
        customText: data.customText || {},
        customImages: data.customImages || {},
        weddingDate: data.weddingDate || '2026-11-24T07:45',
        mapUrl: data.mapUrl || 'https://maps.google.com/?q=Mylapore+Chennai',
        customAudioUrl: data.customAudioUrl || ''
      };
    }
  } catch (err) {
    console.warn('Backend API offline, using LocalStorage fallback.');
    // Restore from LocalStorage fallback if server is offline
    const localText = JSON.parse(localStorage.getItem('wedding_custom_text') || '{}');
    const localImages = JSON.parse(localStorage.getItem('wedding_custom_images') || '{}');
    const localConfig = JSON.parse(localStorage.getItem('wedding_host_config') || '{}');

    invitationData = {
      customText: localText,
      customImages: localImages,
      weddingDate: localConfig.weddingDate || '2026-11-24T07:45',
      mapUrl: localConfig.mapUrl || 'https://maps.google.com/?q=Mylapore+Chennai',
      customAudioUrl: localConfig.customAudioUrl || ''
    };
  }
}

async function saveInvitationText(key, value) {
  invitationData.customText[key] = value;
  localStorage.setItem('wedding_custom_text', JSON.stringify(invitationData.customText));
  
  try {
    await fetch('/api/invitation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customText: invitationData.customText })
    });
  } catch (e) {
    console.warn('Failed to save to database, saved locally.');
  }
}

async function saveHostSettings(weddingDate, mapUrl, customAudioUrl) {
  if (weddingDate !== undefined) invitationData.weddingDate = weddingDate;
  if (mapUrl !== undefined) invitationData.mapUrl = mapUrl;
  if (customAudioUrl !== undefined) invitationData.customAudioUrl = customAudioUrl;

  const config = {
    weddingDate: invitationData.weddingDate,
    mapUrl: invitationData.mapUrl,
    customAudioUrl: invitationData.customAudioUrl
  };
  localStorage.setItem('wedding_host_config', JSON.stringify(config));

  try {
    await fetch('/api/invitation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config)
    });
  } catch (e) {
    console.warn('Failed to save settings to database, saved locally.');
  }
}

async function saveCustomImage(targetId, url) {
  invitationData.customImages[targetId] = url;
  localStorage.setItem('wedding_custom_images', JSON.stringify(invitationData.customImages));

  try {
    await fetch('/api/invitation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customImages: invitationData.customImages })
    });
  } catch (e) {
    console.warn('Failed to save images to database, saved locally.');
  }
}

/* ==========================================================================
   1. Host Customization Studio vs. Guest Shareable Link Engine
   ========================================================================== */
function initViewModeEngine() {
  const urlParams = new URLSearchParams(window.location.search);
  const isGuestMode = urlParams.get('mode') === 'guest';
  
  const viewModeBtn = document.getElementById('viewModeBtn');
  const shareLinkBtn = document.getElementById('shareLinkBtn');

  if (isGuestMode) {
    document.body.classList.add('guest-mode');
  }

  updateEditableAttributes();

  if (viewModeBtn) {
    viewModeBtn.addEventListener('click', () => {
      document.body.classList.toggle('guest-mode');
      const inGuestView = document.body.classList.contains('guest-mode');
      
      const modeIcon = viewModeBtn.querySelector('.mode-icon');
      const modeText = viewModeBtn.querySelector('.mode-text');
      
      if (inGuestView) {
        if (modeIcon) modeIcon.innerText = '🎨';
        if (modeText) modeText.innerText = 'Switch to Host Editor';
      } else {
        if (modeIcon) modeIcon.innerText = '👁️';
        if (modeText) modeText.innerText = 'Preview Guest View';
      }
      
      updateEditableAttributes();
    });
  }

  if (shareLinkBtn) {
    shareLinkBtn.addEventListener('click', () => {
      const shareUrl = `${window.location.origin}${window.location.pathname}?mode=guest`;
      navigator.clipboard.writeText(shareUrl).then(() => {
        const origText = shareLinkBtn.innerText;
        shareLinkBtn.innerText = '✓ Guest Link Copied!';
        setTimeout(() => {
          shareLinkBtn.innerText = origText;
        }, 2500);
      }).catch(err => {
        prompt('Copy your shareable guest link:', shareUrl);
      });
    });
  }
}

function updateEditableAttributes() {
  const inGuestView = document.body.classList.contains('guest-mode');
  const editables = document.querySelectorAll('.editable-text');
  editables.forEach(el => {
    el.contentEditable = !inGuestView;
  });
}

/* ==========================================================================
   2. Inline Editable Text Engine & Synchronous UI Updates
   ========================================================================== */
function initEditableTextEngine() {
  const editables = document.querySelectorAll('.editable-text');

  // Load saved modifications
  Object.keys(invitationData.customText).forEach(key => {
    const value = invitationData.customText[key];
    const targets = document.querySelectorAll(`.editable-text[data-key="${key}"]`);
    targets.forEach(t => {
      t.innerHTML = value;
    });
  });

  // Track edits in real time
  editables.forEach(el => {
    el.addEventListener('input', () => {
      const key = el.getAttribute('data-key');
      const value = el.innerHTML;

      // Sync across duplicate keys (e.g. Bride/Groom Name in Hero and Lagna Patrika)
      const matches = document.querySelectorAll(`.editable-text[data-key="${key}"]`);
      matches.forEach(m => {
        if (m !== el) {
          m.innerHTML = value;
        }
      });

      // Save to MongoDB / LocalStorage
      saveInvitationText(key, value);
    });
  });
}

/* ==========================================================================
   3. Host Configuration Panel & Custom MP3 File Upload
   ========================================================================== */
function initHostConfigPanel() {
  const panel = document.getElementById('hostCustomPanel');
  const toggleBtn = document.getElementById('togglePanelBtn');
  const closeBtn = document.getElementById('closePanelBtn');
  const saveBtn = document.getElementById('saveHostConfigBtn');

  const inputDate = document.getElementById('inputWeddingDate');
  const inputMap = document.getElementById('inputMapUrl');
  const inputAudio = document.getElementById('inputAudioFile');

  // Restore saved config
  if (invitationData.weddingDate) {
    if (inputDate) inputDate.value = invitationData.weddingDate;
  }
  if (invitationData.mapUrl) {
    if (inputMap) inputMap.value = invitationData.mapUrl;
    updateMapButtons(invitationData.mapUrl);
  }

  if (toggleBtn && panel) {
    toggleBtn.addEventListener('click', () => {
      panel.classList.toggle('active');
    });
  }

  if (closeBtn && panel) {
    closeBtn.addEventListener('click', () => {
      panel.classList.remove('active');
    });
  }

  if (saveBtn) {
    saveBtn.addEventListener('click', async () => {
      const dateVal = inputDate.value;
      const mapVal = inputMap.value;
      let audioUrl = invitationData.customAudioUrl;

      // Check if custom audio file was uploaded
      if (inputAudio && inputAudio.files.length > 0) {
        const file = inputAudio.files[0];
        const formData = new FormData();
        formData.append('file', file);

        saveBtn.innerText = 'Uploading Audio...';
        try {
          const uploadRes = await fetch('/api/upload', {
            method: 'POST',
            body: formData
          });
          if (uploadRes.ok) {
            const uploadData = await uploadRes.json();
            audioUrl = uploadData.url;
          }
        } catch (err) {
          console.error('Audio upload failed, keeping previous audio.');
        }
      }

      await saveHostSettings(dateVal, mapVal, audioUrl);
      updateMapButtons(mapVal);
      
      // Update audio player state
      window.dispatchEvent(new CustomEvent('wedding-audio-changed'));
      // Trigger countdown refresh
      window.dispatchEvent(new CustomEvent('wedding-date-changed'));

      saveBtn.innerText = '✓ Saved Successfully!';
      setTimeout(() => {
        saveBtn.innerText = 'Save Settings';
        panel.classList.remove('active');
      }, 1500);
    });
  }
}

function updateMapButtons(url) {
  const mapBtns = document.querySelectorAll('.map-link-btn');
  mapBtns.forEach(btn => {
    if (url) {
      btn.href = url;
    }
  });
}

/* ==========================================================================
   4. Framer-Style Motion Observer & Scroll-Drawn Timeline Line Engine
   ========================================================================== */
function initMotionObserver() {
  const motionElements = document.querySelectorAll('[data-motion]');
  const timelineContainer = document.querySelector('.timeline-container');

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in-view');
        
        // Progressively draw the vertical golden connecting line when scrolling past timeline
        if (timelineContainer && timelineContainer.contains(entry.target)) {
          timelineContainer.classList.add('drawn');
        }
      }
    });
  }, {
    threshold: 0.15,
    rootMargin: '0px 0px -30px 0px'
  });

  motionElements.forEach(el => observer.observe(el));
}

/* ==========================================================================
   5. Mobile-Optimized Parallax Scrolling Engine
   ========================================================================== */
function initParallaxEngine() {
  const parallaxLayers = document.querySelectorAll('.parallax-layer');
  const heroCard = document.querySelector('.hero-card');
  const navbar = document.getElementById('navbar');

  let ticking = false;

  window.addEventListener('scroll', () => {
    if (!ticking) {
      window.requestAnimationFrame(() => {
        const scrolled = window.pageYOffset;

        // Navbar blur transition
        if (scrolled > 50) {
          navbar.style.background = 'rgba(30, 1, 8, 0.95)';
          navbar.style.boxShadow = '0 4px 20px rgba(0,0,0,0.5)';
        } else {
          navbar.style.background = 'rgba(59, 3, 17, 0.85)';
          navbar.style.boxShadow = 'none';
        }

        // Parallax layers transform
        parallaxLayers.forEach(layer => {
          const speed = parseFloat(layer.getAttribute('data-speed')) || 0.5;
          const yPos = -(scrolled * speed);
          layer.style.transform = `translate3d(0px, ${yPos}px, 0px)`;
        });

        // Hero card 3D tilt & smooth rise parallax
        if (heroCard && scrolled < 1000) {
          const rotateX = Math.min(10, scrolled * 0.015);
          const translateY = -(scrolled * 0.25);
          heroCard.style.transform = `perspective(1000px) translateY(${translateY}px) rotateX(${rotateX}deg)`;
        }

        ticking = false;
      });
      ticking = true;
    }
  });
}

/* ==========================================================================
   6. Canvas Petal & Gold Particle System
   ========================================================================== */
function initPetalParticles() {
  const canvas = document.getElementById('petalCanvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  let width = (canvas.width = window.innerWidth);
  let height = (canvas.height = window.innerHeight);

  window.addEventListener('resize', () => {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  });

  const numParticles = 55;
  const particles = [];
  const colors = ['#ffd700', '#daa520', '#e65100', '#f5b041', '#fdfbf7', '#ffffff'];

  for (let i = 0; i < numParticles; i++) {
    particles.push({
      x: Math.random() * width,
      y: Math.random() * height,
      radius: Math.random() * 4 + 2,
      color: colors[Math.floor(Math.random() * colors.length)],
      speedY: Math.random() * 1.2 + 0.4,
      speedX: Math.sin(Math.random() * Math.PI) * 0.8,
      angle: Math.random() * Math.PI * 2,
      spin: (Math.random() - 0.5) * 0.04,
      opacity: Math.random() * 0.7 + 0.3
    });
  }

  function render() {
    ctx.clearRect(0, 0, width, height);

    particles.forEach(p => {
      p.y += p.speedY;
      p.x += Math.sin(p.angle) * 0.6;
      p.angle += p.spin;

      if (p.y > height + 10) {
        p.y = -10;
        p.x = Math.random() * width;
      }

      ctx.save();
      ctx.beginPath();
      ctx.globalAlpha = p.opacity;
      ctx.fillStyle = p.color;

      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle);
      ctx.ellipse(0, 0, p.radius, p.radius * 1.6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    requestAnimationFrame(render);
  }

  render();
}

/* ==========================================================================
   7. Interactive Golden Scratch Card & Google Calendar Link Generation
   ========================================================================== */
function initScratchCard() {
  const canvas = document.getElementById('scratchCanvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const width = canvas.width;
  const height = canvas.height;

  function drawGoldLayer() {
    const grad = ctx.createLinearGradient(0, 0, width, height);
    grad.addColorStop(0, '#ffd700');
    grad.addColorStop(0.5, '#daa520');
    grad.addColorStop(1, '#b8860b');

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = '#3b0311';
    ctx.font = 'bold 16px "Cinzel", serif';
    ctx.textAlign = 'center';
    ctx.fillText('✨ Scratch Here to Reveal Secret Note ✨', width / 2, height / 2 - 10);
    ctx.font = '13px "Outfit", sans-serif';
    ctx.fillText('(Use touch or mouse cursor)', width / 2, height / 2 + 18);
  }

  drawGoldLayer();

  let isScratching = false;

  function scratch(e) {
    if (!isScratching) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || (e.touches && e.touches[0].clientX)) - rect.left;
    const y = (e.clientY || (e.touches && e.touches[0].clientY)) - rect.top;

    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(x, y, 24, 0, Math.PI * 2);
    ctx.fill();
  }

  canvas.addEventListener('mousedown', (e) => { isScratching = true; scratch(e); });
  canvas.addEventListener('mousemove', scratch);
  window.addEventListener('mouseup', () => { isScratching = false; });

  canvas.addEventListener('touchstart', (e) => { 
    isScratching = true; 
    e.preventDefault(); 
    scratch(e); 
  }, { passive: false });
  
  canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    scratch(e);
  }, { passive: false });
  
  window.addEventListener('touchend', () => { isScratching = false; });

  const gCalBtn = document.getElementById('addToGoogleCalBtn');
  const icsBtn = document.getElementById('downloadIcsBtn');

  if (gCalBtn) {
    gCalBtn.addEventListener('click', () => {
      const bride = invitationData.customText['bride-name'] || 'Meenakshi';
      const groom = invitationData.customText['groom-name'] || 'Abhinav';
      const venue = invitationData.customText['venue-summary'] || 'Sri Venkateswara Kalyana Mantapam, Mylapore, Chennai';

      const title = encodeURIComponent(`${bride} & ${groom} Wedding Kalyanam`);
      const details = encodeURIComponent(`Join us for the auspicious Muhurtham of ${bride} and ${groom}.`);
      const location = encodeURIComponent(venue);

      let rawDate = invitationData.weddingDate || '2026-11-24T07:45';
      let d = new Date(rawDate);
      if (isNaN(d.getTime())) {
        d = new Date('2026-11-24T07:45:00');
      }
      
      const startStr = d.toISOString().replace(/-|:|\.\d+/g, "");
      d.setHours(d.getHours() + 3);
      const endStr = d.toISOString().replace(/-|:|\.\d+/g, "");

      const gcalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startStr}/${endStr}&details=${details}&location=${location}`;
      window.open(gcalUrl, '_blank');
    });
  }

  if (icsBtn) {
    icsBtn.addEventListener('click', () => {
      const bride = invitationData.customText['bride-name'] || 'Meenakshi';
      const groom = invitationData.customText['groom-name'] || 'Abhinav';
      const venue = invitationData.customText['venue-summary'] || 'Sri Venkateswara Kalyana Mantapam, Mylapore, Chennai';

      const title = `${bride} & ${groom} Wedding Kalyanam`;
      const details = `Join us for the auspicious Muhurtham of ${bride} and ${groom}.`;
      const location = venue;

      let rawDate = invitationData.weddingDate || '2026-11-24T07:45';
      let startDate = new Date(rawDate);
      if (isNaN(startDate.getTime())) {
        startDate = new Date('2026-11-24T07:45:00');
      }
      let endDate = new Date(startDate.getTime());
      endDate.setHours(endDate.getHours() + 3);

      const formatDate = (dateObj) => dateObj.toISOString().replace(/-|:|\.\d+/g, "");
      
      const icsLines = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//South Indian Wedding Invitation//EN',
        'BEGIN:VEVENT',
        `UID:wedding-${Date.now()}@weddinginvitations.com`,
        `DTSTAMP:${formatDate(new Date())}`,
        `DTSTART:${formatDate(startDate)}`,
        `DTEND:${formatDate(endDate)}`,
        `SUMMARY:${title}`,
        `DESCRIPTION:${details}`,
        `LOCATION:${location}`,
        'END:VEVENT',
        'END:VCALENDAR'
      ];

      const blob = new Blob([icsLines.join('\r\n')], { type: 'text/calendar;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${title.replace(/\s+/g, '_')}.ics`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });
  }
}

/* ==========================================================================
   8. Live Countdown Timer
   ========================================================================== */
function initCountdownTimer() {
  const daysEl = document.getElementById('days');
  const hoursEl = document.getElementById('hours');
  const minsEl = document.getElementById('minutes');
  const secsEl = document.getElementById('seconds');

  if (!daysEl) return;

  let targetDate = getTargetWeddingDate();

  window.addEventListener('wedding-date-changed', () => {
    targetDate = getTargetWeddingDate();
  });

  function getTargetWeddingDate() {
    if (invitationData.weddingDate) {
      return new Date(invitationData.weddingDate).getTime();
    }
    return new Date('November 24, 2026 07:45:00').getTime();
  }

  function updateClock() {
    const now = new Date().getTime();
    const distance = targetDate - now;

    if (distance < 0) {
      daysEl.innerText = '00';
      hoursEl.innerText = '00';
      minsEl.innerText = '00';
      secsEl.innerText = '00';
      return;
    }

    const days = Math.floor(distance / (1000 * 60 * 60 * 24));
    const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((distance % (1000 * 60)) / 1000);

    daysEl.innerText = String(days).padStart(2, '0');
    hoursEl.innerText = String(hours).padStart(2, '0');
    minsEl.innerText = String(minutes).padStart(2, '0');
    secsEl.innerText = String(seconds).padStart(2, '0');
  }

  updateClock();
  setInterval(updateClock, 1000);
}

/* ==========================================================================
   9. Web Audio & Custom MP3 Audio Player Engine with Autoplay
   ========================================================================== */
function initAudioPlayer() {
  const musicBtn = document.getElementById('musicBtn');
  if (!musicBtn) return;

  let audioCtx = null;
  let isPlaying = false;
  let timerId = null;
  let customAudioEl = null;

  function stopAllMusic() {
    if (timerId) {
      clearInterval(timerId);
      timerId = null;
    }
    if (customAudioEl) {
      customAudioEl.pause();
    }
  }

  const scale = [261.63, 277.18, 329.63, 349.23, 392.00, 415.30, 493.88, 523.25];

  function playRagamNotes() {
    if (!audioCtx || !isPlaying) return;

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    const note = scale[Math.floor(Math.random() * scale.length)];
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(note, audioCtx.currentTime);

    gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.85);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start();
    osc.stop(audioCtx.currentTime + 0.85);
  }

  function startMusic() {
    stopAllMusic();
    
    if (invitationData.customAudioUrl) {
      // Play custom uploaded MP3 audio file
      if (!customAudioEl) {
        customAudioEl = new Audio(invitationData.customAudioUrl);
        customAudioEl.loop = true;
      } else {
        customAudioEl.src = invitationData.customAudioUrl;
      }
      customAudioEl.play().catch(e => console.log('Autoplay blocked by browser. User interaction required.'));
    } else {
      // Fallback Synth Ragam Nadaswaram notes
      if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (audioCtx.state === 'suspended') {
        audioCtx.resume();
      }
      timerId = setInterval(playRagamNotes, 420);
    }
    
    isPlaying = true;
    musicBtn.classList.add('playing');
  }

  window.addEventListener('wedding-audio-changed', () => {
    // Reset custom audio element so it loads new uploaded audio
    if (customAudioEl) {
      customAudioEl.pause();
      customAudioEl = null;
    }
    if (isPlaying) {
      startMusic();
    }
  });

  musicBtn.addEventListener('click', () => {
    if (isPlaying) {
      isPlaying = false;
      stopAllMusic();
      musicBtn.classList.remove('playing');
    } else {
      startMusic();
    }
  });

  // Autoplay immediately after page load / link is opened (using body click/scroll trigger to bypass strict autoplay blocking)
  const triggerAutoplay = () => {
    if (!isPlaying) {
      startMusic();
    }
    document.removeEventListener('click', triggerAutoplay);
    document.removeEventListener('touchstart', triggerAutoplay);
    document.removeEventListener('scroll', triggerAutoplay);
  };

  document.addEventListener('click', triggerAutoplay);
  document.addEventListener('touchstart', triggerAutoplay);
  document.addEventListener('scroll', triggerAutoplay);
}

/* ==========================================================================
   10. RSVP Form & Local Persistence
   ========================================================================== */
function initRSVPForm() {
  const rsvpForm = document.getElementById('rsvpForm');
  const rsvpSuccess = document.getElementById('rsvpSuccessMessage');
  const rsvpSummary = document.getElementById('rsvpSummaryText');
  const resetBtn = document.getElementById('resetRsvpBtn');

  if (!rsvpForm) return;

  const savedRsvp = localStorage.getItem('wedding_rsvp');
  if (savedRsvp) {
    showRsvpSummary(JSON.parse(savedRsvp));
  }

  rsvpForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const data = {
      name: document.getElementById('guestName').value,
      email: document.getElementById('guestEmail').value,
      status: document.getElementById('attendingStatus').value,
      guests: document.getElementById('guestCount').value,
      dietary: document.getElementById('dietary').value,
      blessing: document.getElementById('blessingMessage').value
    };

    localStorage.setItem('wedding_rsvp', JSON.stringify(data));
    showRsvpSummary(data);
  });

  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      localStorage.removeItem('wedding_rsvp');
      rsvpForm.classList.remove('hidden');
      rsvpSuccess.classList.add('hidden');
    });
  }

  function showRsvpSummary(data) {
    rsvpForm.classList.add('hidden');
    rsvpSuccess.classList.remove('hidden');
    const statusText = data.status === 'joyfully' ? 'Attending with joy' : 'Regretfully Declining';
    rsvpSummary.innerHTML = `<strong>Dear ${data.name}</strong>, we have recorded your response (<em>${statusText}</em> for <strong>${data.guests} guest(s)</strong>). Thank you for your warm blessings!`;
  }
}

/* ==========================================================================
   11. Multi-Slot Custom Photo Uploader & MongoDB Upload Sync
   ========================================================================== */
function initMultiSlotPhotoUploader() {
  const fileInputs = document.querySelectorAll('.slot-file-input');

  // Load custom saved images
  Object.keys(invitationData.customImages).forEach(targetId => {
    const url = invitationData.customImages[targetId];
    const targetImg = document.getElementById(targetId);
    if (targetImg) targetImg.src = url;

    if (targetId === 'img-slot-muhurtham') {
      const mainPortrait = document.getElementById('mainPortraitImg');
      if (mainPortrait) mainPortrait.src = url;
    }

    const syncInput = document.querySelector(`.slot-file-input[data-target="${targetId}"]`);
    if (syncInput) {
      const syncId = syncInput.getAttribute('data-sync');
      if (syncId) {
        const ceremonyImg = document.getElementById(syncId);
        if (ceremonyImg) ceremonyImg.src = url;
      }
    }
  });

  fileInputs.forEach(input => {
    input.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      const targetId = input.getAttribute('data-target');
      const syncId = input.getAttribute('data-sync');

      const targetImg = document.getElementById(targetId);
      const ceremonyImg = syncId ? document.getElementById(syncId) : null;

      if (file && targetImg) {
        const formData = new FormData();
        formData.append('file', file);

        try {
          const res = await fetch('/api/upload', {
            method: 'POST',
            body: formData
          });
          if (res.ok) {
            const data = await res.json();
            const imageUrl = data.url;

            targetImg.src = imageUrl;
            if (ceremonyImg) {
              ceremonyImg.src = imageUrl;
            }
            if (targetId === 'img-slot-muhurtham') {
              const mainPortrait = document.getElementById('mainPortraitImg');
              if (mainPortrait) mainPortrait.src = imageUrl;
            }

            // Save image path to database
            await saveCustomImage(targetId, imageUrl);
          }
        } catch (err) {
          console.error('Image upload failed.');
        }
      }
    });
  });
}

/* ==========================================================================
   12. Interactive 3D Card Tilt Effects
   ========================================================================== */
function initTiltEffects() {
  const tiltBoxes = document.querySelectorAll('.3d-tilt-box, .event-card, .lagna-card-wrap');

  tiltBoxes.forEach(box => {
    box.addEventListener('mousemove', (e) => {
      const rect = box.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      const rotateX = ((y - centerY) / centerY) * -6;
      const rotateY = ((x - centerX) / centerX) * 6;

      box.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.01)`;
    });

    box.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale(1)';
  });
}
