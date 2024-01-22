var map; // Global map variable
var isMarkerClickZoom = false; // Global flag
var isResettingView = false; // Global flag
var isMapInitialized = false;
var currentTeam = null;
var currentMarker = null;

document.addEventListener("DOMContentLoaded", function () {
  var openMapButton = document.querySelector(".open-map");

  if (openMapButton) {
    openMapButton.addEventListener("click", function () {
      if (!isMapInitialized) {
        initializeMapAndRelatedProcesses();
        isMapInitialized = true;
      }
    });
  }
});
//
//
//
// Initializes the Mapbox map
function initializeMap() {
  mapboxgl.accessToken =
    "pk.eyJ1IjoiYW5vbml2YXRlIiwiYSI6ImNsb3lxcncwZTA3ZXIybXA4a2p0ejh3OWcifQ.6BLP6s8rlbP0kgHUtSG1iQ";
  map = new mapboxgl.Map({
    container: "map", // ID of the container element
    style: "mapbox://styles/anonivate/cloyr0do8016c01o4gxm45yba", // Map style URL
    center: [-3.288305, 54.277422], // Initial map center coordinates
    zoom: 5.67, // Initial zoom level
  });

  addControls(map);
  setupScrollZoomToggle(map);
  setupResetButton(map);
  setupZoomListener(map);
  return map;
}

// Adds control elements to the map
function addControls(map) {
  //map.addControl(new mapboxgl.NavigationControl());
  map.scrollZoom.disable(); // Disables scroll zoom by default
  map.dragPan.disable(); // Disables the "drag to pan" interaction
}

// Sets up behavior for toggle scroll zoom buttons
function setupScrollZoomToggle(map) {
  var toggleButtons = document.querySelectorAll(".button.toggle-scrollzoom");
  toggleButtons.forEach(function (button) {
    button.addEventListener("click", function () {
      if (map.scrollZoom.isEnabled()) {
        map.scrollZoom.disable();
        map.dragPan.disable();
      } else {
        map.scrollZoom.enable();
        map.dragPan.enable();
      }
      updateButtonText(button, map); // Updates button text based on zoom state
    });
  });
  updateButtonText(toggleButtons[0], map); // Initial button text update
}

// Updates the text of the toggle scroll zoom button
function updateButtonText(button, map) {
  button.textContent = map.scrollZoom.isEnabled()
    ? "Disable Scroll Zoom"
    : "Enable Scroll Zoom";
}

// Sets up behavior for the map reset button
function setupResetButton(map) {
  var resetButtons = document.querySelectorAll(".button.reset");
  resetButtons.forEach(function (button) {
    button.addEventListener("click", function () {
      isResettingView = true; // Sets the resetting flag
      map.flyTo({
        // Animates map to initial position and zoom
        center: [-3.288305, 54.277422],
        zoom: 5.67,
        pitch: 0,
        essential: true,
        speed: 2.5,
        curve: 1,
      });

      map.once("moveend", function () {
        isResettingView = false; // Resets the flag after animation
      });
    });
  });
}

// Sets up a listener for zoom changes to adjust the pitch
function setupZoomListener(map) {
  map.on("zoom", function () {
    if (!isMarkerClickZoom && !isResettingView) {
      const currentZoom = map.getZoom();
      const newPitch = calculatePitch(currentZoom);
      map.setPitch(newPitch);
    }
  });
}

// Calculates the pitch based on the current zoom level
function calculatePitch(zoom) {
  const minZoom = 5.67;
  const maxZoom = 16;
  const minPitch = 0;
  const maxPitch = 60;

  if (zoom < minZoom) return minPitch;
  if (zoom > maxZoom) return maxPitch;

  return ((zoom - minZoom) / (maxZoom - minZoom)) * (maxPitch - minPitch);
}
function initializeMapAndRelatedProcesses() {
  var map = initializeMap(); // Initialize the Mapbox map
  checkCMSLoadComplete(map, processTeams);
  // Delay the reinitialization of the CMS Filter
  setTimeout(() => {
    window.fsAttributes.cmsfilter.init();
    map.resize();
  }, 3000); // Delay
}

// Function to check if CMS Load is complete
function checkCMSLoadComplete(map, processTeamsCallback) {
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
        processTeamsCallback(map);
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
      return null; // No location data found
    }
  } catch (error) {
    console.error("Error fetching location data:", error);
    return null; // Return null in case of error
  }
}

// Function to create markers for each team and update address
async function processTeams(map) {
  const teams = document.querySelectorAll(".team");
  console.log("Processing teams for markers and addresses");

  let markerCount = 0;
  let addressUpdateCount = 0;

  for (const team of teams) {
    const postcodeElement = team.querySelector(".postcode");
    if (!postcodeElement) continue;

    const postcode = postcodeElement.textContent;
    const locationData = await fetchLocationData(postcode);

    if (locationData) {
      createMarker(map, team, locationData);
      updateTeamInfo(team, locationData.placeName);

      // Set latitude and longitude text
      team.querySelector(".latitude").textContent = locationData.lat.toFixed(5); // Limit decimal places for latitude
      team.querySelector(".longitude").textContent =
        locationData.lon.toFixed(5); // Limit decimal places for longitude

      markerCount++;
      addressUpdateCount++;
    } else {
      console.error("Location data not found for team:", team);
    }
  }

  console.log(`Total markers created: ${markerCount}`);
  console.log(`Total addresses updated: ${addressUpdateCount}`);
}

// Function to make team elements clickable
document.querySelectorAll(".team").forEach((team) => {
  team.addEventListener("click", () => {
    const teamSlug = team.getAttribute("data-team-slug");
    const correspondingMarkerEl = document.querySelector(
      `.marker[data-team-slug="${teamSlug}"]`
    );
    if (correspondingMarkerEl) {
      correspondingMarkerEl.click(); // Programmatically click the corresponding marker
    }
  });
});

// Function to create a marker on the map for a team
function createMarker(map, team, locationData) {
  const el = document.createElement("div");
  el.classList.add("marker");
  el.setAttribute("data-team-slug", team.getAttribute("data-team-slug"));

  const marker = new mapboxgl.Marker(el)
    .setLngLat([locationData.lon, locationData.lat])
    .addTo(map);

  const popupInfo = team.querySelector(".popup-info").innerHTML;
  const popup = new mapboxgl.Popup({ offset: 40 }).setHTML(popupInfo);
  marker.setPopup(popup);

  // Store the marker instance in the team element for easy access
  team.markerInstance = marker;

  el.addEventListener("click", () => {
    isMarkerClickZoom = true;
    map.flyTo({
      center: [locationData.lon, locationData.lat],
      zoom: 16,
      pitch: 60,
    });
    map.once("moveend", () => {
      isMarkerClickZoom = false;
      console.log("Moveend event triggered"); // Log when moveend is triggered
    });
  });
}

// Function to update team information with the place name
function updateTeamInfo(team, placeName) {
  const placeParts = placeName.split(", ");
  team.querySelector(".city").textContent = placeParts[1] || "";
  team.querySelector(".county").textContent = placeParts[2] || "";
  team.querySelector(".country").textContent = placeParts[3] || "";
}
