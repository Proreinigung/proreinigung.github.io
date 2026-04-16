/* ============================================================
   PROREINIGUNG — Main JavaScript
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {

  /* ── Particles Canvas ─────────────────────────────────────── */
  const canvas = document.getElementById('particles-canvas');
  if (canvas) {
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles = [];
    const PARTICLE_COUNT = 60;

    class Particle {
      constructor() { this.reset(true); }
      reset(initial = false) {
        this.x = Math.random() * canvas.width;
        this.y = initial ? Math.random() * canvas.height : canvas.height + 10;
        this.r = Math.random() * 3 + 1;
        this.speed = Math.random() * .6 + .2;
        this.dx = (Math.random() - .5) * .4;
        this.opacity = Math.random() * .5 + .1;
        this.color = Math.random() > .5 ? '0,180,216' : '255,183,3';
      }
      update() {
        this.y -= this.speed;
        this.x += this.dx;
        if (this.y < -10) this.reset();
      }
      draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${this.color},${this.opacity})`;
        ctx.fill();
      }
    }

    for (let i = 0; i < PARTICLE_COUNT; i++) particles.push(new Particle());

    function animateParticles() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => { p.update(); p.draw(); });
      requestAnimationFrame(animateParticles);
    }
    animateParticles();

    window.addEventListener('resize', () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    });
  }

  /* ── Navbar scroll ────────────────────────────────────────── */
  const navbar = document.getElementById('navbar');
  if (navbar) {
    const onScroll = () => {
      navbar.classList.toggle('scrolled', window.scrollY > 40);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* ── Mobile menu ──────────────────────────────────────────── */
  const hamburger = document.getElementById('hamburger');
  const mobileMenu = document.getElementById('mobile-menu');
  if (hamburger && mobileMenu) {
    hamburger.addEventListener('click', () => {
      mobileMenu.classList.toggle('open');
      document.body.style.overflow = mobileMenu.classList.contains('open') ? 'hidden' : '';
    });
    mobileMenu.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', () => {
        mobileMenu.classList.remove('open');
        document.body.style.overflow = '';
      });
    });
  }

  /* ── Scroll reveal ────────────────────────────────────────── */
  const revealEls = document.querySelectorAll('.reveal,.reveal-left,.reveal-right');
  if (revealEls.length) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add('visible'); io.unobserve(e.target); }
      });
    }, { threshold: 0.12 });
    revealEls.forEach(el => io.observe(el));
  }

  /* ── Counter animation ────────────────────────────────────── */
  const counters = document.querySelectorAll('[data-count]');
  if (counters.length) {
    const cIO = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          const target = +e.target.getAttribute('data-count');
          const suffix = e.target.getAttribute('data-suffix') || '';
          const duration = 2000;
          const steps = 60;
          const increment = target / steps;
          let current = 0;
          const timer = setInterval(() => {
            current += increment;
            if (current >= target) { current = target; clearInterval(timer); }
            e.target.textContent = Math.floor(current).toLocaleString('de-DE') + suffix;
          }, duration / steps);
          cIO.unobserve(e.target);
        }
      });
    }, { threshold: 0.5 });
    counters.forEach(c => cIO.observe(c));
  }

  /* ── Testimonial slider ───────────────────────────────────── */
  const track = document.querySelector('.testimonials-track');
  const dots = document.querySelectorAll('.slider-dot');
  const prevBtn = document.getElementById('slider-prev');
  const nextBtn = document.getElementById('slider-next');
  if (track) {
    let current = 0;
    const slides = track.querySelectorAll('.testimonial-slide');
    const total = slides.length;

    const goTo = (idx) => {
      current = (idx + total) % total;
      track.style.transform = `translateX(-${current * 100}%)`;
      dots.forEach((d, i) => d.classList.toggle('active', i === current));
    };

    if (prevBtn) prevBtn.addEventListener('click', () => goTo(current - 1));
    if (nextBtn) nextBtn.addEventListener('click', () => goTo(current + 1));
    dots.forEach((d, i) => d.addEventListener('click', () => goTo(i)));

    let autoPlay = setInterval(() => goTo(current + 1), 5000);
    track.parentElement.addEventListener('mouseenter', () => clearInterval(autoPlay));
    track.parentElement.addEventListener('mouseleave', () => { autoPlay = setInterval(() => goTo(current + 1), 5000); });

    // Touch support
    let startX = 0;
    track.addEventListener('touchstart', e => { startX = e.touches[0].clientX; }, { passive: true });
    track.addEventListener('touchend', e => {
      const diff = startX - e.changedTouches[0].clientX;
      if (Math.abs(diff) > 50) goTo(diff > 0 ? current + 1 : current - 1);
    }, { passive: true });
  }

  /* ── Back to top ──────────────────────────────────────────── */
  const btt = document.querySelector('.back-to-top');
  if (btt) {
    window.addEventListener('scroll', () => btt.classList.toggle('show', window.scrollY > 400), { passive: true });
    btt.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  }

  /* ── Active nav link ──────────────────────────────────────── */
  const currentPath = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-links a').forEach(a => {
    const href = a.getAttribute('href');
    if (href === currentPath || (currentPath === '' && href === 'index.html')) {
      a.classList.add('active');
    }
  });

  /* ── Toast system ─────────────────────────────────────────── */
  window.showToast = (title, msg, type = 'info') => {
    const icons = { success: '✅', error: '❌', info: 'ℹ️' };
    const container = document.querySelector('.toast-container') || (() => {
      const el = document.createElement('div');
      el.className = 'toast-container';
      document.body.appendChild(el);
      return el;
    })();
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      <span class="toast-icon">${icons[type]}</span>
      <div class="toast-text"><div class="toast-title">${title}</div><div class="toast-msg">${msg}</div></div>
      <button class="toast-close" onclick="this.parentElement.remove()">✕</button>`;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 5000);
  };

  /* ── File upload preview ──────────────────────────────────── */
  document.querySelectorAll('.file-upload').forEach(zone => {
    const input = zone.querySelector('input[type=file]');
    if (!input) return;
    zone.addEventListener('click', () => input.click());
    zone.addEventListener('dragover', e => { e.preventDefault(); zone.style.borderColor = 'var(--primary-light)'; });
    zone.addEventListener('dragleave', () => { zone.style.borderColor = ''; });
    zone.addEventListener('drop', e => {
      e.preventDefault();
      zone.style.borderColor = '';
      if (e.dataTransfer.files.length) {
        input.files = e.dataTransfer.files;
        updateFileLabel(zone, input.files[0].name);
      }
    });
    input.addEventListener('change', () => { if (input.files.length) updateFileLabel(zone, input.files[0].name); });
  });
  function updateFileLabel(zone, name) {
    const p = zone.querySelector('p');
    if (p) p.innerHTML = `<strong>${name}</strong> — ausgewählt ✓`;
  }

  /* ── Password toggle ──────────────────────────────────────── */
  document.querySelectorAll('.password-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const input = btn.previousElementSibling;
      if (!input) return;
      const isText = input.type === 'text';
      input.type = isText ? 'password' : 'text';
      btn.textContent = isText ? '👁' : '🙈';
    });
  });

  /* ── Form validation helper ───────────────────────────────── */
  window.validateForm = (form) => {
    let valid = true;
    form.querySelectorAll('[required]').forEach(input => {
      const err = input.parentElement.querySelector('.form-error') || input.closest('.form-group')?.querySelector('.form-error');
      if (!input.value.trim()) {
        input.classList.add('error');
        if (err) err.textContent = 'Dieses Feld ist erforderlich.';
        valid = false;
      } else if (input.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.value)) {
        input.classList.add('error');
        if (err) err.textContent = 'Bitte gültige E-Mail eingeben.';
        valid = false;
      } else {
        input.classList.remove('error');
        if (err) err.textContent = '';
      }
    });
    return valid;
  };

  /* ── Smooth anchor scroll ─────────────────────────────────── */
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const target = document.querySelector(a.getAttribute('href'));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

});
