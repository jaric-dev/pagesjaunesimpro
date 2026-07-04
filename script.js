document.addEventListener("DOMContentLoaded", () => {
  // ------------------------------
  // Accordéon mobile
  // ------------------------------
  const filtersToggle = document.getElementById("filters-toggle");
  const filtersContent = document.getElementById("filters-content");
  if (filtersToggle && filtersContent) {
    filtersToggle.addEventListener("click", () => {
      filtersContent.classList.toggle("open");
      filtersToggle.classList.toggle("open");
    });
  }

  // ------------------------------
  // Chargement des données (8 onglets Google Sheets via OpenSheet)
  // ------------------------------
  const SHEET_ID = "1cV5sqtp73WazgB6og_d4aOG4y9HYo3EGePMrBuXAbRs";
  const ONGLETS = {
    lundi: "Impro_Lundi",
    mardi: "Impro_Mardi",
    mercredi: "Impro_Mercredi",
    jeudi: "Impro_Jeudi",
    vendredi: "Impro_Vendredi",
    samedi: "Impro_Samedi",
    dimanche: "Impro_Dimanche",
    ponctuel: "Impro_Ponctuel"
  };

  let currentDay = "lundi";

  const requetes = Object.entries(ONGLETS).map(([jour, onglet]) =>
    fetch(`https://opensheet.elk.sh/${SHEET_ID}/${onglet}`)
      .then(r => r.json())
      .then(rows => rows.map(ev => normalizeEvent(ev, jour)))
      .catch(err => {
        console.error(`Erreur de chargement de l'onglet ${onglet}:`, err);
        return [];
      })
  );

  Promise.all(requetes)
    .then(resultats => {
      window.eventsData = resultats.flat().filter(ev => ev.titre); // ignore lignes vides
      populateFilters();
      wireFilterEvents();
      selectDay("lundi");
    })
    .catch(err => console.error("Erreur de chargement des données:", err));

  // ------------------------------
  // Adaptation des colonnes réelles du Google Sheet vers le format attendu
  // Colonnes du sheet : nom, type, saison, prochain_spectacle, date_debut,
  // date_fin, lieu, adresse, ville, fréquence, heure, billet, instagram,
  // facebook, Site, description, soirs_off, jour (onglet Ponctuel seulement)
  // ------------------------------
  function normalizeEvent(ev, ongletJour) {
    const hors_saison = (ev.prochain_spectacle || "").trim().toLowerCase() === "hors saison";
    const dateStr = hors_saison ? "" : (ev.prochain_spectacle || "").trim();
    return {
      titre: (ev.nom || "").trim(),
      // La colonne "type" peut contenir plusieurs valeurs séparées par une
      // virgule si le champ du formulaire est à cases à cocher (ex: "Spectacle, Jam")
      types: (ev.type || "").split(",").map(t => t.trim()).filter(Boolean),
      ville: (ev.ville || "").trim(),
      date: dateStr,
      dateObj: parseDate(dateStr),
      heure: (ev.heure || "").trim(),
      lieu: (ev.lieu || "").trim(),
      adresse: (ev.adresse || "").trim(),
      // Colonne L : Oui/Non — indique si un billet est requis (ce n'est pas un lien)
      billetRequis: (ev.billet || "").trim(),
      instagram: (ev.instagram || "").trim(),
      facebook: (ev.facebook || "").trim(),
      site: (ev.Site || ev.site || "").trim(),
      logo: (ev.logo || "").trim(),
      description: (ev.description || "").trim(),
      hors_saison: hors_saison,
      // Champs bruts conservés pour pré-remplir le formulaire de mise à jour
      date_debut: (ev.date_debut || "").trim(),
      date_fin: (ev.date_fin || "").trim(),
      frequence: (ev["fréquence"] || "").trim(),
      // La colonne "jour" existe dans l'onglet Impro_Ponctuel ; pour les
      // autres onglets, le jour est déduit du nom de l'onglet.
      jour: (ev.jour || ongletJour || "").trim().toLowerCase()
    };
  }

  // Convertit une date au format "JJ-MM-AAAA" en objet Date (null si invalide)
  function parseDate(str) {
    if (!str) return null;
    const parts = str.split("-");
    if (parts.length !== 3) return null;
    const [jour, mois, annee] = parts.map(p => parseInt(p, 10));
    if (!jour || !mois || !annee) return null;
    const d = new Date(annee, mois - 1, jour);
    return isNaN(d.getTime()) ? null : d;
  }

  // Trie : événements hors saison à la fin, sinon par date croissante
  // (le plus proche d'aujourd'hui en premier)
  function sortEvents(events) {
    return [...events].sort((a, b) => {
      if (a.hors_saison && !b.hors_saison) return 1;
      if (!a.hors_saison && b.hors_saison) return -1;
      if (a.hors_saison && b.hors_saison) return 0;
      if (!a.dateObj && !b.dateObj) return 0;
      if (!a.dateObj) return 1;
      if (!b.dateObj) return -1;
      return a.dateObj - b.dateObj;
    });
  }

  // ------------------------------
  // Construction du lien pré-rempli vers le formulaire de mise à jour
  // ------------------------------
  const FORM_BASE_URL = "https://docs.google.com/forms/d/e/1FAIpQLSfwO7_cgumk2x7Qq-LafFKZOJn6WhrrOafhyWD98qCtaOpi6A/viewform";
  const FORM_ENTRIES = {
    updateOuNouveau: "1798147304",
    nom: "591253351",
    type: "257632126",
    frequence: "812800412",
    datesMultiples: "800161543", // champ "Dates des spectacles" (page 2)
    dateDebut: "234964401",
    dateFin: "1363438021",
    lieu: "1839982334",
    adresse: "408181221",
    ville: "1402047938",
    heure: "98808884",
    billet: "528702374",
    instagram: "959381308",
    facebook: "1083296963",
    site: "631214797",         // à confirmer — voir note dans la réponse
    description: "1847814997", // à confirmer — voir note dans la réponse
    logo: "1963225269"
  };

  // Convertit "JJ-MM-AAAA" en "AAAA-MM-JJ" (format attendu par les champs
  // Date de Google Forms)
  function toISODate(str) {
    if (!str) return "";
    const parts = str.split("-");
    if (parts.length !== 3) return "";
    const [j, m, a] = parts;
    return `${a}-${m.padStart(2, "0")}-${j.padStart(2, "0")}`;
  }

  function addParam(parts, entryKey, value) {
    if (value === undefined || value === null || value === "") return;
    parts.push(`entry.${FORM_ENTRIES[entryKey]}=${encodeURIComponent(value)}`);
  }

  function buildUpdateLink(ev) {
    const parts = [];
    addParam(parts, "updateOuNouveau", "Mise à jour pour un spectacle sur le site");
    addParam(parts, "nom", ev.titre);
    ev.types.forEach(t => parts.push(`entry.${FORM_ENTRIES.type}=${encodeURIComponent(t)}`));
    addParam(parts, "lieu", ev.lieu);
    addParam(parts, "adresse", ev.adresse);
    addParam(parts, "ville", ev.ville);
    addParam(parts, "heure", ev.heure);
    addParam(parts, "billet", ev.billetRequis);
    addParam(parts, "instagram", ev.instagram);
    addParam(parts, "facebook", ev.facebook);
    addParam(parts, "site", ev.site);
    addParam(parts, "description", ev.description);
    addParam(parts, "logo", ev.logo);

    // Un spectacle vient de l'onglet Ponctuel s'il n'a pas de fréquence
    // régulière associée (les onglets par jour ont toujours une fréquence)
    if (!ev.frequence) {
      addParam(parts, "frequence", "Dates multiples");
      // Regroupe toutes les dates du même spectacle (même titre) trouvées
      // dans les données, pour permettre une mise à jour groupée en un clic
      const memeSpectacle = window.eventsData.filter(e => e.titre === ev.titre && !e.frequence);
      const lignes = memeSpectacle
        .filter(e => e.date)
        .map(e => `${e.date} | ${e.lieu} | ${e.adresse}`);
      addParam(parts, "datesMultiples", lignes.join("\n"));
    } else {
      addParam(parts, "frequence", ev.frequence);
      addParam(parts, "dateDebut", toISODate(ev.date_debut));
      addParam(parts, "dateFin", toISODate(ev.date_fin));
    }

    return `${FORM_BASE_URL}?usp=pp_url&${parts.join("&")}`;
  }

  // ------------------------------
  // Filtres
  // ------------------------------
  function populateFilters() {
    const types = new Set();
    const villes = new Set();
    window.eventsData.forEach(ev => {
      ev.types.forEach(t => types.add(t));
      if (ev.ville) villes.add(ev.ville);
    });
    fillSelect(document.getElementById("filter-type"), types, "Type : Tous");
    fillSelect(document.getElementById("filter-ville"), villes, "Ville : Toutes");
    fillSelect(document.querySelector("#filters-mobile select:nth-child(1)"), types, "Type : Tous");
    fillSelect(document.querySelector("#filters-mobile select:nth-child(2)"), villes, "Ville : Toutes");
  }

  function fillSelect(select, values, placeholder) {
    if (!select) return;
    select.innerHTML = `<option value="">${placeholder}</option>`;
    [...values].sort().forEach(v => {
      select.innerHTML += `<option value="${v}">${v}</option>`;
    });
  }

  function wireFilterEvents() {
    const pairs = [
      ["filter-type", ".mobile-type"],
      ["filter-ville", ".mobile-ville"],
      ["filter-hs", ".mobile-hs"]
    ];
    pairs.forEach(([desktopId, mobileSelector]) => {
      const desktopEl = document.getElementById(desktopId);
      const mobileEl = document.querySelector(mobileSelector);
      [desktopEl, mobileEl].forEach(el => {
        if (!el) return;
        el.addEventListener("change", () => {
          // Garde les deux versions (desktop/mobile) synchronisées
          if (desktopEl) desktopEl.value = el.value;
          if (mobileEl) mobileEl.value = el.value;
          selectDay(currentDay);
        });
      });
    });
  }

  // ------------------------------
  // Sélection du jour + affichage
  // ------------------------------
  window.selectDay = function (day) {
    currentDay = day;

    document.querySelectorAll(".day-btn").forEach(btn => {
      btn.classList.toggle("active", btn.dataset.day === day);
    });

    const typeFilter = document.getElementById("filter-type")?.value || "";
    const villeFilter = document.getElementById("filter-ville")?.value || "";
    const hsFilter = document.getElementById("filter-hs")?.value || "";

    let events = window.eventsData.filter(ev => ev.jour === day);

    if (typeFilter) events = events.filter(ev => ev.types.includes(typeFilter));
    if (villeFilter) events = events.filter(ev => ev.ville === villeFilter);
    if (hsFilter === "hide") events = events.filter(ev => !ev.hors_saison);
    if (hsFilter === "only") events = events.filter(ev => ev.hors_saison);

    displayEvents(sortEvents(events));
  };

  function displayEvents(events) {
    const container = document.getElementById("events");
    container.innerHTML = "";

    if (events.length === 0) {
      container.innerHTML = `<p style="text-align:center; width:100%;">Aucun spectacle trouvé pour ce jour avec ces filtres.</p>`;
      return;
    }

    events.forEach(ev => {
      const card = document.createElement("div");
      card.className = "event-card";

      const lieuHtml = ev.adresse
        ? `<a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(ev.adresse)}" target="_blank" rel="noopener">${ev.lieu}</a>`
        : ev.lieu;

      const billetTexte = ev.billetRequis
        ? `<div class="billet-requis">Billet requis : <strong>${ev.billetRequis}</strong></div>`
        : "";

      const liensSociaux = [];
      if (ev.instagram) liensSociaux.push(`<a href="${ev.instagram}" target="_blank" rel="noopener">Instagram</a>`);
      if (ev.facebook) liensSociaux.push(`<a href="${ev.facebook}" target="_blank" rel="noopener">Facebook</a>`);
      if (ev.site) liensSociaux.push(`<a href="${ev.site}" target="_blank" rel="noopener">Site web</a>`);
      const liensSociauxHtml = liensSociaux.length
        ? `<div class="social-links">${liensSociaux.join("")}</div>`
        : "";

      const majLienHtml = `<div class="update-link"><a href="${buildUpdateLink(ev)}" target="_blank" rel="noopener">Mettre à jour</a></div>`;

      const logoHtml = ev.logo
        ? `<div class="event-logo-wrapper"><img src="${ev.logo}" alt="Logo ${ev.titre}" loading="lazy" onerror="this.parentElement.style.display='none'"></div>`
        : "";

      const typeTagsHtml = ev.types.map(t => `<span class="tag ${t}">${t}</span>`).join("");

      card.innerHTML = `
        ${logoHtml}
        <div class="event-card-body">
          <div class="tags">
            ${typeTagsHtml}
            <span class="tag ville">${ev.ville}</span>
          </div>
          ${ev.hors_saison ? `<div class="badges"><span class="badge badge-hors-saison">Hors saison</span></div>` : ""}
          <h3>${ev.titre}</h3>
          <ul class="meta-list">
            <li><span class="icon">📅</span> ${ev.date || "À venir"}</li>
            <li><span class="icon">🕒</span> ${ev.heure}</li>
            <li><span class="icon">📍</span> ${lieuHtml}</li>
          </ul>
          ${billetTexte}
          ${liensSociauxHtml}
          ${majLienHtml}
        </div>
      `;
      container.appendChild(card);
    });
  }
});
