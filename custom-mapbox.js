/**
 * Script Purpose: Interactive Map for Grassroots Football Teams
 * Author: Erlen Masson
 * Version: 29.1
 * Last Updated: 4th Feb 2024
 */

var map; // Holds the Mapbox map instance.
var mapModal = document.getElementById("map_modal"); // Modal element for the map.
var isMarkerClickZoom = false; // Indicates if zooming is triggered by marker click.
var isResettingView = false; // Flag to indicate when the map view is being reset.
var isMapInitialized = false; // Flag to indicate if the map has been initialized.
var isTouchZooming = false; // Flag to indicate touch-based zooming.
var currentTeam = null; // Currently selected team.
var currentMarker = null; // Marker for the current team.
var applyWSLFilter = false; // Flag to apply the WSL teams filter.
var isCMSLoadComplete = false; // Indicates if CMS content loading is complete.
var isCMSFilterInitialized = false; // Indicates if CMS filters are initialized.
var locationData = [];
var clusterZoom = window.innerWidth < 768 ? 7 : 6;
var zoomLevel = window.innerWidth < 768 ? 4 : 5.2;

console.log("Script v29 | Adding Clusters");

// Resets the map to its initial state.
function resetMap(showSidebarAfterReset = false) {
  if (map) {
    isResettingView = true;
    deselectTeam(); // Deselect any selected team when resetting the map
    map.flyTo({
      center: [-3.288305, 54.277422],
      zoom: zoomLevel,
      pitch: 0,
      essential: true,
      speed: 2.5,
      curve: 1,
    });
    map.once("moveend", function () {
      isResettingView = false;
      console.log("resetMap completed");
      if (showSidebarAfterReset) {
        manageSidebar("show");
      }
      adjustMapPadding();
    });
  } else {
    console.log("Map not initialized. Unable to reset.");
  }
  showTeamCapacity(); // Show team capacity when the map is reset
}

// Clears all active filters.
function clearAllFilters() {
  console.log("clearAllFilters function called");
  var clearAllButton = document.querySelector(".clear-all");
  if (clearAllButton) {
    clearAllButton.click();
    console.log("Clear all button clicked");
  }
  showTeamCapacity(); // Show team capacity when all filters are cleared
}

function showTeamCapacity() {
  const teamCapacity = document.querySelector(".team-capacity");
  if (teamCapacity) teamCapacity.classList.remove("hide");
}

function hideTeamCapacity() {
  const teamCapacity = document.querySelector(".team-capacity");
  if (teamCapacity) teamCapacity.classList.add("hide");
}

document.querySelector(".filter-apply").addEventListener("click", function () {
  // Delay checking for the fs-cmsfilter_active class to ensure it's updated after the filter application
  setTimeout(() => {
    const wslFilterActive = document
      .querySelector(".wsl-label")
      .classList.contains("fs-cmsfilter_active");
    if (wslFilterActive) {
      hideTeamCapacity(); // If WSL filter is active, hide team capacity
    } else {
      showTeamCapacity(); // Otherwise, show team capacity
    }
  }, 100); // Adjust timeout as needed based on filter application speed
});

function applyWSLTeamsFilter() {
  var clearAllButton = document.querySelector(".clear-all");
  if (clearAllButton) {
    clearAllButton.click();
  }

  var wslToggleLabel = document.querySelector(".wsl-label");
  if (wslToggleLabel) {
    wslToggleLabel.click();
    hideTeamCapacity(); // Hide team capacity when WSL filter is applied
  }

  var filterApplyButton = document.querySelector(".filter-apply");
  if (filterApplyButton) {
    filterApplyButton.click();
  }
  console.log("WSL Filter Applied");
}

// Manages the visibility and state of the sidebar.
function manageSidebar(action) {
  var sidebar = document.querySelector(".map-filter");
  var toggleButton = document.getElementById("toggle-sidebar");

  // Exit if sidebar or button not found
  if (!sidebar || !toggleButton) {
    console.log("Sidebar or Toggle Button not found");
    return;
  }

  switch (action) {
    case "show":
      sidebar.classList.remove("filter-hidden");
      toggleButton.classList.remove("is-closed");
      break;
    case "hide":
      sidebar.classList.add("filter-hidden");
      toggleButton.classList.add("is-closed");
      break;
    case "toggle":
      sidebar.classList.toggle("filter-hidden");
      toggleButton.classList.toggle("is-closed");
      break;
    default:
      console.log("Invalid action for manageSidebar function");
  }
  adjustMapPadding();
}

// Event listener for DOMContentLoaded to initialize map-related processes.
document.addEventListener("DOMContentLoaded", function () {
  document.querySelectorAll(".open-map").forEach(function (button) {
    button.addEventListener("click", function () {
      if (!isMapInitialized) {
        console.log("Initializing Map");
        initializeMapAndRelatedProcesses();
        isMapInitialized = true;
      } else {
        console.log(
          "Map already initialized. Resetting Map and Clearing Filters"
        );
        clearAllFilters();
        resetMap(true);
      }

      setTimeout(resizeMap, 500); // Resize map after a short delay

      if (
        button.classList.contains("show-wsl-teams") &&
        isCMSLoadComplete &&
        isCMSFilterInitialized
      ) {
        // Apply WSL Teams Filter for .show-wsl-teams buttons
        applyWSLTeamsFilter();
      }
    });
  });

  // Add the event listener for the .button.reset
  document.querySelectorAll(".button.reset").forEach(function (button) {
    button.addEventListener("click", function () {
      resetMap();
    });
  });

  document
    .querySelectorAll('[fs-cmsfilter-element="tag-text"]')
    .forEach(function (element) {
      element.addEventListener("click", function () {
        if (this.textContent.trim() === "WSL") {
          console.log("WSL tag clicked, showing team capacity.");
          showTeamCapacity();
        }
      });
    });
});

function openTeamInfo(teamSlug) {
  // Deselect any currently selected team
  deselectTeam();

  // Close any currently open team info
  document.querySelectorAll(".team-info.active-modal").forEach((modal) => {
    modal.classList.remove("active-modal");
  });

  // Open the selected team info based on teamSlug and select the team
  const selectedTeam = document.querySelector(
    `.team[data-team-slug="${teamSlug}"]`
  );
  if (selectedTeam) {
    selectedTeam.classList.add("selected"); // Add 'selected' class to the team
    const selectedTeamInfo = selectedTeam.querySelector(".team-info");
    if (selectedTeamInfo) {
      selectedTeamInfo.classList.add("active-modal");
      console.log(`Team info opened for team slug: ${teamSlug}`);
    }
  }
}

function closeTeamInfo(teamSlug) {
  const selectedTeam = document.querySelector(
    `.team[data-team-slug="${teamSlug}"]`
  );
  if (selectedTeam) {
    selectedTeam.classList.remove("selected"); // Remove 'selected' class from the team
    const selectedTeamInfo = selectedTeam.querySelector(".team-info");
    if (selectedTeamInfo) {
      selectedTeamInfo.classList.remove("active-modal");
      console.log(`Team info closed for team slug: ${teamSlug}`);
    }
  }
}

function toggleTeamInfo(teamSlug) {
  const teamInfo = document.querySelector(
    `.team[data-team-slug="${teamSlug}"] .team-info`
  );
  if (teamInfo && teamInfo.classList.contains("active-modal")) {
    closeTeamInfo(teamSlug);
  } else {
    openTeamInfo(teamSlug);
  }
}

function setupTeamInfo() {
  // Event listener for opening team info
  document.querySelectorAll(".team-info-links .open-info").forEach((button) => {
    button.addEventListener("click", (event) => {
      const team = event.target.closest(".team");
      const teamSlug = team.getAttribute("data-team-slug");
      openTeamInfo(teamSlug);
      selectTeam(teamSlug); // Add this line to select the team and marker
      console.log(`Team info opened for team slug: ${teamSlug}`);
    });
  });

  // Event listener for closing team info
  document.querySelectorAll(".team-info .is-close").forEach((button) => {
    button.addEventListener("click", (event) => {
      const teamSlug = event.target
        .closest(".team")
        .getAttribute("data-team-slug");
      closeTeamInfo(teamSlug);
    });
  });
}

// Initializes the Mapbox map instance.
function initializeMap() {
  mapboxgl.accessToken =
    "pk.eyJ1IjoiYW5vbml2YXRlIiwiYSI6ImNsczRtN3FvcjEzNDYybG1rM2Z5MDZ5MnMifQ.ytdzRNB4lLtvXnjV-_AyTg";

  map = new mapboxgl.Map({
    container: "map", // ID of the container element
    style: "mapbox://styles/anonivate/cloyr0do8016c01o4gxm45yba", // Map style URL
    center: [-3.288305, 54.277422], // Initial map center coordinates
    zoom: zoomLevel, // Use the determined zoom level
  });

  map.on("touchstart", function () {
    isTouchZooming = true;
  });
  map.on("touchend", function () {
    isTouchZooming = false;
  });

  addControls(map);
  setupScrollZoomToggle(map);
  setupZoomListener(map);
  window.addEventListener("resize", function () {
    resizeMap();
    adjustMapPadding(); // Ensure this is called after resizeMap()
  });

  // Attach the setMarkerVisibility function to the zoom event
  map.on("zoom", setMarkerVisibility);

  return map;
}

// Initializes the map and related processes.
function initializeMapAndRelatedProcesses() {
  var map = initializeMap(); // Initialize the Mapbox map
  adjustMapPadding();

  map.on("load", function () {
    checkCMSLoadComplete(map, processTeams);
  });
}

function setMarkerVisibility() {
  var currentZoom = map.getZoom();
  document.querySelectorAll(".marker").forEach(function (markerElement) {
    if (currentZoom >= clusterZoom) {
      markerElement.classList.remove("hide"); // Show the marker
    } else {
      markerElement.classList.add("hide"); // Hide the marker
    }
  });
}

function addClusters() {
  var geoJsonData = {
    type: "FeatureCollection",
    features: locationData.map(function (location) {
      return {
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [location.lon, location.lat],
        },
      };
    }),
  };

  map.addSource("teams", {
    type: "geojson",
    data: geoJsonData,
    cluster: true,
    clusterMaxZoom: clusterZoom - 1,
    clusterRadius: 50,
  });

  map.addLayer({
    id: "clusters",
    type: "circle",
    source: "teams",
    filter: ["has", "point_count"],
    paint: {
      "circle-color": [
        "step",
        ["get", "point_count"],
        "#FCF5E3",
        10,
        "#FCF5E3",
        50,
        "#FCF5E3",
      ],
      "circle-radius": [
        "step",
        ["get", "point_count"],
        20,
        2,
        25,
        10,
        30,
        20,
        35,
      ],
    },
  });

  map.addLayer({
    id: "cluster-count",
    type: "symbol",
    source: "teams",
    filter: ["has", "point_count"],
    layout: {
      "text-field": "{point_count_abbreviated}",
      "text-font": ["Arial Unicode MS Bold"],
      "text-size": 12,
    },
    paint: {
      "text-color": "#000000",
    },
  });

  // Call the function to handle cluster clicks and cursor updates
  clusterClick();
}

function clusterClick() {
  // Make clusters clickable to zoom in
  map.on("click", "clusters", function (e) {
    var features = map.queryRenderedFeatures(e.point, { layers: ["clusters"] });
    if (!features.length) return;

    var clusterId = features[0].properties.cluster_id;
    map
      .getSource("teams")
      .getClusterExpansionZoom(clusterId, function (err, zoom) {
        if (err) return;

        isMarkerClickZoom = true; // Set the flag to true before starting the zoom

        map.flyTo({
          center: features[0].geometry.coordinates,
          zoom: zoom + 2, // Optionally add more zoom to get closer to the cluster center
          speed: 0.8,
          essential: true,
        });

        // Reset the flag after the map has finished moving
        map.once("moveend", () => {
          isMarkerClickZoom = false;
        });
      });
  });

  // Change cursor to pointer when hovering over clusters
  map.on("mouseenter", "clusters", function () {
    map.getCanvas().style.cursor = "pointer";
  });
  map.on("mouseleave", "clusters", function () {
    map.getCanvas().style.cursor = "";
  });

  // Detect zoom on touch devices
  map.on("touchstart", function () {
    isTouchZooming = true;
  });
  map.on("touchend", function () {
    isTouchZooming = false;
  });
}

// Adjusts the map padding to accommodate the sidebar.
function adjustMapPadding() {
  if (!map) {
    console.log("Map object is not initialized.");
    return;
  }

  var baseFontSize = 16; // Base font size in pixels
  var filterWidthRem = 30; // Width of the filter in rem
  var filterWidthPx = filterWidthRem * baseFontSize; // Convert rem to pixels

  var mapFilter = document.querySelector(".map-filter");
  var padding = {};

  if (isFilterVisible()) {
    if (window.innerWidth >= 768) {
      // Desktop view
      padding = { left: filterWidthPx };
    } else {
      // Tablet and mobile view - Adjust to match 50vh
      var halfViewportHeight = window.innerHeight / 2;
      padding = { bottom: halfViewportHeight };
    }
  } else {
    padding = { left: 0, bottom: 0 };
  }

  map.easeTo({
    padding: padding,
    duration: 1000, // Duration of the transition
  });
}

// Checks if the sidebar filter is currently visible.
function isFilterVisible() {
  var mapFilter = document.querySelector(".map-filter");
  return !mapFilter.classList.contains("filter-hidden");
}

document
  .getElementById("toggle-sidebar")
  .addEventListener("click", function () {
    manageSidebar("toggle");
  });

// Adds essential control elements to the map.
function addControls(map) {
  map.scrollZoom.enable(); // Disables scroll zoom by default
  map.dragPan.enable(); // Disables the "drag to pan" interaction
  map.touchZoomRotate.enable();
}

// Sets up the behavior for the scroll zoom toggle button.
function setupScrollZoomToggle(map) {
  var toggleButtons = document.querySelectorAll(".button.toggle-scrollzoom");
  toggleButtons.forEach(function (button) {
    button.addEventListener("click", function () {
      if (map.scrollZoom.isEnabled()) {
        map.scrollZoom.disable();
        map.dragPan.disable();
        map.touchZoomRotate.disable();
      } else {
        map.scrollZoom.enable();
        map.dragPan.enable();
        map.touchZoomRotate.enable();
      }
      updateButtonText(button, map);
    });
  });
  updateButtonText(toggleButtons[0], map);
}

// Updates the text of the toggle scroll zoom button based on the current state.
function updateButtonText(button, map) {
  const textSpan = button.querySelector(".toggle-text");
  if (textSpan) {
    textSpan.textContent = map.scrollZoom.isEnabled()
      ? "Disable Scroll Zoom"
      : "Enable Scroll Zoom";
  }
}

// Sets up a listener to adjust the map's pitch based on zoom level changes.
function setupZoomListener(map) {
  map.on("zoom", function () {
    if (!isMarkerClickZoom && !isResettingView && !isTouchZooming) {
      const currentZoom = map.getZoom();
      const newPitch = calculatePitch(currentZoom);
      map.setPitch(newPitch);
    }
  });
}

// Calculates the pitch for the map based on the current zoom level.
function calculatePitch(zoom) {
  const minZoom = 5.23;
  const maxZoom = 16;
  const minPitch = 0;
  const maxPitch = 60;

  if (zoom < minZoom) return minPitch;
  if (zoom > maxZoom) return maxPitch;

  return ((zoom - minZoom) / (maxZoom - minZoom)) * (maxPitch - minPitch);
}

// Triggers map resize to fit the container.
function resizeMap() {
  if (map && mapModal.style.display !== "none") {
    console.log("Resizing map..."); // This logs when resizing
    map.resize();
  } else {
    console.log("Map not resized: map is not visible or not initialized."); // This logs when not resizing
  }
}

// Checks if the CMS Load is complete.
function checkCMSLoadComplete(map, processTeamsCallback) {
  console.log("checkCMSLoadComplete function called");
  const checkInterval = setInterval(() => {
    const loadedItems = document.querySelectorAll(".team");
    const expectedItemsCountElement = document.querySelector(
      ".total-cms-items-count"
    );

    if (expectedItemsCountElement) {
      const expectedItemsCount = parseInt(
        expectedItemsCountElement.textContent,
        10
      );

      if (loadedItems.length >= expectedItemsCount) {
        clearInterval(checkInterval);
        console.log(
          "All items loaded. Processing teams for markers and addresses."
        );
        isCMSLoadComplete = true; // Set flag to indicate CMS Load is complete
        processTeamsCallback(map);

        // Initialize team info interactions after CMS content is fully loaded
        setupTeamInfo(); // Updated to reflect new function name and consolidated logic

        isCMSFilterInitialized = true; // Set flag to indicate CMS Filter is initialized

        // Check if WSL filter needs to be applied
        if (applyWSLFilter) {
          applyWSLTeamsFilter();
        }
      } else {
        console.log(
          "Waiting for more items to load: Loaded -",
          loadedItems.length,
          "Expected -",
          expectedItemsCount
        );
      }
    }
  }, 1000); // Check every second
}

// Processes team data to create markers and update team information.
async function processTeams(map) {
  const teams = document.querySelectorAll(".team");
  const data = document.querySelectorAll(".data-att");
  let processedCount = 0;

  for (var i = 0; i < data.length; i++) {
    locationData.push({
      postcode: data[i].dataset.postcode,
      lat: Number(data[i].dataset.lat),
      lon: Number(data[i].dataset.lng),
      placeName: data[i].dataset.team,
    });
  }

  for (const team of teams) {
    const postcodeElement = team.querySelector(".postcode");
    if (!postcodeElement) continue;

    if (locationData) {
      createMarker(map, team, locationData[processedCount]);
      // updateTeamInfo(team, locationData[processedCount].placeName);

      team.querySelector(".latitude").textContent =
        locationData[processedCount].lat.toFixed(5);
      team.querySelector(".longitude").textContent =
        locationData[processedCount].lon.toFixed(5);

      processedCount++;
      if (processedCount === teams.length) {
        initializeCMSFilter(); // Call to initialize the CMS Filter
        // Attach event listeners to .flyto-marker elements
        document.querySelectorAll(".team .flyto-marker").forEach((marker) => {
          marker.addEventListener("click", () => {
            const team = marker.closest(".team");
            const teamSlug = team.getAttribute("data-team-slug");
            const correspondingMarkerEl = document.querySelector(
              `.marker[data-team-slug="${teamSlug}"]`
            );
            if (correspondingMarkerEl) {
              correspondingMarkerEl.click();
            }
          });
        });
      }
    } else {
      console.error("Location data not found for team:", team);
    }
  }

  console.log(`Total markers created: ${processedCount}`);
  console.log(`Total addresses updated: ${processedCount}`);

  const expectedItemCount = locationData.length;

  if (locationData.length === expectedItemCount) {
    // Ensure this comparison is meaningful
    console.log("All teams processed, adding clusters.");
    addClusters(); // Directly call addClusters here
    document.querySelector(".feed-loader").classList.add("teams-loaded");
  }
}

// Initializes filters for CMS content.
function initializeCMSFilter() {
  window.fsAttributes.cmsfilter.init();
  console.log("CMS Filter Initialised after updating all team info.");
}

// Creates a marker for a team on the map.
function createMarker(map, team, locationData) {
  const el = document.createElement("div");
  el.className = "marker";
  el.setAttribute("data-team-slug", team.dataset.teamSlug); // Ensure your team elements have a data-team-slug attribute

  //console.log(locationData.lon, locationData.lat, locationData.placeName, "passed to marker" );

  // Create a marker and assign it to a variable
  const marker = new mapboxgl.Marker(el)
    .setLngLat([locationData.lon, locationData.lat])
    .addTo(map);

  el.addEventListener("click", () => {
    isMarkerClickZoom = true;

    const teamSlug = team.getAttribute("data-team-slug");
    openTeamInfo(teamSlug); // Keep this to open the team info
    selectTeam(teamSlug); // Add this line to select the team and marker

    map.flyTo({
      center: [locationData.lon, locationData.lat],
      zoom: 16,
      pitch: 60,
    });
    map.once("moveend", () => {
      isMarkerClickZoom = false;
    });
  });

  setMarkerVisibility(); // Call this if markers are added dynamically post-initial load
  team.markerInstance = marker;
}

// Throttles calls to adjustMapPadding during window resize events.
let resizeThrottleTimer;
function throttleAdjustMapPadding() {
  clearTimeout(resizeThrottleTimer);
  resizeThrottleTimer = setTimeout(function () {
    adjustMapPadding();
  }, 1000); // Throttling interval
}

function selectTeam(teamSlug) {
  // Remove selected state from all teams and markers
  document
    .querySelectorAll(".team.selected, .marker.selected")
    .forEach((element) => {
      element.classList.remove("selected");
    });

  // Apply selected state to the clicked team and marker
  const selectedTeam = document.querySelector(
    `.team[data-team-slug="${teamSlug}"]`
  );
  const selectedMarker = document.querySelector(
    `.marker[data-team-slug="${teamSlug}"]`
  );

  if (selectedTeam && selectedMarker) {
    selectedTeam.classList.add("selected");
    selectedMarker.classList.add("selected");
    console.log(`Team and marker selected: ${teamSlug}`);
  } else {
    console.log(`Team or marker with slug '${teamSlug}' not found.`);
  }
}

function deselectTeam() {
  // Find the currently selected team and marker
  const currentlySelectedTeam = document.querySelector(".team.selected");
  const currentlySelectedMarker = document.querySelector(".marker.selected");

  if (currentlySelectedTeam) {
    currentlySelectedTeam.classList.remove("selected");
    const teamInfo = currentlySelectedTeam.querySelector(".team-info");
    if (teamInfo) {
      teamInfo.classList.remove("active-modal");
    }
  }

  if (currentlySelectedMarker) {
    currentlySelectedMarker.classList.remove("selected");
  }
}

// Event listener for window resize to manage map resizing and padding adjustment.
window.addEventListener("resize", function () {
  resizeMap();
  throttleAdjustMapPadding();
});
