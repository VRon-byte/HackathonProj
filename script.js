/* Sidebar */
const sidebar = document.getElementById("sidebar");

/* Auth dialog */
const authDialog = document.getElementById("authDialog");
const authForm = document.getElementById("authForm");
const authTitle = document.getElementById("authTitle");
const authCopy = document.getElementById("authCopy");
const authSubmit = document.getElementById("authSubmit");
const authSwitch = document.getElementById("authSwitch");
const authMessage = document.getElementById("authMessage");
const nameField = document.getElementById("nameField");
let authMode = "login";

function openAuth(mode) {
  authMode = mode;
  const isSignup = mode === "signup";
  authTitle.textContent = isSignup ? "Create your account" : "Log in to TouchGrass";
  authCopy.textContent = isSignup ? "Save events and find your people." : "Find and save events around you.";
  authSubmit.textContent = isSignup ? "Create Account" : "Log In";
  authSwitch.textContent = isSignup ? "Already have an account? Log in" : "Need an account? Sign up";
  nameField.hidden = !isSignup;
  authMessage.textContent = "";
  authForm.reset();
  authDialog.showModal();
}

document.querySelector(".login-button").addEventListener("click", () => openAuth("login"));
document.querySelector(".signup-button").addEventListener("click", () => openAuth("signup"));
document.getElementById("authDialogClose").addEventListener("click", () => authDialog.close());
authSwitch.addEventListener("click", () => openAuth(authMode === "login" ? "signup" : "login"));
authDialog.addEventListener("click", (event) => {
  if (event.target === authDialog) authDialog.close();
});

authForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const email = document.getElementById("authEmail").value.trim();
  const displayName = document.getElementById("authName").value.trim() || email.split("@")[0];
  localStorage.setItem("touchgrass-user", JSON.stringify({ email, displayName }));
  authMessage.textContent = authMode === "signup" ? "Account created!" : "Logged in!";
  document.querySelector(".login-button").textContent = displayName;
  document.querySelector(".signup-button").textContent = "✓ In";
  setTimeout(() => authDialog.close(), 700);
});

const storedUser = JSON.parse(localStorage.getItem("touchgrass-user") || "null");
if (storedUser) {
  document.querySelector(".login-button").textContent = storedUser.displayName;
  document.querySelector(".signup-button").textContent = "✓ In";
}

/* Events */
const savedPins = new Set(JSON.parse(localStorage.getItem("touchgrass-pinned-events") || "[]"));
const viewButtons = document.querySelectorAll(".event-view");
const allEventsView = document.getElementById("allEventsView");
const noPinnedEvents = document.getElementById("noPinnedEvents");
const noEventsFound = document.getElementById("noEventsFound");
const eventList = document.getElementById("eventList");
let eventCards = [];
let activeView = "all";
let activeCategory = "All";
const filterButtons = document.querySelectorAll(".filter-buttons button");

const localEvents = [
  { id: "community-market", name: "Community Market", date: "Sat · 9:00 AM", venue: "Downtown Plaza", category: "Markets", emoji: "🛍️" },
  { id: "live-music-night", name: "Live Music Night", date: "Fri · 7:00 PM", venue: "The Town Hall", category: "Music", emoji: "🎵" },
  { id: "neighborhood-art", name: "Neighborhood Art Walk", date: "Sun · 2:00 PM", venue: "Main Street Arts District", category: "Arts", emoji: "🎨" },
  { id: "pickup-sports", name: "Pick-up Basketball", date: "Sat · 10:00 AM", venue: "City Rec Center", category: "Sports", emoji: "🏀" },
  { id: "community-tech-talk", name: "Community Tech Talk", date: "Thu · 6:30 PM", venue: "Public Library", category: "Tech", emoji: "💻" }
];

function updateEventView() {
  eventCards.forEach((card) => {
    const matchesCategory = activeCategory === "All" || card.dataset.category === activeCategory;
    const matchesView = activeView !== "pinned" || savedPins.has(card.dataset.eventId);
    card.hidden = !matchesCategory || !matchesView;
  });
  noPinnedEvents.hidden = activeView !== "pinned" || savedPins.size > 0;
  const visibleEvents = eventCards.filter((card) => !card.hidden).length;
  noEventsFound.hidden = visibleEvents > 0 || (activeView === "pinned" && savedPins.size === 0);
}

viewButtons.forEach((button) => {
  button.addEventListener("click", () => {
    activeView = button.dataset.view;
    if (activeView === "pinned") {
      activeCategory = "All";
      allEventsView.hidden = false;
      filterButtons.forEach((filter) => {
        filter.classList.toggle("filter-active", filter.dataset.category === "All");
        filter.classList.toggle("filter-button", filter.dataset.category !== "All");
      });
    }
    viewButtons.forEach((view) => {
      view.classList.toggle("active", view === button);
      view.setAttribute("aria-pressed", String(view === button));
    });
    updateEventView();
  });
});

filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    activeCategory = button.dataset.category;
    activeView = "all";
    allEventsView.hidden = activeCategory !== "All";
    viewButtons.forEach((view) => {
      view.classList.toggle("active", view === allEventsView && activeCategory === "All");
      view.setAttribute("aria-pressed", String(view === allEventsView && activeCategory === "All"));
    });
    filterButtons.forEach((filter) => filter.classList.toggle("filter-active", filter === button));
    filterButtons.forEach((filter) => filter.classList.toggle("filter-button", filter !== button));
    updateEventView();
  });
});

function renderEvents(events) {
  eventList.replaceChildren();
  eventCards = events.map((event) => {
    const card = document.createElement("article");
    card.className = "event-card";
    card.dataset.eventId = event.id;
    card.dataset.category = event.category;
    card.innerHTML = `
      <div class="event-icon">${event.emoji}</div>
      <div class="event-info">
        <h3>${event.name}</h3>
        <p>${event.date}</p>
        <p>${event.venue}</p>
        <strong>${event.category}</strong>
      </div>
      <button class="pin-event" type="button" aria-label="Pin ${event.name}" aria-pressed="false">📌</button>`;
    eventList.append(card);
    return card;
  });

  eventCards.forEach((card) => {
    const pin = card.querySelector(".pin-event");
    const eventId = card.dataset.eventId;
    const syncPin = () => {
      const pinned = savedPins.has(eventId);
      pin.classList.toggle("pinned", pinned);
      pin.setAttribute("aria-pressed", String(pinned));
    };
    pin.addEventListener("click", () => {
      savedPins.has(eventId) ? savedPins.delete(eventId) : savedPins.add(eventId);
      localStorage.setItem("touchgrass-pinned-events", JSON.stringify([...savedPins]));
      syncPin();
      updateEventView();
    });
    syncPin();
  });
  updateEventView();
}

renderEvents(localEvents);
