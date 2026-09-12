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
const radiusInput = document.querySelector("#radius");
const radiusValue = document.querySelector("#radius-value");
let selectedCategory = "";

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

function formatDate(value) {
    if (!value) return "Date to be announced";
    return new Date(value).toLocaleString();
}

function renderEvent(event) {
    const card = document.createElement("article");
    card.className = "event-card";
    card.innerHTML = `
        <div class="event-icon">${event.emoji || "📅"}</div>
        <div class="event-info">
        <h3>${escapeHtml(event.title)}</h3>
        <p>${escapeHtml(formatDate(event.starts_at))}</p>
        <p>${escapeHtml(event.venue_name || event.venue_address || "Location to be announced")}</p>
        <p>${escapeHtml(event.category || "Uncategorized")}</p>
        </div>
    `;
    if (map) {
        card.addEventListener("click", () => map.setView([event.latitude, event.longitude], 16));
    }
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
    if (markerLayer) markerLayer.clearLayers();
    eventList.replaceChildren();

    if (events.length === 0) {
        eventStatus.textContent = "No events found in this area.";
        return;
    }

    eventStatus.textContent = `${events.length} event${events.length === 1 ? "" : "s"} found`;
    const cards = document.createDocumentFragment();

    events.forEach((event) => {
        if (markerLayer) {
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
    const filteredEvents = selectedCategory
        ? localEvents.filter((event) => event.category === selectedCategory)
        : localEvents;
    renderEvents(filteredEvents);
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
if (map) map.on("moveend", loadNearbyEvents);

loadNearbyEvents();