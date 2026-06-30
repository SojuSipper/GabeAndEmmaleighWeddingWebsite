// ====== CONFIG ======
const SUPABASE_URL = "https://jhvdlivheqnstpcuyswg.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpodmRsaXZoZXFuc3RwY3V5c3dnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3MTE1MTAsImV4cCI6MjA5MjI4NzUxMH0.r_cp6yx_m2t4OFkP0xvKIF9yxO7zVtgtZxv1HqjZZZc";

const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ====== GLOBAL STATE ======
let currentPartyId = null;
let currentPartyData = null;
let currentLoggedInMember = null;
let invitedMembers = [];
let pendingRsvpData = null;

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
const inviteSummary = document.getElementById("inviteSummary");
const form = document.getElementById("rsvp-form");
const status = document.getElementById("status");

const confirmModal = document.getElementById("rsvp-confirm-modal");
const confirmText = document.getElementById("confirm-text");
const confirmCancel = document.getElementById("confirm-cancel");
const confirmSubmit = document.getElementById("confirm-submit");

const firstNameInput = document.getElementById("first-name");
const lastNameInput = document.getElementById("last-name");
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

function normalize(value) {
  return (value || "").trim();
}

function getDisplayName(member) {
  return (
    normalize(member?.display_name) ||
    `${member?.first_name || ""} ${member?.last_name || ""}`.trim()
  );
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

function updateLoginStateUI(displayName = "") {
  if (navLoggedInName) navLoggedInName.textContent = displayName || "Guest";

  if (navUser) {
    if (displayName) navUser.classList.remove("hidden");
    else navUser.classList.add("hidden");
  }
}

function lockNameFields(member) {
  if (!member) return;

  if (firstNameInput) {
    firstNameInput.value = member.first_name || "";
    firstNameInput.readOnly = true;
  }

  if (lastNameInput) {
    lastNameInput.value = member.last_name || "";
    lastNameInput.readOnly = true;
  }
}

function clearStoredSession() {
  localStorage.removeItem("invite_member_id");
  localStorage.removeItem("party_id");
}

function resetPageForLogout() {
  currentPartyId = null;
  currentPartyData = null;
  currentLoggedInMember = null;
  invitedMembers = [];
  pendingRsvpData = null;

  if (form) form.reset();

  if (firstNameInput) {
    firstNameInput.value = "";
    firstNameInput.readOnly = false;
  }

  if (lastNameInput) {
    lastNameInput.value = "";
    lastNameInput.readOnly = false;
  }

  if (guestList) guestList.innerHTML = "";

  if (inviteSummary) {
    inviteSummary.innerHTML = `
      <li>
        <span class="invite-summary-name">Log in to begin</span>
        <span class="invite-summary-note">Your invited guest list will appear here.</span>
      </li>
    `;
  }

  clearStatus();
  updateLoginStateUI("");
}

// ====== LOAD PARTY ======
async function loadParty(partyId) {
  const { data, error } = await client
    .from("invite_parties")
    .select("*")
    .eq("id", partyId)
    .single();

  if (error) {
    console.error("Party load error:", error);
    return false;
  }

  currentPartyData = data;
  return true;
}

async function loadPartyMembers(partyId) {
  const { data, error } = await client
    .from("invite_members")
    .select("*")
    .eq("party_id", partyId)
    .order("first_name", { ascending: true });

  if (error) {
    console.error("Member load error:", error);
    return false;
  }

  invitedMembers = data || [];
  renderGuestList();
  renderInviteSummary();
  return true;
}

// ====== RENDER ======
function renderGuestList() {
  if (!guestList) return;

  if (!invitedMembers.length) {
    guestList.innerHTML = `<p>No invited guests found for this party.</p>`;
    return;
  }

  guestList.innerHTML = invitedMembers
    .map((member) => {
      const attending = member.attending || "";
      const address = member.mailing_address || "";

      return `
        <div class="guest-entry" data-member-id="${member.id}">
          <label class="guest-entry-label">
            <span class="guest-entry-name">${getDisplayName(member)}</span>

            <label for="address-${member.id}">Mailing Address *</label>
            <textarea
              id="address-${member.id}"
              class="guest-address"
              data-member-id="${member.id}"
              rows="3"
              required
              placeholder="Street address, city, state, ZIP"
            >${address}</textarea>

            <label for="attendance-${member.id}">RSVP Status *</label>
            <select
              id="attendance-${member.id}"
              class="guest-attendance"
              data-member-id="${member.id}"
              required
            >
              <option value="">Select one</option>
              <option value="yes" ${attending === "yes" ? "selected" : ""}>Attending</option>
              <option value="no" ${attending === "no" ? "selected" : ""}>Not Attending</option>
            </select>
          </label>
        </div>
      `;
    })
    .join("");
}

function renderInviteSummary() {
  if (!inviteSummary) return;

  if (!invitedMembers.length) {
    inviteSummary.innerHTML = `
      <li>
        <span class="invite-summary-name">No invited guests found</span>
        <span class="invite-summary-note">Please double-check this party in Supabase.</span>
      </li>
    `;
    return;
  }

  inviteSummary.innerHTML = invitedMembers
    .map((member) => {
      const statusText = member.has_rsvped
        ? member.attending === "yes"
          ? "RSVP: Attending"
          : "RSVP: Not attending"
        : "RSVP: Not submitted yet";

      return `
        <li>
          <span class="invite-summary-name">${getDisplayName(member)}</span>
          <span class="invite-summary-note">${statusText}</span>
        </li>
      `;
    })
    .join("");
}

// ====== LOGIN ======
async function signInInviteLookup() {
  if (loginError) loginError.textContent = "";

  const first = normalize(loginFirstName?.value);
  const last = normalize(loginLastName?.value);

  if (!first || !last) {
    if (loginError) loginError.textContent = "Please enter both your first and last name.";
    return;
  }

  loginBtn.disabled = true;

  try {
    const { data, error } = await client
      .from("invite_members")
      .select("*")
      .or(
        `and(first_name.ilike.%${first}%,last_name.ilike.%${last}%),display_name.ilike.%${first} ${last}%`
      )
      .limit(1);

    if (error) {
      console.error("Invite lookup error:", error);
      if (loginError) loginError.textContent = "Something went wrong looking up your invitation.";
      return;
    }

    if (!data || !data.length) {
      if (loginError) loginError.textContent = "Name not found. Please try again.";
      return;
    }

    currentLoggedInMember = data[0];
    currentPartyId = currentLoggedInMember.party_id;

    localStorage.setItem("invite_member_id", currentLoggedInMember.id);
    localStorage.setItem("party_id", currentPartyId);

    const partyLoaded = await loadParty(currentPartyId);
    const membersLoaded = await loadPartyMembers(currentPartyId);

    if (!partyLoaded || !membersLoaded) {
      if (loginError) loginError.textContent = "Invitation found, but party data could not load.";
      return;
    }

    lockNameFields(currentLoggedInMember);
    updateLoginStateUI(getDisplayName(currentLoggedInMember));
    closeLoginModal();
    clearStatus();
  } catch (err) {
    console.error("Unexpected login error:", err);
    if (loginError) loginError.textContent = "Unexpected error occurred. Please try again.";
  } finally {
    loginBtn.disabled = false;
  }
}

async function restoreSavedSession() {
  const savedMemberId = localStorage.getItem("invite_member_id");
  const savedPartyId = localStorage.getItem("party_id");

  if (!savedMemberId || !savedPartyId) {
    openLoginModal();
    return;
  }

  const { data: member, error } = await client
    .from("invite_members")
    .select("*")
    .eq("id", savedMemberId)
    .single();

  if (error || !member) {
    clearStoredSession();
    openLoginModal();
    return;
  }

  currentLoggedInMember = member;
  currentPartyId = member.party_id;

  const partyLoaded = await loadParty(currentPartyId);
  const membersLoaded = await loadPartyMembers(currentPartyId);

  if (!partyLoaded || !membersLoaded) {
    clearStoredSession();
    openLoginModal();
    return;
  }

  lockNameFields(currentLoggedInMember);
  updateLoginStateUI(getDisplayName(currentLoggedInMember));
  closeLoginModal();
}

// ====== COLLECT RSVP ======
function collectGuestResponses() {
  return invitedMembers.map((member) => {
    const attendanceEl = document.querySelector(
      `.guest-attendance[data-member-id="${member.id}"]`
    );

    const addressEl = document.querySelector(
      `.guest-address[data-member-id="${member.id}"]`
    );

    return {
      id: member.id,
      first_name: member.first_name,
      last_name: member.last_name,
      mailing_address: normalize(addressEl?.value),
      attending: normalize(attendanceEl?.value)
    };
  });
}

function countAttendingGuests(responses) {
  return responses.filter((guest) => guest.attending === "yes").length;
}

// ====== SUBMIT RSVP ======
if (form) {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (!currentLoggedInMember || !currentPartyId) {
      setStatus("Please log in before submitting your RSVP.", true);
      openLoginModal();
      return;
    }

    const responses = collectGuestResponses();

    if (!responses.length) {
      setStatus("No guests found for this invitation.", true);
      return;
    }

    const missingAddress = responses.find((guest) => !guest.mailing_address);
    if (missingAddress) {
      setStatus(`Please enter an address for ${missingAddress.first_name}.`, true);
      return;
    }

    const missingAttendance = responses.find((guest) => !guest.attending);
    if (missingAttendance) {
      setStatus(`Please select attending or not attending for ${missingAttendance.first_name}.`, true);
      return;
    }

    const yesCount = countAttendingGuests(responses);

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
      responses,
      submittedBy: getDisplayName(currentLoggedInMember)
    };

    openConfirmModal(
      `Please confirm this RSVP is only for the invited guests shown on your invitation. No additional +1s are included.`
    );
  });
}

if (confirmCancel) {
  confirmCancel.addEventListener("click", closeConfirmModal);
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

    setStatus("Saving RSVP...");

    try {
      const now = new Date().toISOString();

      for (const guest of pendingRsvpData.responses) {
        const { error } = await client
          .from("invite_members")
          .update({
            mailing_address: guest.mailing_address,
            attending: guest.attending,
            has_rsvped: true,
            rsvp_submitted_at: now
          })
          .eq("id", guest.id)
          .eq("party_id", currentPartyId);

        if (error) {
          console.error("Guest RSVP update error:", error);
          setStatus(`Something went wrong saving ${guest.first_name}'s RSVP.`, true);
          return;
        }
      }

      const { error: partyError } = await client
        .from("invite_parties")
        .update({
          has_submitted: true,
          submitted_at: now
        })
        .eq("id", currentPartyId);

      if (partyError) {
        console.error("Party submit update error:", partyError);
        setStatus("RSVP saved, but party submission status failed.", true);
        return;
      }

      await loadParty(currentPartyId);
      await loadPartyMembers(currentPartyId);

      setStatus("RSVP submitted successfully!");
      pendingRsvpData = null;
      closeConfirmModal();
    } catch (err) {
      console.error("Unexpected submit error:", err);
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

      if (currentScrollY > 20) siteNav.classList.add("nav-scrolled");
      else siteNav.classList.remove("nav-scrolled");

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
        if (scrollDownDistance > HIDE_THRESHOLD) siteNav.classList.add("nav-hidden");
      } else if (delta < 0) {
        scrollUpDistance += Math.abs(delta);
        scrollDownDistance = 0;
        if (scrollUpDistance > SHOW_THRESHOLD) siteNav.classList.remove("nav-hidden");
      }

      lastScrollY = currentScrollY;
    },
    { passive: true }
  );
}

// ====== COUNTDOWN ======
const countdownDaysEl = document.getElementById("countdown-days");

function updateWeddingCountdown() {
  if (!countdownDaysEl) return;

  const weddingDate = new Date(2027, 4, 8);
  const now = new Date();
  const daysLeft = Math.ceil((weddingDate.getTime() - now.getTime()) / 86400000);

  countdownDaysEl.textContent = daysLeft > 0 ? daysLeft : daysLeft === 0 ? "0" : "Married!";
}

updateWeddingCountdown();
setInterval(updateWeddingCountdown, 60 * 1000);

// ====== INIT ======
window.addEventListener("load", restoreSavedSession);

if (loginBtn) loginBtn.addEventListener("click", signInInviteLookup);

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
    clearStoredSession();
    resetPageForLogout();
    openLoginModal();
  });
}