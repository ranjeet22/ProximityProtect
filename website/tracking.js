import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import {
    getFirestore,
    doc,
    setDoc,
    getDoc,
    addDoc,
    collection,
    onSnapshot,
    query,
    orderBy,
    limit,
    serverTimestamp,
    deleteField
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const MAX_ROUTE_POINTS = 25;
const MAX_ALERTS = 20;
const DEFAULT_CENTER = [28.6139, 77.209];
const LOCATION_WRITE_INTERVAL_MS = 8000;
const LOCATION_MIN_DISTANCE_METERS = 15;

const state = {
    map: null,
    geofenceLayer: null,
    routeLine: null,
    childMarker: null,
    pendingLayer: null,
    latestLatLng: null,
    geofences: [],
    routePoints: [],
    alerts: [],
    lastZoneId: null,
    app: null,
    db: null,
    auth: null,
    user: null,
    firebaseReady: false,
    familyCode: "",
    role: null,
    watchId: null,
    isDemoMode: false,
    demoTimer: null,
    lastBackendWriteAt: 0,
    lastBackendWriteLatLng: null,
    unsubFamily: null,
    unsubHistory: null,
    hasReceivedRemoteLocation: false
};

const elements = {
    menuToggle: document.querySelector(".menu-toggle"),
    siteNav: document.querySelector("#site-nav"),
    startDemoMode: document.querySelector("#startDemoMode"),
    backendBadge: document.querySelector("#backendBadge"),
    familyCodeInput: document.querySelector("#familyCodeInput"),
    childNameInput: document.querySelector("#childNameInput"),
    connectParentButton: document.querySelector("#connectParentButton"),
    connectChildButton: document.querySelector("#connectChildButton"),
    trackingState: document.querySelector("#trackingState"),
    trackingSource: document.querySelector("#trackingSource"),
    familyCodeStatus: document.querySelector("#familyCodeStatus"),
    roleStatus: document.querySelector("#roleStatus"),
    heroZoneStatus: document.querySelector("#heroZoneStatus"),
    heroAlertLevel: document.querySelector("#heroAlertLevel"),
    signedInUserLabel: document.querySelector("#signedInUserLabel"),
    sessionBadge: document.querySelector("#sessionBadge"),
    profileAvatar: document.querySelector("#profileAvatar"),
    profileNameLabel: document.querySelector("#profileNameLabel"),
    lastUpdateLabel: document.querySelector("#lastUpdateLabel"),
    currentZoneLabel: document.querySelector("#currentZoneLabel"),
    speedLabel: document.querySelector("#speedLabel"),
    coordsLabel: document.querySelector("#coordsLabel"),
    routeCountLabel: document.querySelector("#routeCountLabel"),
    requestAlertsButton: document.querySelector("#requestAlertsButton"),
    centerMapButton: document.querySelector("#centerMapButton"),
    clearRouteButton: document.querySelector("#clearRouteButton"),
    zoneList: document.querySelector("#zoneList"),
    routeHistory: document.querySelector("#routeHistory"),
    alertFeed: document.querySelector("#alertFeed"),
    mapStatusBadge: document.querySelector("#mapStatusBadge"),
    locationModeBadge: document.querySelector("#locationModeBadge"),
    locationSourceLabel: document.querySelector("#locationSourceLabel"),
    alertCountLabel: document.querySelector("#alertCountLabel"),
    lastBoundaryEventLabel: document.querySelector("#lastBoundaryEventLabel"),
    geofenceModal: document.querySelector("#geofenceModal"),
    geofenceForm: document.querySelector("#geofenceForm"),
    geofenceNameInput: document.querySelector("#geofenceNameInput"),
    geofenceCategoryInput: document.querySelector("#geofenceCategoryInput"),
    closeModalButton: document.querySelector("#closeModalButton"),
    cancelGeofenceButton: document.querySelector("#cancelGeofenceButton"),
    connectionFeedback: document.querySelector("#connectionFeedback"),
    connectionFeedbackText: document.querySelector("#connectionFeedbackText")
};

function getFirebaseConfig() {
    const config = window.PROXIMITY_PROTECT_FIREBASE_CONFIG || window.firebaseConfig;
    if (!config) {
        return null;
    }
    const required = ["apiKey", "authDomain", "projectId", "appId"];
    return required.every((key) => typeof config[key] === "string" && config[key].trim() && !config[key].includes("YOUR_"))
        ? config
        : null;
}

function sanitizeFamilyCode(value) {
    return value.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, "");
}

function formatTimestamp(timestamp) {
    return new Date(timestamp).toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
}

function formatSpeed(speedMetersPerSecond) {
    if (!speedMetersPerSecond || Number.isNaN(speedMetersPerSecond)) {
        return "0 km/h";
    }
    return `${Math.round(speedMetersPerSecond * 3.6)} km/h`;
}

function familyDocRef() {
    return doc(state.db, "families", state.familyCode);
}

function updateTrackingSummary(statusText, sourceText) {
    // elements.trackingState.textContent = statusText;
    elements.trackingState.textContent = "Set up Device Connection";
    // elements.trackingSource.textContent = sourceText;
    elements.trackingSource.textContent = "Connect your child’s device to start tracking";
    elements.locationSourceLabel.textContent = sourceText;
}

function updateSessionStatus(text, tone) {
    elements.sessionBadge.textContent = text;
    elements.sessionBadge.className = `status-pill ${tone || ""}`.trim();
    elements.mapStatusBadge.textContent = text;
    elements.mapStatusBadge.className = `toolbar-pill ${tone || ""}`.trim();
}

function updateZoneStatus(zoneName, tone) {
    elements.currentZoneLabel.textContent = zoneName;
    elements.heroZoneStatus.textContent = zoneName;
    elements.heroAlertLevel.textContent = tone === "alert" ? "Alert" : tone === "warn" ? "Watch" : "Monitoring";
}

function updateChildProfile(childName) {
    const safeName = childName || "Alex Carter";
    elements.profileNameLabel.textContent = safeName;
    // elements.profileAvatar.textContent = safeName.charAt(0).toUpperCase();
    elements.profileAvatar.textContent = "🟢";
}

function addAlert(title, message, tone) {
    const alert = {
        id: `alert-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        title,
        message,
        tone,
        timestamp: Date.now()
    };
    state.alerts.unshift(alert);
    if (state.alerts.length > MAX_ALERTS) {
        state.alerts = state.alerts.slice(0, MAX_ALERTS);
    }
    renderAlerts();
    if ("Notification" in window && Notification.permission === "granted") {
        new Notification(title, { body: message });
    }
}

function refreshDashboard() {
    elements.familyCodeStatus.textContent = state.familyCode || "Not connected";
    elements.roleStatus.textContent = state.role ? `${state.role.charAt(0).toUpperCase()}${state.role.slice(1)} mode` : "Not connected";
    elements.routeCountLabel.textContent = String(state.routePoints.length);
    renderZoneList();
    renderRouteHistory();
    renderAlerts();
}

function setConnectionFeedback(message, tone = "") {
    elements.connectionFeedback.className = `connection-feedback ${tone}`.trim();
    // elements.connectionFeedbackText.textContent = message;
    elements.connectionFeedbackText.textContent = "Enter a family code and choose how this device will be used.";
}

function setButtonState(button, config = {}) {
    if (!button) {
        return;
    }
    button.classList.toggle("is-busy", Boolean(config.busy));
    button.classList.toggle("is-active", Boolean(config.active));
    if (typeof config.label === "string") {
        button.dataset.baseLabel = button.dataset.baseLabel || button.innerHTML;
        button.innerHTML = config.label;
    } else if (button.dataset.baseLabel) {
        button.innerHTML = button.dataset.baseLabel;
    }
}

function renderAlerts() {
    elements.alertCountLabel.textContent = String(state.alerts.length);
    if (state.alerts.length === 0) {
        elements.alertFeed.innerHTML = '<p class="empty-state">Alerts will appear when the child enters or exits a geofence.</p>';
        elements.lastBoundaryEventLabel.textContent = "None";
        return;
    }
    elements.alertFeed.innerHTML = state.alerts.map((alert) => `
        <article class="feed-item ${alert.tone}">
            <div class="feed-item-content">
                <div class="feed-item-header">
                    <h3>${alert.title}</h3>
                    <span class="feed-meta">${formatTimestamp(alert.timestamp)}</span>
                </div>
                <p>${alert.message}</p>
            </div>
        </article>
    `).join("");
    elements.lastBoundaryEventLabel.textContent = state.alerts[0].title;
}

function describeZone(zone) {
    if (zone.shape === "circle") {
        return `Circular boundary with a ${Math.round(zone.radius)}m radius`;
    }
    if (zone.shape === "rectangle") {
        return "Rectangular geofence";
    }
    if (zone.shape === "polygon") {
        const points = Array.isArray(zone.latlngs[0]) ? zone.latlngs[0].length : zone.latlngs.length;
        return `Custom polygon with ${points} points`;
    }
    return "Custom boundary";
}

function renderZoneList() {
    if (state.geofences.length === 0) {
        elements.zoneList.innerHTML = '<p class="empty-state">No geofences yet. Draw one on the map to begin.</p>';
        return;
    }
    elements.zoneList.innerHTML = state.geofences.map((zone) => `
        <article class="zone-item">
            <div class="zone-item-header">
                <div>
                    <h3>${zone.name}</h3>
                    <p class="zone-meta">${zone.category}</p>
                </div>
                <span class="toolbar-pill safe">${zone.shape}</span>
            </div>
            <p class="zone-meta">${describeZone(zone)}</p>
            <div class="zone-actions">
                <button class="zone-delete" type="button" data-zone-id="${zone.id}">
                    <i class="ri-delete-bin-line"></i> Remove
                </button>
            </div>
        </article>
    `).join("");
    elements.zoneList.querySelectorAll("[data-zone-id]").forEach((button) => {
        button.addEventListener("click", async () => {
            await deleteZone(button.getAttribute("data-zone-id"));
        });
    });
}

function renderRouteHistory() {
    if (state.routePoints.length === 0) {
        elements.routeHistory.innerHTML = '<p class="empty-state">Route points will appear here as tracking updates arrive.</p>';
        return;
    }
    elements.routeHistory.innerHTML = state.routePoints.map((point) => `
        <article class="feed-item safe">
            <div class="feed-item-content">
                <div class="feed-item-header">
                    <h3>${point.lat.toFixed(4)}, ${point.lng.toFixed(4)}</h3>
                    <span class="feed-meta">${formatTimestamp(point.timestamp)}</span>
                </div>
                <p>Speed ${formatSpeed(point.speed)} via ${point.sourceLabel}</p>
            </div>
        </article>
    `).join("");
}

function initMenu() {
    if (!elements.menuToggle || !elements.siteNav) {
        return;
    }
    const closeMenu = () => {
        elements.menuToggle.setAttribute("aria-expanded", "false");
        elements.menuToggle.innerHTML = '<i class="ri-menu-line"></i>';
        elements.menuToggle.setAttribute("aria-label", "Open navigation menu");
        elements.siteNav.classList.remove("nav-open");
    };
    elements.menuToggle.addEventListener("click", () => {
        const isOpen = elements.siteNav.classList.toggle("nav-open");
        elements.menuToggle.setAttribute("aria-expanded", String(isOpen));
        elements.menuToggle.innerHTML = isOpen ? '<i class="ri-close-line"></i>' : '<i class="ri-menu-line"></i>';
        elements.menuToggle.setAttribute("aria-label", isOpen ? "Close navigation menu" : "Open navigation menu");
    });
    elements.siteNav.querySelectorAll("a").forEach((link) => link.addEventListener("click", closeMenu));
    window.addEventListener("resize", () => {
        if (window.innerWidth > 560) {
            closeMenu();
        }
    });
}

function styleLayer(layer) {
    if (typeof layer.setStyle === "function") {
        layer.setStyle({
            color: "#4CAF50",
            fillColor: "#4CAF50",
            fillOpacity: 0.15,
            weight: 2
        });
    }
}

function createZoneMeta(name, category) {
    return {
        id: `zone-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name,
        category
    };
}

function getLayerShape(layer) {
    if (layer instanceof L.Circle) {
        return "circle";
    }
    if (layer instanceof L.Rectangle) {
        return "rectangle";
    }
    if (layer instanceof L.Polygon) {
        return "polygon";
    }
    return "shape";
}

function setLayerMeta(layer, meta) {
    layer.safezoneId = meta.id;
    layer.safezoneName = meta.name;
    layer.safezoneCategory = meta.category;
    styleLayer(layer);
    layer.bindPopup(`<strong>${meta.name}</strong><br>${meta.category}`);
}

function serializeLayer(layer) {
    const base = {
        id: layer.safezoneId,
        name: layer.safezoneName,
        category: layer.safezoneCategory,
        shape: getLayerShape(layer)
    };
    if (layer instanceof L.Circle) {
        return { ...base, center: layer.getLatLng(), radius: layer.getRadius() };
    }
    if (layer instanceof L.Rectangle) {
        return {
            ...base,
            bounds: [layer.getBounds().getSouthWest(), layer.getBounds().getNorthEast()]
        };
    }
    if (layer instanceof L.Polygon) {
        return { ...base, latlngs: layer.getLatLngs() };
    }
    return base;
}

function deserializeLayer(zone) {
    let layer;
    if (zone.shape === "circle") {
        layer = L.circle(zone.center, { radius: zone.radius });
    } else if (zone.shape === "rectangle") {
        layer = L.rectangle(zone.bounds);
    } else if (zone.shape === "polygon") {
        layer = L.polygon(zone.latlngs);
    }
    if (!layer) {
        return null;
    }
    setLayerMeta(layer, zone);
    return layer;
}

function syncGeofencesFromMap() {
    const zones = [];
    state.geofenceLayer.eachLayer((layer) => {
        if (!layer.safezoneId) {
            setLayerMeta(layer, createZoneMeta("Unnamed zone", "Safe Zone"));
        }
        zones.push(serializeLayer(layer));
    });
    state.geofences = zones;
}

function renderGeofencesOnMap(geofences) {
    state.geofenceLayer.clearLayers();
    geofences.forEach((zone) => {
        const layer = deserializeLayer(zone);
        if (layer) {
            state.geofenceLayer.addLayer(layer);
        }
    });
    syncGeofencesFromMap();
    refreshDashboard();
    evaluateCurrentPosition({ silent: true });
}

function openGeofenceModal() {
    elements.geofenceModal.classList.remove("hidden");
    elements.geofenceModal.setAttribute("aria-hidden", "false");
    elements.geofenceNameInput.value = "";
    elements.geofenceCategoryInput.value = "Safe Zone";
    window.setTimeout(() => elements.geofenceNameInput.focus(), 50);
}

function closeGeofenceModal() {
    elements.geofenceModal.classList.add("hidden");
    elements.geofenceModal.setAttribute("aria-hidden", "true");
}

function pointInPolygon(latlng, polygonLatLngs) {
    const rings = Array.isArray(polygonLatLngs[0]) ? polygonLatLngs[0] : polygonLatLngs;
    let inside = false;
    for (let i = 0, j = rings.length - 1; i < rings.length; j = i, i += 1) {
        const xi = rings[i].lng;
        const yi = rings[i].lat;
        const xj = rings[j].lng;
        const yj = rings[j].lat;
        const intersects = ((yi > latlng.lat) !== (yj > latlng.lat))
            && (latlng.lng < ((xj - xi) * (latlng.lat - yi)) / ((yj - yi) || Number.EPSILON) + xi);
        if (intersects) {
            inside = !inside;
        }
    }
    return inside;
}

function findContainingZone(latlng) {
    let foundZone = null;
    state.geofenceLayer.eachLayer((layer) => {
        if (foundZone) {
            return;
        }
        let isInside = false;
        if (layer instanceof L.Circle) {
            isInside = state.map.distance(latlng, layer.getLatLng()) <= layer.getRadius();
        } else if (layer instanceof L.Rectangle) {
            isInside = layer.getBounds().contains(latlng);
        } else if (layer instanceof L.Polygon) {
            isInside = pointInPolygon(latlng, layer.getLatLngs());
        }
        if (isInside) {
            foundZone = {
                id: layer.safezoneId,
                name: layer.safezoneName,
                category: layer.safezoneCategory
            };
        }
    });
    return foundZone;
}

function updateMarker(latlng) {
    if (!state.childMarker) {
        const childIcon = L.divIcon({
            className: "child-marker",
            html: '<div style="width:18px;height:18px;border-radius:50%;background:#2196F3;border:4px solid rgba(255,255,255,0.92);box-shadow:0 0 0 10px rgba(33,150,243,0.18);"></div>',
            iconSize: [26, 26],
            iconAnchor: [13, 13]
        });
        state.childMarker = L.marker(latlng, { icon: childIcon }).addTo(state.map);
    } else {
        state.childMarker.setLatLng(latlng);
    }
}

function evaluateCurrentPosition(options = {}) {
    if (!state.latestLatLng) {
        return;
    }
    const currentZone = findContainingZone(state.latestLatLng);
    const zoneName = currentZone ? currentZone.name : "Outside all zones";
    const tone = currentZone ? "safe" : state.geofences.length > 0 ? "alert" : "warn";
    updateZoneStatus(zoneName, tone);
    updateSessionStatus(currentZone ? "Protected" : state.geofences.length > 0 ? "Outside boundary" : "Waiting for geofence", tone);
    const previousZoneId = state.lastZoneId;
    const nextZoneId = currentZone ? currentZone.id : null;
    if (!options.silent && previousZoneId !== nextZoneId) {
        if (currentZone) {
            addAlert(`Entered ${currentZone.name}`, `Child location moved inside the ${currentZone.category.toLowerCase()} boundary.`, "safe");
        } else if (previousZoneId !== null) {
            addAlert("Boundary exit detected", "Child location is currently outside all saved safe zones.", "alert");
        }
    }
    state.lastZoneId = nextZoneId;
}

function updateLocation(latlng, options = {}) {
    const sourceLabel = options.sourceLabel || "Live GPS";
    const speed = options.speed || 0;
    const shouldCenter = options.shouldCenter !== false;
    const timestamp = options.timestamp || Date.now();
    state.latestLatLng = L.latLng(latlng.lat, latlng.lng);
    updateMarker(state.latestLatLng);
    elements.lastUpdateLabel.textContent = `Last update ${formatTimestamp(timestamp)}`;
    elements.coordsLabel.textContent = `${state.latestLatLng.lat.toFixed(5)}, ${state.latestLatLng.lng.toFixed(5)}`;
    elements.speedLabel.textContent = formatSpeed(speed);
    elements.locationModeBadge.textContent = sourceLabel;
    if (shouldCenter) {
        state.map.setView(state.latestLatLng, Math.max(state.map.getZoom(), 15));
    }
    evaluateCurrentPosition(options);
}

function distanceBetween(a, b) {
    if (!a || !b) {
        return Infinity;
    }
    return state.map.distance(a, b);
}

function resetSessionState() {
    state.routePoints = [];
    state.alerts = [];
    state.lastZoneId = null;
    state.lastBackendWriteAt = 0;
    state.lastBackendWriteLatLng = null;
    state.hasReceivedRemoteLocation = false;
    state.routeLine.setLatLngs([]);
    renderRouteHistory();
    renderAlerts();
}

function initMap() {
    state.map = L.map("map", { zoomControl: true }).setView(DEFAULT_CENTER, 13);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap"
    }).addTo(state.map);
    state.geofenceLayer = new L.FeatureGroup();
    state.map.addLayer(state.geofenceLayer);
    state.routeLine = L.polyline([], {
        color: "#2196F3",
        weight: 4,
        opacity: 0.8
    }).addTo(state.map);
    const drawControl = new L.Control.Draw({
        draw: {
            polygon: { allowIntersection: false, shapeOptions: { color: "#4CAF50", fillColor: "#4CAF50", fillOpacity: 0.15 } },
            rectangle: { shapeOptions: { color: "#4CAF50", fillColor: "#4CAF50", fillOpacity: 0.15 } },
            circle: { shapeOptions: { color: "#4CAF50", fillColor: "#4CAF50", fillOpacity: 0.15 } },
            marker: false,
            polyline: false,
            circlemarker: false
        },
        edit: { featureGroup: state.geofenceLayer }
    });
    state.map.addControl(drawControl);
    state.map.on(L.Draw.Event.CREATED, (event) => {
        if (state.role !== "parent" || !state.familyCode || !state.firebaseReady) {
            addAlert("Parent connection required", "Connect as parent before creating geofences.", "warn");
            return;
        }
        state.pendingLayer = event.layer;
        openGeofenceModal();
    });
    state.map.on(L.Draw.Event.EDITED, async () => {
        syncGeofencesFromMap();
        refreshDashboard();
        evaluateCurrentPosition({ silent: true });
        await persistGeofencesToBackend();
    });
    state.map.on(L.Draw.Event.DELETED, async () => {
        syncGeofencesFromMap();
        refreshDashboard();
        evaluateCurrentPosition({ silent: true });
        await persistGeofencesToBackend();
    });
}

async function ensureBackendReady() {
    if (!state.firebaseReady || !state.db || !state.auth) {
        addAlert("Firebase not configured", "Add real Firebase config before using cross-device tracking.", "warn");
        return false;
    }
    if (state.user) {
        return true;
    }
    try {
        await signInAnonymously(state.auth);
        return true;
    } catch (error) {
        updateTrackingSummary("Sign-in failed", `Anonymous sign-in failed: ${error.message}`);
        updateSessionStatus("Backend error", "alert");
        addAlert("Authentication failed", error.message, "alert");
        return false;
    }
}

function clearBackendListeners() {
    if (state.unsubFamily) {
        state.unsubFamily();
        state.unsubFamily = null;
    }
    if (state.unsubHistory) {
        state.unsubHistory();
        state.unsubHistory = null;
    }
}

async function persistGeofencesToBackend() {
    if (!state.firebaseReady || !state.familyCode || state.role !== "parent") {
        return;
    }
    await setDoc(familyDocRef(), {
        geofences: state.geofences,
        updatedAt: serverTimestamp()
    }, { merge: true });
}

async function deleteZone(zoneId) {
    state.geofenceLayer.eachLayer((layer) => {
        if (layer.safezoneId === zoneId) {
            state.geofenceLayer.removeLayer(layer);
        }
    });
    syncGeofencesFromMap();
    refreshDashboard();
    evaluateCurrentPosition({ silent: true });
    await persistGeofencesToBackend();
}

function subscribeToFamily() {
    if (!state.familyCode) {
        return;
    }
    clearBackendListeners();
    state.unsubFamily = onSnapshot(familyDocRef(), (snapshot) => {
        if (!snapshot.exists()) {
            return;
        }
        const data = snapshot.data();
        updateChildProfile(data.childName || elements.childNameInput.value.trim() || "Alex Carter");
        renderGeofencesOnMap(Array.isArray(data.geofences) ? data.geofences : []);
        if (data.latestLocation && typeof data.latestLocation.lat === "number" && typeof data.latestLocation.lng === "number") {
            const shouldStaySilent = state.role === "child" || !state.hasReceivedRemoteLocation;
            updateTrackingSummary(
                state.role === "child" ? "Sharing live GPS" : "Receiving live GPS",
                state.role === "child"
                    ? "Source: This device is publishing to Firebase"
                    : "Source: Child device streamed through Firebase"
            );
            updateLocation(
                { lat: data.latestLocation.lat, lng: data.latestLocation.lng },
                {
                    speed: data.latestLocation.speed || 0,
                    sourceLabel: data.latestLocation.sourceLabel || (state.role === "child" ? "Child live GPS" : "Remote child GPS"),
                    shouldCenter: state.role !== "child",
                    silent: shouldStaySilent,
                    timestamp: data.latestLocation.clientTimestamp || Date.now()
                }
            );
            state.hasReceivedRemoteLocation = true;
        }
    });

    state.unsubHistory = onSnapshot(
        query(collection(state.db, "families", state.familyCode, "history"), orderBy("clientTimestamp", "desc"), limit(MAX_ROUTE_POINTS)),
        (snapshot) => {
            state.routePoints = snapshot.docs.map((docSnap) => {
                const data = docSnap.data();
                return {
                    id: docSnap.id,
                    lat: data.lat,
                    lng: data.lng,
                    speed: data.speed || 0,
                    timestamp: data.clientTimestamp || Date.now(),
                    sourceLabel: data.sourceLabel || "Remote child GPS"
                };
            });
            const orderedPoints = [...state.routePoints].reverse();
            state.routeLine.setLatLngs(orderedPoints.map((point) => [point.lat, point.lng]));
            renderRouteHistory();
            elements.routeCountLabel.textContent = String(orderedPoints.length);
        }
    );
}

async function connectAsParent() {
    const familyCode = sanitizeFamilyCode(elements.familyCodeInput.value);
    if (!familyCode) {
        addAlert("Family code required", "Enter a family code to connect the parent dashboard.", "warn");
        return;
    }
    if (!await ensureBackendReady()) {
        setConnectionFeedback("Firebase is not ready. Check auth and Firestore setup.", "error");
        return;
    }
    setButtonState(elements.connectParentButton, { busy: true, label: '<i class="ri-loader-4-line"></i> Connecting Parent...' });
    try {
        stopDemoMode();
        stopLiveSharing();
        clearBackendListeners();
        resetSessionState();
        state.familyCode = familyCode;
        state.role = "parent";
        elements.familyCodeInput.value = familyCode;
        elements.backendBadge.textContent = "Parent Connected";
        elements.backendBadge.className = "status-pill safe";
        updateTrackingSummary("Parent dashboard connected", `Listening to session ${familyCode}`);
        updateSessionStatus("Listening", "safe");
        const familyRef = familyDocRef();
        const familySnap = await getDoc(familyRef);
        if (!familySnap.exists()) {
            await setDoc(familyRef, {
                familyCode,
                childName: elements.childNameInput.value.trim() || "Alex Carter",
                geofences: [],
                latestLocation: null,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                createdBy: state.user.uid
            });
        }
        subscribeToFamily();
        setConnectionFeedback(`Parent dashboard connected to ${familyCode}. Waiting for child location updates.`, "success");
        setButtonState(elements.connectParentButton, { busy: false, active: true });
        setButtonState(elements.connectChildButton, { active: false });
        refreshDashboard();
    } catch (error) {
        state.familyCode = "";
        state.role = null;
        setConnectionFeedback(`Parent connection failed: ${error.message}`, "error");
        setButtonState(elements.connectParentButton, { busy: false, active: false });
        addAlert("Parent connection failed", error.message, "alert");
        refreshDashboard();
    }
}

async function connectAsChild() {
    const familyCode = sanitizeFamilyCode(elements.familyCodeInput.value);
    const childName = elements.childNameInput.value.trim() || "Alex Carter";
    if (!familyCode) {
        addAlert("Family code required", "Enter the same family code used by the parent dashboard.", "warn");
        return;
    }
    if (!await ensureBackendReady()) {
        setConnectionFeedback("Firebase is not ready. Check auth and Firestore setup.", "error");
        return;
    }
    setButtonState(elements.connectChildButton, { busy: true, label: '<i class="ri-loader-4-line"></i> Starting Child Share...' });
    try {
        stopDemoMode();
        clearBackendListeners();
        resetSessionState();
        state.familyCode = familyCode;
        state.role = "child";
        elements.familyCodeInput.value = familyCode;
        updateChildProfile(childName);
        elements.backendBadge.textContent = "Child Sharing";
        elements.backendBadge.className = "status-pill safe";
        await setDoc(familyDocRef(), {
            familyCode,
            childName,
            updatedAt: serverTimestamp(),
            lastPublisherUid: state.user.uid
        }, { merge: true });
        subscribeToFamily();
        startLiveSharing();
        setConnectionFeedback(`Child device connected to ${familyCode}. Allow location access to start sharing.`, "success");
        setButtonState(elements.connectChildButton, { busy: false, active: true });
        setButtonState(elements.connectParentButton, { active: false });
        refreshDashboard();
    } catch (error) {
        state.familyCode = "";
        state.role = null;
        setConnectionFeedback(`Child connection failed: ${error.message}`, "error");
        setButtonState(elements.connectChildButton, { busy: false, active: false });
        addAlert("Child connection failed", error.message, "alert");
        refreshDashboard();
    }
}

function shouldWriteLocation(latlng) {
    const enoughTime = Date.now() - state.lastBackendWriteAt >= LOCATION_WRITE_INTERVAL_MS;
    const enoughDistance = distanceBetween(state.lastBackendWriteLatLng, latlng) >= LOCATION_MIN_DISTANCE_METERS;
    return state.lastBackendWriteAt === 0 || enoughTime || enoughDistance;
}

async function publishLocation(position) {
    if (!state.firebaseReady || !state.familyCode || state.role !== "child") {
        return;
    }
    const latlng = L.latLng(position.coords.latitude, position.coords.longitude);
    updateLocation(
        { lat: latlng.lat, lng: latlng.lng },
        { speed: position.coords.speed || 0, sourceLabel: "Child live GPS", shouldCenter: true, silent: true }
    );
    if (!shouldWriteLocation(latlng)) {
        return;
    }
    state.lastBackendWriteAt = Date.now();
    state.lastBackendWriteLatLng = latlng;
    const payload = {
        lat: latlng.lat,
        lng: latlng.lng,
        speed: position.coords.speed || 0,
        accuracy: position.coords.accuracy || null,
        sourceLabel: "Remote child GPS",
        clientTimestamp: Date.now()
    };
    await setDoc(familyDocRef(), {
        latestLocation: payload,
        childName: elements.childNameInput.value.trim() || "Alex Carter",
        updatedAt: serverTimestamp(),
        demoMode: deleteField()
    }, { merge: true });
    await addDoc(collection(state.db, "families", state.familyCode, "history"), {
        ...payload,
        createdAt: serverTimestamp()
    });
}

function stopLiveSharing() {
    if (state.watchId !== null && "geolocation" in navigator) {
        navigator.geolocation.clearWatch(state.watchId);
        state.watchId = null;
    }
}

function startLiveSharing() {
    if (!("geolocation" in navigator)) {
        addAlert("Location unavailable", "This browser cannot access geolocation.", "alert");
        setConnectionFeedback("This browser cannot access geolocation on the child device.", "error");
        return;
    }
    stopLiveSharing();
    updateTrackingSummary("Waiting for GPS", "Allow location on the child device to publish updates.");
    updateSessionStatus("Publishing", "warn");
    state.watchId = navigator.geolocation.watchPosition(
        async (position) => {
            try {
                await publishLocation(position);
                updateTrackingSummary("Child device sharing", `Publishing live GPS to ${state.familyCode}`);
                updateSessionStatus("Publishing", "safe");
                setConnectionFeedback(`Child device is sharing live GPS to ${state.familyCode}.`, "success");
            } catch (error) {
                addAlert("Location publish failed", error.message, "alert");
                updateSessionStatus("Publish error", "alert");
                setConnectionFeedback(`Failed to publish child location: ${error.message}`, "error");
            }
        },
        (error) => {
            const message = error.code === error.PERMISSION_DENIED
                ? "Location permission denied on the child device."
                : "Unable to capture GPS from the child device.";
            addAlert("Live sharing stopped", message, "alert");
            updateTrackingSummary("Sharing blocked", message);
            updateSessionStatus("Blocked", "alert");
            setConnectionFeedback(message, "error");
        },
        { enableHighAccuracy: true, maximumAge: 4000, timeout: 12000 }
    );
}

async function startDemoMode() {
    if (!state.familyCode) {
        elements.familyCodeInput.value = sanitizeFamilyCode(elements.familyCodeInput.value || "DEMO-FAMILY");
        elements.childNameInput.value = elements.childNameInput.value.trim() || "Alex Carter";
        await connectAsChild();
        if (state.role !== "child") {
            return;
        }
    } else if (state.role !== "child") {
        addAlert("Switch to child mode", "Demo mode publishes as the child device. Use Share This Device as Child first.", "warn");
        setConnectionFeedback("Switch this device to child mode before starting demo route.", "warn");
        return;
    }
    stopDemoMode();
    stopLiveSharing();
    state.isDemoMode = true;
    const anchor = state.latestLatLng || L.latLng(DEFAULT_CENTER[0], DEFAULT_CENTER[1]);
    const route = [
        [anchor.lat, anchor.lng],
        [anchor.lat + 0.0016, anchor.lng + 0.0014],
        [anchor.lat + 0.0032, anchor.lng + 0.0028],
        [anchor.lat + 0.0055, anchor.lng + 0.0044],
        [anchor.lat + 0.0041, anchor.lng + 0.0068],
        [anchor.lat + 0.0014, anchor.lng + 0.0079],
        [anchor.lat - 0.0007, anchor.lng + 0.0052]
    ];
    let index = 0;
    updateTrackingSummary("Demo mode active", `Publishing simulated child movement to ${state.familyCode}`);
    updateSessionStatus("Demo mode", "warn");
    setConnectionFeedback(`Demo route is publishing through family code ${state.familyCode}.`, "warn");
    state.demoTimer = window.setInterval(async () => {
        const nextPoint = route[index % route.length];
        index += 1;
        const fakePosition = {
            coords: {
                latitude: nextPoint[0],
                longitude: nextPoint[1],
                speed: 2.6,
                accuracy: 8
            }
        };
        try {
            await publishLocation(fakePosition);
        } catch (error) {
            addAlert("Demo publish failed", error.message, "alert");
            setConnectionFeedback(`Demo route failed: ${error.message}`, "error");
            stopDemoMode();
        }
    }, 3500);
}

function stopDemoMode() {
    if (state.demoTimer) {
        window.clearInterval(state.demoTimer);
        state.demoTimer = null;
    }
    state.isDemoMode = false;
}

function centerMapOnChild() {
    if (state.latestLatLng) {
        state.map.setView(state.latestLatLng, 16);
    }
}

function clearRouteView() {
    state.routePoints = [];
    state.routeLine.setLatLngs([]);
    renderRouteHistory();
    elements.routeCountLabel.textContent = "0";
}

function requestNotificationPermission() {
    if (!("Notification" in window)) {
        addAlert("Notifications unsupported", "This browser does not support browser notifications.", "warn");
        return;
    }
    Notification.requestPermission().then((permission) => {
        if (permission === "granted") {
            addAlert("Alerts enabled", "Browser notifications are now enabled for boundary events.", "safe");
        } else {
            addAlert("Alerts not enabled", "Browser notifications remain disabled. In-app alerts still work.", "warn");
        }
    });
}

function wireEvents() {
    elements.startDemoMode.addEventListener("click", () => {
        startDemoMode();
    });
    elements.connectParentButton.addEventListener("click", () => {
        connectAsParent();
    });
    elements.connectChildButton.addEventListener("click", () => {
        connectAsChild();
    });
    elements.requestAlertsButton.addEventListener("click", requestNotificationPermission);
    elements.centerMapButton.addEventListener("click", centerMapOnChild);
    elements.clearRouteButton.addEventListener("click", clearRouteView);
    elements.geofenceForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        if (!state.pendingLayer) {
            closeGeofenceModal();
            return;
        }
        const meta = createZoneMeta(
            elements.geofenceNameInput.value.trim() || "Unnamed zone",
            elements.geofenceCategoryInput.value.trim() || "Safe Zone"
        );
        setLayerMeta(state.pendingLayer, meta);
        state.geofenceLayer.addLayer(state.pendingLayer);
        state.pendingLayer = null;
        closeGeofenceModal();
        syncGeofencesFromMap();
        refreshDashboard();
        evaluateCurrentPosition({ silent: true });
        await persistGeofencesToBackend();
    });
    elements.closeModalButton.addEventListener("click", () => {
        state.pendingLayer = null;
        closeGeofenceModal();
    });
    elements.cancelGeofenceButton.addEventListener("click", () => {
        state.pendingLayer = null;
        closeGeofenceModal();
    });
    elements.geofenceModal.addEventListener("click", (event) => {
        if (event.target === elements.geofenceModal) {
            state.pendingLayer = null;
            closeGeofenceModal();
        }
    });
}

function initFirebase() {
    const firebaseConfig = getFirebaseConfig();
    if (!firebaseConfig) {
        elements.backendBadge.textContent = "Setup Required";
        elements.backendBadge.className = "status-pill warn";
        updateTrackingSummary("Backend not configured", "Add Firebase config to turn on cross-device tracking.");
        updateSessionStatus("Setup required", "warn");
        setConnectionFeedback("Firebase config is missing or invalid. Add it, then reload the page.", "error");
        return;
    }
    state.app = initializeApp(firebaseConfig);
    state.auth = getAuth(state.app);
    state.db = getFirestore(state.app);
    state.firebaseReady = true;
    elements.backendBadge.textContent = "Backend Ready";
    elements.backendBadge.className = "status-pill safe";
    updateTrackingSummary("Backend ready", "Firebase is configured. Connect devices to start syncing.");
    setConnectionFeedback("Firebase is ready. Enter a family code and choose parent or child mode.", "success");
    onAuthStateChanged(state.auth, (user) => {
        state.user = user || null;
        // elements.signedInUserLabel.textContent = user ? user.uid : "Not signed in";
        elements.signedInUserLabel.textContent = user ? "Connected" : "Not signed in";
    });
}

function init() {
    initMenu();
    initMap();
    wireEvents();
    initFirebase();
    refreshDashboard();
}

init();
