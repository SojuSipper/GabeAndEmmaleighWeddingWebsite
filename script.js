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
  setInterval(showNextSlide, 6000);
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