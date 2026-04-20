document.getElementById("rsvp-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  document.getElementById("status").textContent = "Form is connected later in setup.";
});