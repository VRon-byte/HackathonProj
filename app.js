/*
 * TouchGrass map and local event integration.
 *
 * Data ownership:
 *   - Leaflet: interactive map and marker display.
 *   - MapTiler: background map tiles.
 */

const DEFAULT_CENTER = [40.7128, -74.0060]; // Replace with the desired initial location.
const DEFAULT_ZOOM = 13;
const mapKeyQuery = new URLSearchParams(window.location.search).get("mapTilerKey");
const MAPTILER_KEY = mapKeyQuery || localStorage.getItem("touchgrass-maptiler-key") || "EG3XKhQ4MRSaUPkAiygq";
const MAP_TILE_URL = `https://api.maptiler.com/maps/streets-v4/{z}/{x}/{y}.png?key=${encodeURIComponent(MAPTILER_KEY)}`;
const MAP_ATTRIBUTION = '&copy; <a href="https://www.maptiler.com/copyright/">MapTiler</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

const eventStatus = document.querySelector("#event-status");
const hasLeaflet = typeof L !== "undefined";
const map = hasLeaflet ? L.map("map").setView(DEFAULT_CENTER, DEFAULT_ZOOM) : null;
const markerLayer = hasLeaflet ? L.layerGroup().addTo(map) : null;
let selectedCategory = "";
let pinnedEventIds = new Set();
let currentView = "all";
let currentEventsList = []; // Stores the current events (local or live) for filtering

const dropPinButton = document.querySelector("#drop-pin-button");
const clearPinsButton = document.querySelector("#clear-pins-button");
let isDroppingPin = false;
const pinLayer = hasLeaflet ? L.layerGroup().addTo(map) : null;

// Modal elements and temporary location storage
const customPinModal = document.querySelector("#custom-pin-modal");
const customPinForm = document.querySelector("#custom-pin-form");
const cancelPinButton = document.querySelector("#cancel-pin");
let pendingPinLocation = null;

dropPinButton.addEventListener("click", () => {
    isDroppingPin = !isDroppingPin;
    dropPinButton.classList.toggle("filter-active", isDroppingPin);
    dropPinButton.textContent = isDroppingPin ? "Click the map..." : "Drop a pin";
});

clearPinsButton.addEventListener("click", () => {
    if (pinLayer) pinLayer.clearLayers();
});

// Map click logic: triggers the modal when dropping a pin
if (map) map.on("click", (event) => {
    if (!isDroppingPin) return;

    // Save the clicked coordinates and show the modal
    pendingPinLocation = event.latlng;
    customPinModal.hidden = false;
    customPinForm.reset();

    // Reset the map dropping state
    isDroppingPin = false;
    dropPinButton.classList.remove("filter-active");
    dropPinButton.textContent = "Drop a pin";
});

// Cancel the custom pin modal
cancelPinButton.addEventListener("click", () => {
    customPinModal.hidden = true;
    pendingPinLocation = null;
});

// Handle saving the custom pin
customPinForm.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!pendingPinLocation) return;
    
    const title = document.querySelector("#pin-title").value;
    const date = document.querySelector("#pin-date").value;
    const category = document.querySelector("#pin-category").value || "User Pinned";
    
    // Generate a unique ID for the custom event
    const newEventId = "custom-pin-" + Date.now();
    
    // Create the event object
    const newEvent = {
        id: newEventId,
        title: title,
        starts_at: date,
        venue_name: `Custom Location (${pendingPinLocation.lat.toFixed(3)}, ${pendingPinLocation.lng.toFixed(3)})`,
        category: category,
        latitude: pendingPinLocation.lat,
        longitude: pendingPinLocation.lng,
        emoji: "📍"
    };

    // 1. Add it to the physical map marker layer
    if (pinLayer) {
        const pin = L.marker([newEvent.latitude, newEvent.longitude]).bindPopup(
            `<strong>${escapeHtml(newEvent.title)}</strong>
             <br>${escapeHtml(newEvent.venue_name)}
             <br>${escapeHtml(formatDate(newEvent.starts_at))}`
        );
        pin.addTo(pinLayer).openPopup();
    }

    // 2. Automatically store it in the data lists and mark it as pinned
    localEvents.unshift(newEvent); // Add to the master list of local events
    saveCustomEvents();
    
    // Ensure it shows up in the current list even if the user is viewing Ticketmaster events
    if (!currentEventsList.includes(newEvent)) {
        currentEventsList.unshift(newEvent);
    }
    
    pinnedEventIds.add(newEventId); // Auto-pin it to the sidebar
    
    // 3. Re-render the sidebar to show the new event
    renderEvents(currentEventsList);

    // 4. Clean up and close modal
    customPinModal.hidden = true;
    pendingPinLocation = null;
});

// Handle clicking the custom pin buttons on event cards
document.addEventListener("click", (e) => {
    if (e.target.matches(".pin-btn")) {
        e.stopPropagation(); // Prevent the map from panning when pinning
        const id = e.target.dataset.pinId;
        pinnedEventIds.has(id) ? pinnedEventIds.delete(id) : pinnedEventIds.add(id);
        renderEvents(currentEventsList); // re-render to reflect pin state
    }
});

// Handle toggling between "All Events" and "Pinned Events" views
const eventViewButtons = document.querySelectorAll(".event-view");
eventViewButtons.forEach(btn => {
    btn.addEventListener("click", (e) => {
        eventViewButtons.forEach(b => {
            b.classList.remove("active");
            b.setAttribute("aria-pressed", "false");
        });
        
        const targetBtn = e.currentTarget;
        targetBtn.classList.add("active");
        targetBtn.setAttribute("aria-pressed", "true");
        
        currentView = targetBtn.dataset.view;
        renderEvents(currentEventsList);
    });
});

if (!hasLeaflet) {
    eventStatus.textContent = "The map library could not load. Check your internet connection.";
}

if (hasLeaflet) {
    const tileLayer = L.tileLayer(MAP_TILE_URL, {
        maxZoom: 20,
        attribution: MAP_ATTRIBUTION,
        crossOrigin: true
    }).addTo(map);
    tileLayer.on("tileerror", () => {
        eventStatus.textContent = "Map tiles are unavailable. Showing the local map fallback.";
    });
}

const eventList = document.querySelector("#event-list");
const liveEventSearch = document.querySelector("#live-event-search");
const eventZipInput = document.querySelector("#event-zip");
const eventDistanceInput = document.querySelector("#event-distance");

document.querySelectorAll(".zoom-controls button").forEach((button, index) => {
    button.addEventListener("click", () => {
        if (!map) return;
        map[index === 0 ? "zoomIn" : "zoomOut"]();
    });
});

const localEvents = [
    { id: "community-market", title: "Community Market", starts_at: "2026-09-19T09:00:00", venue_name: "Downtown Plaza", category: "Markets", latitude: 40.716, longitude: -74.006, emoji: "🛍️" },
    { id: "live-music-night", title: "Live Music Night", starts_at: "2026-09-19T19:00:00", venue_name: "The Town Hall", category: "Music", latitude: 40.72, longitude: -74.01, emoji: "🎵" },
    { id: "neighborhood-art", title: "Neighborhood Art Walk", starts_at: "2026-09-20T14:00:00", venue_name: "Main Street Arts District", category: "Arts", latitude: 40.725, longitude: -74.002, emoji: "🎨" },
    { id: "pickup-sports", title: "Pick-up Basketball", starts_at: "2026-09-20T10:00:00", venue_name: "City Recreation Center", category: "Sports", latitude: 40.709, longitude: -74.015, emoji: "🏀" },
    { id: "community-tech-talk", title: "Community Tech Talk", starts_at: "2026-09-22T18:30:00", venue_name: "Public Library", category: "Tech", latitude: 40.729, longitude: -74.008, emoji: "💻" }
];

const CUSTOM_EVENTS_STORAGE_KEY = "touchgrass-custom-events";

function loadCustomEvents() {
    try {
        const storedEvents = JSON.parse(localStorage.getItem(CUSTOM_EVENTS_STORAGE_KEY) || "[]");
        if (!Array.isArray(storedEvents)) return;
        storedEvents.filter((event) => event && event.id && Number.isFinite(event.latitude) && Number.isFinite(event.longitude))
            .reverse()
            .forEach((event) => {
                localEvents.unshift(event);
                pinnedEventIds.add(event.id);
                if (pinLayer) {
                    L.marker([event.latitude, event.longitude]).addTo(pinLayer);
                }
            });
    } catch (error) {
        console.warn("Could not restore custom events.", error);
    }
}

function saveCustomEvents() {
    try {
        const customEvents = localEvents.filter((event) => event.id.startsWith("custom-pin-"));
        localStorage.setItem(CUSTOM_EVENTS_STORAGE_KEY, JSON.stringify(customEvents));
    } catch (error) {
        console.warn("Could not save custom event.", error);
    }
}

function formatDate(value) {
    if (!value) return "Date to be announced";
    return new Date(value).toLocaleString();
}

function renderEvent(event) {
    const card = document.createElement("article");
    card.className = "event-card";
    const isPinned = pinnedEventIds.has(event.id);
    
    card.innerHTML = `
        <div class="event-icon">${event.emoji || "📅"}</div>
        <div class="event-info">
            <h3>${escapeHtml(event.title)}</h3>
            <p>${escapeHtml(formatDate(event.starts_at))}</p>
            <p>${escapeHtml(event.venue_name || event.venue_address || "Location to be announced")}</p>
            <p>${escapeHtml(event.category || "Uncategorized")}</p>
        </div>
        <button class="pin-btn ${isPinned ? 'pinned' : ''}" data-pin-id="${event.id}" aria-label="${isPinned ? 'Unpin event' : 'Pin event'}">
            ${isPinned ? '📌 Pinned' : '📍 Pin'}
        </button>
    `;
    
    // Panning to the marker when clicking the card
    card.addEventListener("click", (e) => {
        if (e.target.matches('.pin-btn')) return;
        if (map && Number.isFinite(event.latitude) && Number.isFinite(event.longitude)) {
            map.setView([event.latitude, event.longitude], 16);
        } else if (event.url) {
            window.open(event.url, "_blank", "noopener,noreferrer");
        }
    });
    return card;
}

function escapeHtml(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function renderEvents(events) {
    currentEventsList = events; // Save the current dataset for filtering
    if (markerLayer) markerLayer.clearLayers();
    eventList.replaceChildren();

    // Filter events if the user is looking at the pinned view
    const displayedEvents = currentView === "pinned" 
        ? events.filter(e => pinnedEventIds.has(e.id)) 
        : events;

    if (displayedEvents.length === 0) {
        eventStatus.textContent = currentView === "pinned" ? "No pinned events found." : "No events found in this area.";
        return;
    }

    eventStatus.textContent = `${displayedEvents.length} event${displayedEvents.length === 1 ? "" : "s"} found`;
    const cards = document.createDocumentFragment();

    displayedEvents.forEach((event) => {
        if (markerLayer && Number.isFinite(event.latitude) && Number.isFinite(event.longitude)) {
            const marker = L.marker([event.latitude, event.longitude]);
            marker.bindPopup(`
                <strong>${escapeHtml(event.title)}</strong>
                <br>${escapeHtml(event.venue_name || "Location to be announced")}
                <br>${escapeHtml(formatDate(event.starts_at))}
            `);
            marker.addTo(markerLayer);
        }
        cards.appendChild(renderEvent(event));
    });

    eventList.appendChild(cards);
}

function loadNearbyEvents() {
    eventStatus.textContent = "Showing local events near the map.";
    renderEvents(localEvents);
}

liveEventSearch.addEventListener("submit", async (event) => {
    event.preventDefault();
    const zip = eventZipInput.value.trim();
    const radius = eventDistanceInput.value;
    eventStatus.textContent = "Loading live events…";
    eventList.replaceChildren();

    try {
        if (!window.TICKETMASTER_API_KEY) throw new Error("Ticketmaster search is not configured.");
        const params = new URLSearchParams({
            apikey: window.TICKETMASTER_API_KEY,
            countryCode: "US",
            size: "30",
            sort: radius === "nationwide" ? "date,asc" : "distance,asc",
        });
        if (radius !== "nationwide") {
            params.set("postalCode", zip);
            params.set("radius", radius);
            params.set("unit", "miles");
        }
        const response = await fetch(`https://app.ticketmaster.com/discovery/v2/events.json?${params}`, {
            mode: "cors",
            credentials: "omit",
            cache: "no-store",
            referrerPolicy: "no-referrer",
        });
        const data = await response.json();
        if (!response.ok) throw new Error("Ticketmaster could not load events right now.");
        const liveEvents = (data._embedded?.events || []).map((eventItem) => {
            const venue = eventItem._embedded?.venues?.[0];
            return {
            id: eventItem.id,
            title: eventItem.name,
            starts_at: `${eventItem.dates?.start?.localDate || ""}${eventItem.dates?.start?.localTime ? `T${eventItem.dates.start.localTime}` : ""}`,
            venue_name: [venue?.name, venue?.city?.name, venue?.state?.stateCode].filter(Boolean).join(", "),
            category: eventItem.classifications?.[0]?.segment?.name || "Live event",
            latitude: Number(venue?.location?.latitude),
            longitude: Number(venue?.location?.longitude),
            url: eventItem.url,
            emoji: "🎟️",
        };
        });
        renderEvents(liveEvents);
        const scope = radius === "nationwide" ? "nationwide" : `within ${radius} miles of ${zip}`;
        
        if (currentView !== "pinned") {
            eventStatus.textContent = liveEvents.length ? `${liveEvents.length} live events found ${scope}` : "No live events found in this area.";
        }
    } catch (error) {
        eventStatus.textContent = error.message;
    }
});

loadCustomEvents();
loadNearbyEvents();
