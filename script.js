// ====== CONFIG ======
const SUPABASE_URL = "https://jhvdlivheqnstpcuyswg.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpodmRsaXZoZXFuc3RwY3V5c3dnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3MTE1MTAsImV4cCI6MjA5MjI4NzUxMH0.r_cp6yx_m2t4OFkP0xvKIF9yxO7zVtgtZxv1HqjZZZc";

// Create Supabase client
const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ====== HERO SLIDESHOW ======
const slides = document.querySelectorAll(".slide");
let currentSlide = 0;

function showNextSlide() {
  if (!slides.length) return;

  slides[currentSlide].classList.remove("active");
  currentSlide = (currentSlide + 1) % slides.length;
  slides[currentSlide].classList.add("active");
}

// Start slideshow only if there are slides
if (slides.length > 1) {
  setInterval(showNextSlide, 10000);
}

// ====== RSVP FORM LOGIC ======
const form = document.getElementById("rsvp-form");
const status = document.getElementById("status");

if (form) {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = document.getElementById("name").value.trim();
    const attendance = document.getElementById("attendance").value;
    const notes = document.getElementById("notes").value.trim();

    if (!name || !attendance) {
      status.textContent = "Please fill out all required fields.";
      return;
    }

    status.textContent = "Sending RSVP...";

    try {
      const { error } = await client.from("rsvps").insert([
        { name, attendance, notes }
      ]);

      if (error) {
        console.error("Supabase error:", error);
        status.textContent = "Something went wrong. Please try again.";
        return;
      }

      status.textContent = "RSVP submitted successfully!";
      form.reset();
    } catch (err) {
      console.error("Unexpected error:", err);
      status.textContent = "Unexpected error occurred.";
    }
  });
}

// ====== NAVBAR HIDE / SHOW ON SCROLL ======
const siteNav = document.querySelector(".site-nav");

if (siteNav) {
  let lastScrollY = window.scrollY;
  let scrollDownDistance = 0;
  let scrollUpDistance = 0;

  const HIDE_THRESHOLD = 110; // must scroll down a bit before hiding
  const SHOW_THRESHOLD = 35;  // shows sooner when scrolling back up

  window.addEventListener("scroll", () => {
    const currentScrollY = window.scrollY;
    const delta = currentScrollY - lastScrollY;

    // add slightly stronger nav style after leaving top
    if (currentScrollY > 20) {
      siteNav.classList.add("nav-scrolled");
    } else {
      siteNav.classList.remove("nav-scrolled");
    }

    // do nothing near the very top
    if (currentScrollY <= 10) {
      siteNav.classList.remove("nav-hidden");
      scrollDownDistance = 0;
      scrollUpDistance = 0;
      lastScrollY = currentScrollY;
      return;
    }

    if (delta > 0) {
      // scrolling down
      scrollDownDistance += delta;
      scrollUpDistance = 0;

      if (scrollDownDistance > HIDE_THRESHOLD) {
        siteNav.classList.add("nav-hidden");
      }
    } else if (delta < 0) {
      // scrolling up
      scrollUpDistance += Math.abs(delta);
      scrollDownDistance = 0;

      if (scrollUpDistance > SHOW_THRESHOLD) {
        siteNav.classList.remove("nav-hidden");
      }
    }

    lastScrollY = currentScrollY;
  }, { passive: true });
}