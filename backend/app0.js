/*
 * Minimal UI-to-backend map integration.
 *
 * Data ownership:
 *   - Leaflet: interactive map and marker display.
 *   - OpenStreetMap: background map tiles.
 *   - FastAPI: event JSON and nearby filtering.
 *   - PostgreSQL: event records queried by FastAPI.
 *
 * UI CONNECTION POINT:
 *   Change API_BASE_URL when the backend is deployed.
 *   Add the Auth0 token to apiFetch() when protected endpoints are connected.
 */

const API_BASE_URL = "http://localhost:8000";
const DEFAULT_CENTER = [40.7128, -74.0060]; // Replace with the desired initial location.
const DEFAULT_ZOOM = 13;

const map = L.map("map").setView(DEFAULT_CENTER, DEFAULT_ZOOM);
const markerLayer = L.layerGroup().addTo(map);

// OpenStreetMap supplies the base geographic tiles. Attribution is required.
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

const eventList = document.querySelector("#event-list");
const eventStatus = document.querySelector("#event-status");
const radiusInput = document.querySelector("#radius");
const radiusValue = document.querySelector("#radius-value");
let selectedCategory = "";
let requestInProgress = false;

async function apiFetch(path) {
    // UI CONNECTION POINT:
    // When an Auth0 access token is available, add:
    //   headers: { Authorization: `Bearer ${token}` }
    const response = await fetch(`${API_BASE_URL}${path}`);
    if (!response.ok) {
        throw new Error(`Backend returned HTTP ${response.status}`);
    }
    return response.json();
}

function formatDate(value) {
    if (!value) return "Date to be announced";
    return new Date(value).toLocaleString();
}

function renderEvent(event) {
    const card = document.createElement("article");
    card.className = "event-card";
    card.innerHTML = `
        <h3>${escapeHtml(event.title)}</h3>
        <p>${escapeHtml(formatDate(event.starts_at))}</p>
        <p>${escapeHtml(event.venue_name || event.venue_address || "Location to be announced")}</p>
        <p>${escapeHtml(event.category || "Uncategorized")}</p>
    `;
    card.addEventListener("click", () => map.setView([event.latitude, event.longitude], 16));
    return card;
}

function escapeHtml(value) {
    // Event data comes from the API, so escape it before inserting into HTML.
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function renderEvents(events) {
    markerLayer.clearLayers();
    eventList.replaceChildren();

    if (events.length === 0) {
        eventStatus.textContent = "No events found in this area.";
        return;
    }

    eventStatus.textContent = `${events.length} event${events.length === 1 ? "" : "s"} found`;
    const cards = document.createDocumentFragment();

    events.forEach((event) => {
        const marker = L.marker([event.latitude, event.longitude]);
        marker.bindPopup(`
            <strong>${escapeHtml(event.title)}</strong>
            <br>${escapeHtml(event.venue_name || "Location to be announced")}
            <br>${escapeHtml(formatDate(event.starts_at))}
        `);
        marker.addTo(markerLayer);
        cards.appendChild(renderEvent(event));
    });

    eventList.appendChild(cards);
}

async function loadNearbyEvents() {
    if (requestInProgress) return;
    requestInProgress = true;
    eventStatus.textContent = "Loading events...";

    const center = map.getCenter();
    const params = new URLSearchParams({
        latitude: center.lat.toString(),
        longitude: center.lng.toString(),
        radius_km: radiusInput.value
    });

    try {
        const events = await apiFetch(`/api/events/nearby?${params}`);
        const filteredEvents = selectedCategory
            ? events.filter((event) => event.category === selectedCategory)
            : events;
        renderEvents(filteredEvents);
    } catch (error) {
        eventStatus.textContent = "Could not load events. Is the FastAPI server running?";
        console.error(error);
    } finally {
        requestInProgress = false;
    }
}

document.querySelectorAll("[data-category]").forEach((button) => {
    button.addEventListener("click", () => {
        selectedCategory = button.dataset.category;
        document.querySelectorAll("[data-category]").forEach((item) => item.classList.remove("filter-active"));
        button.classList.add("filter-active");
        loadNearbyEvents();
    });
});

radiusInput.addEventListener("input", () => {
    radiusValue.textContent = radiusInput.value;
});
radiusInput.addEventListener("change", loadNearbyEvents);

// Reload event pins after the user pans or zooms the map.
map.on("moveend", loadNearbyEvents);

loadNearbyEvents();