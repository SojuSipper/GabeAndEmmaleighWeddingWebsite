// ====== CONFIG ======
const SUPABASE_URL = "https://jhvdlivheqnstpcuyswg.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpodmRsaXZoZXFuc3RwY3V5c3dnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3MTE1MTAsImV4cCI6MjA5MjI4NzUxMH0.r_cp6yx_m2t4OFkP0xvKIF9yxO7zVtgtZxv1HqjZZZc";

const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ====== GLOBAL STATE ======
let currentParty = null;
let currentPartyData = null;
let invitedMembers = [];
let pendingRsvpData = null;

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

// ====== DOM ELEMENTS ======
const loginModal = document.getElementById("loginModal");
const loginBtn = document.getElementById("loginBtn");
const loginFirstName = document.getElementById("loginFirstName");
const loginLastName = document.getElementById("loginLastName");
const loginError = document.getElementById("loginError");

const navUser = document.getElementById("navUser");
const navLoggedInName = document.getElementById("navLoggedInName");
const logoutBtn = document.getElementById("logoutBtn");

const guestList = document.getElementById("guestList");
const form = document.getElementById("rsvp-form");
const status = document.getElementById("status");

const confirmModal = document.getElementById("rsvp-confirm-modal");
const confirmText = document.getElementById("confirm-text");
const confirmCancel = document.getElementById("confirm-cancel");
const confirmSubmit = document.getElementById("confirm-submit");

const firstNameInput = document.getElementById("first-name");
const lastNameInput = document.getElementById("last-name");
const attendanceInput = document.getElementById("attendance");
const sodaInput = document.getElementById("soda-preference");
const songInput = document.getElementById("song-request");
const seatingInput = document.getElementById("seating-requests");
const messageInput = document.getElementById("message-to-couple");

// ====== HELPERS ======
function setStatus(message, isError = false) {
  if (!status) return;
  status.textContent = message;
  status.style.color = isError ? "#a94442" : "";
}

function clearStatus() {
  setStatus("");
}

function openLoginModal() {
  if (!loginModal) return;
  loginModal.classList.remove("hidden");
  loginModal.style.display = "flex";
  loginModal.setAttribute("aria-hidden", "false");
}

function closeLoginModal() {
  if (!loginModal) return;
  loginModal.classList.add("hidden");
  loginModal.style.display = "none";
  loginModal.setAttribute("aria-hidden", "true");
}

function openConfirmModal(message) {
  if (!confirmModal || !confirmText) return;
  confirmText.textContent = message;
  confirmModal.classList.remove("hidden");
  confirmModal.setAttribute("aria-hidden", "false");
}

function closeConfirmModal() {
  if (!confirmModal) return;
  confirmModal.classList.add("hidden");
  confirmModal.setAttribute("aria-hidden", "true");
}

function clearLoginError() {
  if (loginError) loginError.textContent = "";
}

function normalizeName(value) {
  return (value || "").trim();
}

function lockNameFields(firstName, lastName) {
  if (firstNameInput) {
    firstNameInput.value = firstName || "";
    firstNameInput.readOnly = true;
  }

  if (lastNameInput) {
    lastNameInput.value = lastName || "";
    lastNameInput.readOnly = true;
  }
}

function unlockNameFields() {
  if (firstNameInput) {
    firstNameInput.readOnly = false;
    firstNameInput.value = "";
  }

  if (lastNameInput) {
    lastNameInput.readOnly = false;
    lastNameInput.value = "";
  }
}

function getDisplayName(member) {
  if (!member) return "";

  if (member.display_name && member.display_name.trim()) {
    return member.display_name.trim();
  }

  return `${member.first_name || ""} ${member.last_name || ""}`.trim();
}

function updateLoginStateUI(displayName = "") {
  if (navLoggedInName) {
    navLoggedInName.textContent = displayName || "Guest";
  }

  if (navUser) {
    if (displayName) {
      navUser.classList.remove("hidden");
    } else {
      navUser.classList.add("hidden");
    }
  }
}

function clearStoredSession() {
  localStorage.removeItem("party_id");
  localStorage.removeItem("party_member_name");
}

function resetRsvpFormForLogout() {
  if (form) form.reset();
  unlockNameFields();

  if (guestList) {
    guestList.innerHTML = "";
  }

  currentParty = null;
  currentPartyData = null;
  invitedMembers = [];
  pendingRsvpData = null;
  clearStatus();
  updateLoginStateUI("");
}

function logoutCurrentGuest() {
  resetRsvpFormForLogout();
  clearStoredSession();
  clearLoginError();

  if (loginFirstName) loginFirstName.value = "";
  if (loginLastName) loginLastName.value = "";

  openLoginModal();
}

// ====== PARTY / INVITE LOOKUP ======
async function loadPartyMembers(partyId) {
  const { data, error } = await client
    .from("invite_members")
    .select("*")
    .eq("party_id", partyId)
    .order("first_name", { ascending: true });

  if (error) {
    console.error("Error loading party members:", error);
    invitedMembers = [];
    renderGuestList();
    return false;
  }

  invitedMembers = data || [];
  renderGuestList();
  return true;
}

async function loadPartyData(partyId) {
  const { data, error } = await client
    .from("invite_parties")
    .select("*")
    .eq("id", partyId)
    .single();

  if (error) {
    console.error("Error loading party:", error);
    currentPartyData = null;
    return false;
  }

  currentPartyData = data;
  return true;
}

function createGuestEntry(member) {
  const wrapper = document.createElement("div");
  wrapper.className = "guest-entry";

  const memberName = getDisplayName(member);

  wrapper.innerHTML = `
    <label class="guest-entry-label">
      <span class="guest-entry-name">${memberName}</span>
      <select class="guest-attendance" data-member-id="${member.id}">
        <option value="">Select</option>
        <option value="yes">Attending</option>
        <option value="no">Not Attending</option>
      </select>
    </label>
  `;

  return wrapper;
}

function renderGuestList() {
  if (!guestList) return;

  guestList.innerHTML = "";

  if (!invitedMembers.length) {
    guestList.innerHTML = `<p>No invited guests found for this party.</p>`;
    return;
  }

  invitedMembers.forEach((member) => {
    guestList.appendChild(createGuestEntry(member));
  });
}

async function signInInviteLookup() {
  clearLoginError();

  const first = normalizeName(loginFirstName?.value);
  const last = normalizeName(loginLastName?.value);

  if (!first || !last) {
    if (loginError) {
      loginError.textContent = "Please enter both your first and last name.";
    }
    return;
  }

  loginBtn.disabled = true;

  try {
    const { data, error } = await client
      .from("invite_members")
      .select("id, party_id, first_name, last_name, display_name")
      .ilike("first_name", first)
      .ilike("last_name", last);

    if (error) {
      console.error("Invite lookup error:", error);
      if (loginError) {
        loginError.textContent = "Something went wrong looking up your invitation.";
      }
      return;
    }

    if (!data || data.length === 0) {
      if (loginError) {
        loginError.textContent = "Name not found. Please try again.";
      }
      return;
    }

    const member = data[0];
    const displayName = getDisplayName(member);

    currentParty = member.party_id;
    localStorage.setItem("party_id", member.party_id);
    localStorage.setItem("party_member_name", displayName);

    await loadPartyData(member.party_id);
    await loadPartyMembers(member.party_id);

    lockNameFields(member.first_name, member.last_name);
    updateLoginStateUI(displayName);
    closeLoginModal();
    clearStatus();
  } catch (err) {
    console.error("Unexpected invite lookup error:", err);
    if (loginError) {
      loginError.textContent = "Unexpected error occurred. Please try again.";
    }
  } finally {
    loginBtn.disabled = false;
  }
}

async function restoreSavedParty() {
  const savedParty = localStorage.getItem("party_id");

  if (!savedParty) {
    updateLoginStateUI("");
    openLoginModal();
    return;
  }

  currentParty = savedParty;

  const loadedParty = await loadPartyData(savedParty);
  const loadedMembers = await loadPartyMembers(savedParty);

  if (!loadedParty || !loadedMembers || invitedMembers.length === 0) {
    clearStoredSession();
    resetRsvpFormForLogout();
    openLoginModal();
    return;
  }

  const savedMemberName = localStorage.getItem("party_member_name");

  if (savedMemberName) {
    const parts = savedMemberName.split(" ");
    if (parts.length >= 2) {
      lockNameFields(parts[0], parts.slice(1).join(" "));
    }
    updateLoginStateUI(savedMemberName);
  } else {
    updateLoginStateUI("");
  }

  closeLoginModal();
}

// ====== RSVP SUBMISSION ======
function collectGuestResponses() {
  const guestAttendanceEls = document.querySelectorAll(".guest-attendance");
  const guestResponses = [];

  guestAttendanceEls.forEach((el) => {
    guestResponses.push({
      invite_member_id: el.dataset.memberId,
      attendance: el.value
    });
  });

  return guestResponses;
}

function countAttendingGuests(guestResponses) {
  return guestResponses.filter((guest) => guest.attendance === "yes").length;
}

if (form) {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (!currentParty) {
      setStatus("Please look up your invitation first.", true);
      openLoginModal();
      return;
    }

    const firstName = normalizeName(firstNameInput?.value);
    const lastName = normalizeName(lastNameInput?.value);
    const attendance = attendanceInput?.value || "";
    const sodaPreference = normalizeName(sodaInput?.value);
    const songRequest = normalizeName(songInput?.value);
    const seatingRequests = normalizeName(seatingInput?.value);
    const messageToCouple = normalizeName(messageInput?.value);

    if (!firstName || !lastName) {
      setStatus("Please make sure your first and last name are filled out.", true);
      return;
    }

    const guestResponses = collectGuestResponses();

    if (!guestResponses.length) {
      if (!attendance) {
        setStatus("Please choose whether you are attending.", true);
        return;
      }
    }

    const unansweredGuest = guestResponses.find((guest) => !guest.attendance);
    if (guestResponses.length && unansweredGuest) {
      setStatus("Please choose attending or not attending for each invited guest.", true);
      return;
    }

    const yesCount = guestResponses.length
      ? countAttendingGuests(guestResponses)
      : attendance === "yes"
        ? 1
        : 0;

    if (
      currentPartyData &&
      typeof currentPartyData.max_reserved_seats === "number" &&
      yesCount > currentPartyData.max_reserved_seats
    ) {
      setStatus(
        `Your party is limited to ${currentPartyData.max_reserved_seats} reserved seat(s).`,
        true
      );
      return;
    }

    pendingRsvpData = {
      submittedByFirstName: firstName,
      submittedByLastName: lastName,
      messageToCouple,
      sodaPreference,
      songRequest,
      seatingRequests,
      guestResponses,
      fallbackAttendance: attendance
    };

    const fullName = `${firstName} ${lastName}`.trim();

    openConfirmModal(
      `Please confirm this RSVP is only for ${fullName} and does not include any uninvited guests or +1's.`
    );
  });
}

if (confirmCancel) {
  confirmCancel.addEventListener("click", () => {
    closeConfirmModal();
  });
}

if (confirmSubmit) {
  confirmSubmit.addEventListener("click", async () => {
    if (!pendingRsvpData) {
      setStatus("No RSVP data found. Please fill out the form again.", true);
      closeConfirmModal();
      return;
    }

    confirmSubmit.disabled = true;
    if (confirmCancel) confirmCancel.disabled = true;

    setStatus("Sending RSVP...");

    try {
      let rowsToInsert = [];

      if (pendingRsvpData.guestResponses && pendingRsvpData.guestResponses.length > 0) {
        rowsToInsert = pendingRsvpData.guestResponses.map((guest) => {
          const member = invitedMembers.find(
            (m) => String(m.id) === String(guest.invite_member_id)
          );

          return {
            party_id: currentParty,
            invite_member_id: guest.invite_member_id,
            first_name: member?.first_name || "",
            last_name: member?.last_name || "",
            attendance: guest.attendance,
            soda_preference: pendingRsvpData.sodaPreference,
            song_request: pendingRsvpData.songRequest,
            seating_requests: pendingRsvpData.seatingRequests,
            message_to_couple: pendingRsvpData.messageToCouple
          };
        });
      } else {
        rowsToInsert = [
          {
            party_id: currentParty,
            first_name: pendingRsvpData.submittedByFirstName,
            last_name: pendingRsvpData.submittedByLastName,
            attendance: pendingRsvpData.fallbackAttendance,
            soda_preference: pendingRsvpData.sodaPreference,
            song_request: pendingRsvpData.songRequest,
            seating_requests: pendingRsvpData.seatingRequests,
            message_to_couple: pendingRsvpData.messageToCouple
          }
        ];
      }

      const { error } = await client.from("rsvps").insert(rowsToInsert);

      if (error) {
        console.error("Supabase error:", error);
        setStatus(`Something went wrong: ${error.message}`, true);
        return;
      }

      if (currentParty) {
        await client
          .from("invite_parties")
          .update({ has_responded: true })
          .eq("id", currentParty);
      }

      setStatus("RSVP submitted successfully!");
      form.reset();
      pendingRsvpData = null;
      closeConfirmModal();

      const savedMemberName = localStorage.getItem("party_member_name");
      if (savedMemberName) {
        const parts = savedMemberName.split(" ");
        if (parts.length >= 2) {
          lockNameFields(parts[0], parts.slice(1).join(" "));
        }
      }

      renderGuestList();
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

// ====== INIT ======
window.addEventListener("load", async () => {
  await restoreSavedParty();
});

if (loginBtn) {
  loginBtn.addEventListener("click", async () => {
    await signInInviteLookup();
  });
}

if (loginFirstName) {
  loginFirstName.addEventListener("keydown", (e) => {
    if (e.key === "Enter") signInInviteLookup();
  });
}

if (loginLastName) {
  loginLastName.addEventListener("keydown", (e) => {
    if (e.key === "Enter") signInInviteLookup();
  });
}

if (logoutBtn) {
  logoutBtn.addEventListener("click", () => {
    logoutCurrentGuest();
  });
}