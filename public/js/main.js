/**
 * main.js — Tipi Raisers frontend JavaScript
 * Handles: nav toggle, donation amount selector, newsletter AJAX,
 *          progress bar animation, flash message auto-dismiss.
 */

document.addEventListener('DOMContentLoaded', () => {

  /* ── Mobile Nav Toggle ─────────────────────────────────── */
  const navToggle = document.getElementById('navToggle');
  const mainNav   = document.getElementById('mainNav');
  if (navToggle && mainNav) {
    navToggle.addEventListener('click', () => {
      mainNav.classList.toggle('nav-open');
      navToggle.setAttribute('aria-expanded', mainNav.classList.contains('nav-open'));
    });
    // Close nav when a link is clicked
    mainNav.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => mainNav.classList.remove('nav-open'));
    });
    // Close nav on outside click
    document.addEventListener('click', (e) => {
      if (!navToggle.contains(e.target) && !mainNav.contains(e.target)) {
        mainNav.classList.remove('nav-open');
      }
    });
  }

  /* ── Donation Amount Selector ──────────────────────────── */
  const amountBtns   = document.querySelectorAll('.amount-btn');
  const amountInput  = document.getElementById('amountInput');
  const customAmount = document.getElementById('customAmount');

  if (amountBtns.length && amountInput) {
    amountBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        amountBtns.forEach(b => b.classList.remove('amount-btn-active'));
        btn.classList.add('amount-btn-active');
        amountInput.value = btn.dataset.amount;
        if (customAmount) customAmount.value = '';
      });
    });
    // Custom amount overrides preset buttons
    if (customAmount) {
      customAmount.addEventListener('input', () => {
        if (customAmount.value) {
          amountBtns.forEach(b => b.classList.remove('amount-btn-active'));
          amountInput.value = customAmount.value;
        }
      });
    }
  }

  /* ── Newsletter AJAX Form ──────────────────────────────── */
  const newsletterForm = document.getElementById('newsletterForm');
  const newsletterMsg  = document.getElementById('newsletterMsg');
  if (newsletterForm) {
    newsletterForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = newsletterForm.querySelector('input[name="email"]').value;
      try {
        const res  = await fetch('/get-involved/newsletter', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        });
        const data = await res.json();
        if (newsletterMsg) {
          newsletterMsg.textContent = data.message;
          newsletterMsg.style.color = data.success ? '#90ee90' : '#ffb3b3';
        }
        if (data.success) newsletterForm.reset();
      } catch {
        if (newsletterMsg) {
          newsletterMsg.textContent = 'Something went wrong. Please try again.';
          newsletterMsg.style.color = '#ffb3b3';
        }
      }
    });
  }

  /* ── Progress Bar Entrance Animation ──────────────────── */
  const progressBars = document.querySelectorAll('.progress-bar-fill');
  if (progressBars.length) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const bar = entry.target;
          const targetWidth = bar.style.width;
          bar.style.width = '0%';
          requestAnimationFrame(() => {
            setTimeout(() => { bar.style.width = targetWidth; }, 50);
          });
          observer.unobserve(bar);
        }
      });
    }, { threshold: 0.3 });
    progressBars.forEach(bar => observer.observe(bar));
  }

  /* ── Flash Message Auto-Dismiss ───────────────────────── */
  const flashes = document.querySelectorAll('.flash');
  flashes.forEach(flash => {
    setTimeout(() => {
      flash.style.transition = 'opacity 0.5s ease, max-height 0.5s ease';
      flash.style.opacity = '0';
      flash.style.maxHeight = '0';
      flash.style.overflow = 'hidden';
      setTimeout(() => flash.remove(), 500);
    }, 5000);
  });

  /* ── Scroll-reveal for stat cards ─────────────────────── */
  const revealEls = document.querySelectorAll('.stat-card, .pillar-card, .post-card, .timeline-item');
  if ('IntersectionObserver' in window) {
    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.style.opacity = '1';
          entry.target.style.transform = 'translateY(0)';
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });
    revealEls.forEach(el => {
      el.style.opacity = '0';
      el.style.transform = 'translateY(20px)';
      el.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
      revealObserver.observe(el);
    });
  }

  /* ── Smooth anchor scrolling ───────────────────────────── */
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', (e) => {
      const target = document.querySelector(anchor.getAttribute('href'));
      if (target) {
        e.preventDefault();
        const headerOffset = 80;
        const y = target.getBoundingClientRect().top + window.scrollY - headerOffset;
        window.scrollTo({ top: y, behavior: 'smooth' });
      }
    });
  });
  document.querySelectorAll('.bio-toggle').forEach(btn => {
  btn.onclick = () => {
    const card = btn.closest('.team-card');
    card.classList.toggle('expanded');
    btn.textContent = card.classList.contains('expanded')
      ? 'Read less'
      : 'Read more';
    };
  });
  /* ── Admin: Confirm destructive actions ────────────────── */
  // Already handled inline via onsubmit in EJS, but also wire up dynamically:
  document.querySelectorAll('[data-confirm]').forEach(el => {
    el.addEventListener('click', (e) => {
      if (!confirm(el.dataset.confirm)) e.preventDefault();
    });
  });

});
