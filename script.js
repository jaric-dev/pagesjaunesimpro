document.addEventListener("DOMContentLoaded", () => {

  // Accordéon mobile
  const filtersToggle = document.getElementById("filters-toggle");
  const filtersContent = document.getElementById("filters-content");

  if (filtersToggle && filtersContent) {
    filtersToggle.addEventListener("click", () => {
      filtersContent.classList.toggle("open");
      filtersToggle.classList.toggle("open");
    });
  }

  // Charger les événements
  fetch("events.json")
    .then(r => r.json())
    .then(data => {
      window.eventsData = data;
      populateFilters();
      selectDay("lundi");
    });

  function populateFilters() {
    const types = new Set();
    const villes = new Set();

    window.eventsData.forEach(ev => {
      types.add(ev.type);
      villes.add(ev.ville);
    });

    // Desktop
    fillSelect(document.getElementById("filter-type"), types);
    fillSelect(document.getElementById("filter-ville"), villes);

    // Mobile
    fillSelect(document.querySelector(".mobile-type"), types);
    fillSelect(document.querySelector(".mobile-ville"), villes);
  }

  function fillSelect(select, values) {
    if (!select) return;
    select.innerHTML = `<option value="">Tous</option>`;
    values.forEach(v => {
      select.innerHTML += `<option value="${v}">${v}</option>`;
    });
  }

  window.selectDay = function(day) {
    const events = window.eventsData.filter(ev => ev.jour === day);
    displayEvents(events);
  };

  function displayEvents(events) {
    const container = document.getElementById("events");
    container.innerHTML = "";

    events.forEach(ev => {
      const card = document.createElement("div");
      card.className = "event-card";

      card.innerHTML = `
        <h3>${ev.titre}</h3>
        <div class="tags">
          <span class="tag ${ev.type}">${ev.type}</span>
          <span class="tag ville">${ev.ville}</span>
        </div>
        <div class="info-box">
          <p><strong>Date :</strong> ${ev.date}</p>
          <p><strong>Heure :</strong> ${ev.heure}</p>
          <p><strong>Lieu :</strong> ${ev.lieu}</p>
          <p><a href="${ev.billet}" target="_blank">Billetterie</a></p>
        </div>
      `;

      container.appendChild(card);
    });
  }
});
