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

if (slides.length > 1) {
  setInterval(showNextSlide, 10000);
}

// ====== RSVP FORM LOGIC ======
const form = document.getElementById("rsvp-form");
const status = document.getElementById("status");

const confirmModal = document.getElementById("rsvp-confirm-modal");
const confirmText = document.getElementById("confirm-text");
const confirmCancel = document.getElementById("confirm-cancel");
const confirmSubmit = document.getElementById("confirm-submit");

let pendingRsvpData = null;

function setStatus(message, isError = false) {
  if (!status) return;
  status.textContent = message;
  status.style.color = isError ? "#a94442" : "";
}

function openConfirmModal(fullName) {
  if (!confirmModal || !confirmText) return;

  confirmText.textContent =
    `Please confirm this RSVP is only for ${fullName} and does not include any +1's.`;

  confirmModal.classList.remove("hidden");
  confirmModal.setAttribute("aria-hidden", "false");
}

function closeConfirmModal() {
  if (!confirmModal) return;

  confirmModal.classList.add("hidden");
  confirmModal.setAttribute("aria-hidden", "true");
}

if (confirmCancel) {
  confirmCancel.addEventListener("click", () => {
    closeConfirmModal();
  });
}

if (form) {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const firstName = document.getElementById("first-name")?.value.trim() || "";
    const lastName = document.getElementById("last-name")?.value.trim() || "";
    const attendance = document.getElementById("attendance")?.value || "";
    const messageToCouple =
      document.getElementById("message-to-couple")?.value.trim() || "";

    if (!firstName || !lastName || !attendance) {
      setStatus("Please fill out First Name, Last Name, and Attending.", true);
      return;
    }

    pendingRsvpData = {
      first_name: firstName,
      last_name: lastName,
      attendance: attendance,
      soda_preference: sodaPreference,
      song_request: songRequest,
      seating_requests: seatingRequests,
      message_to_couple: messageToCouple
    };

    setStatus("");
    openConfirmModal(`${firstName} ${lastName}`);
  });
}

if (confirmSubmit) {
  confirmSubmit.addEventListener("click", async () => {
    if (!pendingRsvpData) {
      setStatus("No RSVP data found. Please fill out the form again.", true);
      closeConfirmModal();
      return;
    }

    setStatus("Sending RSVP...");
    confirmSubmit.disabled = true;
    if (confirmCancel) confirmCancel.disabled = true;

    try {
      const { error } = await client.from("rsvps").insert([pendingRsvpData]);

      if (error) {
        console.error("Supabase error:", error);
        setStatus(`Something went wrong: ${error.message}`, true);
        return;
      }

      setStatus("RSVP submitted successfully!");
      form.reset();
      pendingRsvpData = null;
      closeConfirmModal();
    } catch (err) {
      console.error("Unexpected error:", err);
      setStatus("Unexpected error occurred.", true);
    } finally {
      confirmSubmit.disabled = false;
      if (confirmCancel) confirmCancel.disabled = false;
    }
  });
}

// ====== NAVBAR HIDE / SHOW ON SCROLL ======
const siteNav = document.querySelector(".site-nav");

if (siteNav) {
  let lastScrollY = window.scrollY;
  let scrollDownDistance = 0;
  let scrollUpDistance = 0;

  const HIDE_THRESHOLD = 110;
  const SHOW_THRESHOLD = 35;

  window.addEventListener(
    "scroll",
    () => {
      const currentScrollY = window.scrollY;
      const delta = currentScrollY - lastScrollY;

      if (currentScrollY > 20) {
        siteNav.classList.add("nav-scrolled");
      } else {
        siteNav.classList.remove("nav-scrolled");
      }

      if (currentScrollY <= 10) {
        siteNav.classList.remove("nav-hidden");
        scrollDownDistance = 0;
        scrollUpDistance = 0;
        lastScrollY = currentScrollY;
        return;
      }

      if (delta > 0) {
        scrollDownDistance += delta;
        scrollUpDistance = 0;

        if (scrollDownDistance > HIDE_THRESHOLD) {
          siteNav.classList.add("nav-hidden");
        }
      } else if (delta < 0) {
        scrollUpDistance += Math.abs(delta);
        scrollDownDistance = 0;

        if (scrollUpDistance > SHOW_THRESHOLD) {
          siteNav.classList.remove("nav-hidden");
        }
      }

      lastScrollY = currentScrollY;
    },
    { passive: true }
  );
}

// ====== LIVE COUNTDOWN ======
const countdownDaysEl = document.getElementById("countdown-days");

function updateWeddingCountdown() {
  if (!countdownDaysEl) return;

  const weddingDate = new Date(2027, 4, 8); // May 8, 2027
  const now = new Date();

  const diffMs = weddingDate.getTime() - now.getTime();
  const msPerDay = 1000 * 60 * 60 * 24;
  const daysLeft = Math.ceil(diffMs / msPerDay);

  if (daysLeft > 0) {
    countdownDaysEl.textContent = daysLeft;
  } else if (daysLeft === 0) {
    countdownDaysEl.textContent = "0";
  } else {
    countdownDaysEl.textContent = "Married!";
  }
}

updateWeddingCountdown();
setInterval(updateWeddingCountdown, 60 * 1000);