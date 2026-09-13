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
    if (map && Number.isFinite(event.latitude) && Number.isFinite(event.longitude)) {
        card.addEventListener("click", () => map.setView([event.latitude, event.longitude], 16));
    } else if (event.url) {
        card.addEventListener("click", () => window.open(event.url, "_blank", "noopener,noreferrer"));
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
        eventStatus.textContent = liveEvents.length ? `${liveEvents.length} live events found ${scope}` : "No live events found in this area.";
    } catch (error) {
        eventStatus.textContent = error.message;
    }
});

loadNearbyEvents();
