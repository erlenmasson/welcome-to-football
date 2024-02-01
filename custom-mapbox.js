var map; // Holds the Mapbox map instance.

var zoomLevel; // Initial zoom level for the map.
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

console.log("Script v24 Erlen currently testing");

// Resets the map to its initial state.
function resetMap(showSidebarAfterReset = false) {
  if (map) {
    console.log("resetMap function called");
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
}

// Clears all active filters.
function clearAllFilters() {
  console.log("clearAllFilters function called");
  var clearAllButton = document.querySelector(".clear-all");
  if (clearAllButton) {
    clearAllButton.click();
    console.log("Clear all button clicked");
  }
}

// Applies the filter for WSL Teams.
function applyWSLTeamsFilter() {
  var clearAllButton = document.querySelector(".clear-all");
  if (clearAllButton) {
    clearAllButton.click();
  }

  var wslToggleLabel = document.querySelector(".wsl-label");
  if (wslToggleLabel) {
    wslToggleLabel.click();
  }

  var filterApplyButton = document.querySelector(".filter-apply");
  if (filterApplyButton) {
    filterApplyButton.click();
  }
  console.log("Applied WSL Teams Filter");
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
  zoomLevel = window.innerWidth < 768 ? 4 : 5.23;

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
        console.log("Applying WSL Teams Filter");
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
      console.log(`Team info closed for team slug: ${teamSlug}`);
    });
  });
}

// Initializes the Mapbox map instance.
function initializeMap() {
  mapboxgl.accessToken =
    "pk.eyJ1IjoiYW5vbml2YXRlIiwiYSI6ImNsb3lxcncwZTA3ZXIybXA4a2p0ejh3OWcifQ.6BLP6s8rlbP0kgHUtSG1iQ";

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

  return map;
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

// Initializes the map and related processes.
function initializeMapAndRelatedProcesses() {
  var map = initializeMap(); // Initialize the Mapbox map
  adjustMapPadding();
  checkCMSLoadComplete(map, processTeams);
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

        window.fsAttributes.cmsfilter.init(); // Add CMS Filter
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

// Function to fetch location data (latitude, longitude, place_name) using Mapbox Geocoding API
async function fetchLocationData(postcode) {
  const countryCode = "GB"; // Country code for the United Kingdom
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${postcode}.json?country=${countryCode}&access_token=pk.eyJ1IjoiYW5vbml2YXRlIiwiYSI6ImNsb3lxcncwZTA3ZXIybXA4a2p0ejh3OWcifQ.6BLP6s8rlbP0kgHUtSG1iQ`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data && data.features && data.features.length > 0) {
      const feature = data.features[0];
      return {
        lat: feature.center[1],
        lon: feature.center[0],
        placeName: feature.place_name,
      };
    } else {
      console.error(`No location data found for postcode: ${postcode}`);
      return null;
    }
  } catch (error) {
    console.error("Error fetching location data:", error);
    return null;
  }
}

// Processes team data to create markers and update team information.
async function processTeams(map) {
  const teams = document.querySelectorAll(".team");
  let processedCount = 0;

  for (const team of teams) {
    const postcodeElement = team.querySelector(".postcode");
    if (!postcodeElement) continue;

    const postcode = postcodeElement.textContent;
    const locationData = await fetchLocationData(postcode);

    if (locationData) {
      createMarker(map, team, locationData);
      updateTeamInfo(team, locationData.placeName);

      team.querySelector(".latitude").textContent = locationData.lat.toFixed(5);
      team.querySelector(".longitude").textContent =
        locationData.lon.toFixed(5);

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
        document.querySelector(".feed-loader").classList.add("teams-loaded");
      }
    } else {
      console.error("Location data not found for team:", team);
    }
  }

  console.log(`Total markers created: ${processedCount}`);
  console.log(`Total addresses updated: ${processedCount}`);
}

// Initializes filters for CMS content.
function initializeCMSFilter() {
  window.fsAttributes.cmsfilter.init();
  console.log("CMS Filter Initialised after updating all team info.");
}

// Creates a marker for a team on the map.
function createMarker(map, team, locationData) {
  const el = document.createElement("div");
  el.classList.add("marker");
  el.setAttribute("data-team-slug", team.getAttribute("data-team-slug"));

  const marker = new mapboxgl.Marker(el)
    .setLngLat([locationData.lon, locationData.lat])
    .addTo(map);

  // Event listener for marker click
  el.addEventListener("click", () => {
    isMarkerClickZoom = true;
    console.log(
      "Marker clicked for team:",
      team.getAttribute("data-team-slug")
    );

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
      console.log("Moveend event triggered");
    });
  });

  team.markerInstance = marker;
}

// Updates team information with data from the location.
function updateTeamInfo(team, placeName) {
  const placeParts = placeName.split(", ");
  team.querySelector(".city").textContent = placeParts[1] || "";
  team.querySelector(".county").textContent = placeParts[2] || "";
  team.querySelector(".country").textContent = placeParts[3] || "";
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
