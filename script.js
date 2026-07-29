document.addEventListener("DOMContentLoaded", () => {
  // ------------------------------
  // Bouton "+ Ajouter un événement" — formulaire vierge, avec seulement
  // "Nouveau spectacle à ajouter" pré-sélectionné
  // ------------------------------
  const addEventBtn = document.getElementById("add-event-btn");
  if (addEventBtn) {
    // Nouveau formulaire de soumission (Spectacle / Audition / Festival) —
    // laissé vierge : la personne choisit elle-même son type de contenu
    // en Section 1, plutôt qu'un choix pré-sélectionné pour elle.
    addEventBtn.href = "https://docs.google.com/forms/d/e/1FAIpQLSfmMSS9osdJOvm4btrBbKjPtSMPwjlddoEYU5LSlnxMkKjw3g/viewform";
  }

  // ------------------------------
  // Lightbox — clic sur un logo pour le voir en plein écran
  // ------------------------------
  const lightbox = document.getElementById("lightbox");
  const lightboxImg = document.getElementById("lightbox-img");
  const lightboxClose = document.querySelector(".lightbox-close");
  const eventsContainer = document.getElementById("events");

  function ouvrirLightbox(src, alt) {
    lightboxImg.src = src;
    lightboxImg.alt = alt || "";
    lightbox.classList.add("open");
  }

  function fermerLightbox() {
    lightbox.classList.remove("open");
    lightboxImg.src = "";
  }

  if (eventsContainer) {
    eventsContainer.addEventListener("click", (e) => {
      const img = e.target.closest(".event-logo-wrapper img");
      if (img) ouvrirLightbox(img.src, img.alt);
    });
  }

  if (lightboxClose) lightboxClose.addEventListener("click", fermerLightbox);
  if (lightbox) {
    lightbox.addEventListener("click", (e) => {
      if (e.target === lightbox) fermerLightbox();
    });
  }
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") fermerLightbox();
  });

  // ------------------------------
  // Sélection du jour + plage de dates — les deux se combinent, ne
  // s'excluent plus. "tous" affiche tous les jours de la semaine.
  // ------------------------------
  let currentDay = "lundi";

  const filterDateStart = document.getElementById("filter-date-start");
  const filterDateEnd = document.getElementById("filter-date-end");

  // Pré-remplit "Du" avec la date d'aujourd'hui, au même format JJ-MM-AAAA
  // utilisé partout ailleurs sur le site
  if (filterDateStart) {
    const aujourdhui = new Date();
    const jj = String(aujourdhui.getDate()).padStart(2, "0");
    const mm = String(aujourdhui.getMonth() + 1).padStart(2, "0");
    const aaaa = aujourdhui.getFullYear();
    filterDateStart.value = `${jj}-${mm}-${aaaa}`;
  }

  if (filterDateStart) filterDateStart.addEventListener("change", rafraichirAffichage);
  if (filterDateEnd) filterDateEnd.addEventListener("change", rafraichirAffichage);

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

  const requetes = Object.entries(ONGLETS).map(([jour, onglet]) =>
    fetch(`https://opensheet.elk.sh/${SHEET_ID}/${onglet}`)
      .then(r => r.json())
      .then(rows => rows.map(ev => normalizeEvent(ev, jour)))
      .catch(err => {
        console.error(`Erreur de chargement de l'onglet ${onglet}:`, err);
        return [];
      })
  );

  const requeteFestivals = fetch(`https://opensheet.elk.sh/${SHEET_ID}/Festivals_Tournois`)
    .then(r => r.json())
    .then(rows => rows.map(normalizeFestival))
    .catch(err => {
      console.error("Erreur de chargement de l'onglet Festivals_Tournois:", err);
      return [];
    });

  Promise.all(requetes)
    .then(resultats => {
      window.eventsData = resultats.flat()
        .filter(ev => ev.titre) // ignore lignes vides
        .filter(ev => ev.masquer.toLowerCase() !== "oui"); // ignore lignes masquées
      populateFilters();
      wireFilterEvents();
      afficherStats();
      rafraichirAffichage();
    })
    .catch(err => console.error("Erreur de chargement des données:", err));

  requeteFestivals.then(festivals => {
    window.festivalsData = festivals.filter(f => f.nom);
    if (currentDay === "festivals") rafraichirAffichage();
  });

  // Compte les spectacles distincts (par nom) et les villes distinctes
  // représentées, tous jours et toute saison confondus (pas juste ce qui
  // est affiché à l'écran présentement)
  function afficherStats() {
    const statsEl = document.getElementById("site-stats");
    if (!statsEl || !window.eventsData) return;

    const spectaclesUniques = new Set(window.eventsData.map(ev => ev.titre));
    const villesUniques = new Set(window.eventsData.map(ev => ev.ville).filter(Boolean));

    statsEl.innerHTML = `
      <div class="stat-item"><strong>${spectaclesUniques.size}</strong> spectacles annoncés</div>
      <div class="stat-item"><strong>${villesUniques.size}</strong> villes représentées</div>
    `;
  }

  // ------------------------------
  // Adaptation des colonnes réelles du Google Sheet vers le format attendu
  // ------------------------------
 function normalizeEvent(ev, ongletJour) {
    const hors_saison = (ev.prochain_spectacle || "").trim().toLowerCase() === "hors saison";
    const dateStr = hors_saison ? "" : (ev.prochain_spectacle || "").trim();
    return {
      titre: (ev.nom || "").trim(),
      types: (ev.type || "").split(",").map(t => t.trim()).filter(Boolean),
      ville: (ev.ville || "").trim(),
      date: dateStr,
      dateObj: parseDate(dateStr),
      heure: (ev.heure || "").trim(),
      lieu: (ev.lieu || "").trim(),
      adresse: (ev.adresse || "").trim(),
      billetRequis: (ev.billet || "").trim(),
      prix: (ev.prix || "").trim(),
      instagram: (ev.instagram || "").trim(),
      facebook: (ev.facebook || "").trim(),
      site: (ev.Site || ev.site || "").trim(),
      linktree: (ev.linktree || "").trim(),
      logo: (ev.logo || "").trim(),
      description: (ev.description || "").trim(),
      hors_saison: hors_saison,
      date_debut: (ev.date_debut || "").trim(),
      date_fin: (ev.date_fin || "").trim(),
      frequence: (ev["fréquence"] || "").trim(),
      jour: (ev.jour || ongletJour || "").trim().toLowerCase(),
      source: ongletJour,
      masquer: (ev.masquer || "").trim(),
      langue: (ev.langue || "").trim(),
      dateLimiteInscriptionStr: (ev.date_limite_inscription || "").trim(),
      auditionPublique: (ev.audition_publique || "").trim(),
      // Pour les spectacles Ponctuel : les 10 colonnes date_spectacle1 à
      // date_spectacle10 contiennent toutes les dates connues de ce
      // spectacle (une seule ligne, plusieurs dates), utilisées pour
      // pré-remplir le formulaire de mise à jour au complet.
      datesMultiplesRaw: Array.from({ length: 10 }, (_, i) => (ev[`date_spectacle${i + 1}`] || "").trim()).filter(Boolean),
      // Optionnel : si rempli, indique que ce spectacle fait partie de la
      // programmation d'un festival (colonne "festival" dans le Sheet)
      festival: (ev.festival || "").trim()
    };
  }

  // ------------------------------
  // Adaptation des données de l'onglet Festivals_Tournois — structure
  // volontairement distincte des spectacles réguliers (plage de dates
  // plutôt qu'un jour unique, date limite d'inscription optionnelle)
  // ------------------------------
  function normalizeFestival(ev) {
    const dateDebutStr = (ev.date_debut || "").trim();
    const dateFinStr = (ev.date_fin || "").trim();
    const dateLimiteStr = (ev.date_limite_inscription || "").trim();
    return {
      nom: (ev.nom || "").trim(),
      description: (ev.description || "").trim(),
      type: (ev.type || "").trim(),
      dateDebutStr,
      dateFinStr,
      dateDebutObj: parseDate(dateDebutStr),
      dateFinObj: parseDate(dateFinStr),
      dateLimiteStr,
      dateLimiteObj: parseDate(dateLimiteStr),
      ville: (ev.ville || "").trim(),
      instagram: (ev.instagram || "").trim(),
      facebook: (ev.facebook || "").trim(),
      site: (ev.site || ev.Site || "").trim(),
      linktree: (ev.linktree || "").trim(),
      logo: (ev.logo || "").trim()
    };
  }

  function parseDate(str) {
    if (!str) return null;
    // Tolère "-" ou "/" comme séparateur (ex: 21-07-2026 ou 21/07/2026)
    // — filet de sécurité contre les fautes de frappe dans le Sheet,
    // qui ne devraient plus faire disparaître un événement silencieusement.
    const parts = str.split(/[-/]/);
    if (parts.length !== 3) return null;
    const [jour, mois, annee] = parts.map(p => parseInt(p, 10));
    if (!jour || !mois || !annee) return null;
    const d = new Date(annee, mois - 1, jour);
    return isNaN(d.getTime()) ? null : d;
  }

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
  const UPDATE_FORM_BASE_URL = "https://docs.google.com/forms/d/e/1FAIpQLSeeG383L2VpTt35NXd0jXH4AvrzhJ96qmkB5olkguPDPA4kzg/viewform";

  // Section "Spectacles et Ligues" du formulaire de mise à jour
  const UPDATE_ENTRIES_SPECTACLE = {
    typeContenu: "630150997", // valeur attendue : "Spectacles et Ligues"
    nom: "1747047438",
    type: "1447261349",
    description: "1367352150",
    frequence: "1589486784",
    dateDebut: "1986354405",
    dateFin: "775060780",
    datesMultiples: "1984819215",
    lieu: "1649261882",
    adresse: "1328673551",
    ville: "1074437143",
    heure: "1777107234",
    billet: "1782382116",
    prix: "987619274",
    instagram: "357239419",
    facebook: "1532376572",
    site: "841564403",
    linktree: "7399501",
    logo: "1504614778"
  };

  // Section "Festivals et Tournois" du formulaire de mise à jour
  const UPDATE_ENTRIES_FESTIVAL = {
    typeContenu: "630150997", // valeur attendue : "Festivals et Tournois" (à confirmer)
    nom: "1383275963",
    type: "486472793",
    description: "555071293",
    dateDebut: "488876264",
    dateFin: "212893064",
    dateLimiteInscription: "1809196406",
    ville: "729949662",
    instagram: "1489298568",
    facebook: "76020231",
    site: "712098918",
    linktree: "4334897",
    logo: "829401794"
  };
// Section "Audition" du formulaire de mise à jour
  const UPDATE_ENTRIES_AUDITION = {
    typeContenu: "630150997", // valeur attendue : "Audition"
    nom: "1902398208",
    description: "59675833",
    dateHeure: "1978334466", // champ combiné Date + heure
    lieu: "723146400",
    adresse: "1663893641",
    dateLimiteInscription: "381550761",
    auditionPublique: "1810270296",
    billet: "1802660762",
    prix: "1262326523",
    instagram: "1930296824",
    facebook: "1510341920",
    site: "714323841",
    linktree: "262686603",
    logo: "1209060793"
  };

  function estAudition(ev) {
    return ev.types.some(t => t.toLowerCase() === "audition");
  }

  function buildAuditionUpdateLink(ev) {
    const parts = [];
    const E = UPDATE_ENTRIES_AUDITION;
    const addParam = (key, val) => addParamTo(E, parts, key, val);

    addParam("typeContenu", "Audition");
    addParam("nom", ev.titre);
    addParam("description", ev.description);
    if (ev.date_debut) {
      addParam("dateHeure", `${toISODate(ev.date_debut)} ${ev.heure || ""}`.trim());
    }
    addParam("lieu", ev.lieu);
    addParam("adresse", ev.adresse);
    addParam("dateLimiteInscription", toISODate(ev.dateLimiteInscriptionStr));
    addParam("auditionPublique", ev.auditionPublique);
    addParam("billet", ev.billetRequis);
    addParam("prix", ev.prix);
    addParam("instagram", ev.instagram);
    addParam("facebook", ev.facebook);
    addParam("site", ev.site);
    addParam("logo", ev.logo);

    return `${UPDATE_FORM_BASE_URL}?usp=pp_url&${parts.join("&")}`;
  }
  function tronquerTexte(texte, max) {
    if (!texte || texte.length <= max) return texte;
    const coupe = texte.slice(0, max);
    const dernierEspace = coupe.lastIndexOf(" ");
    const propre = dernierEspace > 0 ? coupe.slice(0, dernierEspace) : coupe;
    return propre.trim() + "…";
  }

  function toISODate(str) {
    if (!str) return "";
    const parts = str.split(/[-/]/);
    if (parts.length !== 3) return "";
    const [j, m, a] = parts;
    return `${a}-${m.padStart(2, "0")}-${j.padStart(2, "0")}`;
  }

  function addParamTo(entries, parts, entryKey, value) {
    if (value === undefined || value === null || value === "") return;
    parts.push(`entry.${entries[entryKey]}=${encodeURIComponent(value)}`);
  }

  function buildUpdateLink(ev) {
    const parts = [];
    const E = UPDATE_ENTRIES_SPECTACLE;
    const addParam = (key, val) => addParamTo(E, parts, key, val);

    addParam("typeContenu", "Spectacles et Ligues");
    addParam("nom", ev.titre);
    ev.types.forEach(t => parts.push(`entry.${E.type}=${encodeURIComponent(t)}`));
    addParam("description", ev.description);
    addParam("lieu", ev.lieu);
    addParam("adresse", ev.adresse);
    addParam("ville", ev.ville);
    addParam("heure", ev.heure);
    addParam("billet", ev.billetRequis);
    addParam("prix", ev.prix);
    addParam("instagram", ev.instagram);
    addParam("facebook", ev.facebook);
    addParam("site", ev.site);
    addParam("logo", ev.logo);

    const estIrregulier = ev.frequence.toLowerCase() === "ponctuel" || (ev.source === "ponctuel" && !ev.frequence);

    if (estIrregulier) {
      addParam("frequence", "Irrégulier/Dates multiples");
      // Toutes les dates de ce spectacle vivent dans la même ligne
      // (colonnes date_spectacle1 à date_spectacle9) — on les prend
      // directement, plus besoin de chercher ailleurs dans les données.
      const dates = ev.datesMultiplesRaw.length ? ev.datesMultiplesRaw : (ev.date ? [ev.date] : []);
      const lignes = dates.map(d => `${d} | ${ev.heure} | ${ev.lieu} | ${ev.adresse}`);
      addParam("datesMultiples", lignes.join("\n"));
    } else {
      addParam("frequence", ev.frequence);
      addParam("dateDebut", toISODate(ev.date_debut));
      addParam("dateFin", toISODate(ev.date_fin));
    }

    return `${UPDATE_FORM_BASE_URL}?usp=pp_url&${parts.join("&")}`;
  }

  function buildFestivalUpdateLink(f) {
    const parts = [];
    const E = UPDATE_ENTRIES_FESTIVAL;
    const addParam = (key, val) => addParamTo(E, parts, key, val);

    addParam("typeContenu", "Festivals et Tournois");
    addParam("nom", f.nom);
    addParam("type", f.type);
    addParam("description", f.description);
    addParam("dateDebut", toISODate(f.dateDebutStr));
    addParam("dateFin", toISODate(f.dateFinStr));
    addParam("dateLimiteInscription", toISODate(f.dateLimiteStr));
    addParam("ville", f.ville);
    addParam("instagram", f.instagram);
    addParam("facebook", f.facebook);
    addParam("site", f.site);
    addParam("logo", f.logo);

    return `${UPDATE_FORM_BASE_URL}?usp=pp_url&${parts.join("&")}`;
  }

  // ------------------------------
  // Filtres (type / ville / hors-saison) — un seul jeu de contrôles,
  // partagé par les deux modes d'affichage
  // ------------------------------
  function populateFilters() {
    const types = new Set();
    const villes = new Set();
    const langues = new Set();
    window.eventsData.forEach(ev => {
      ev.types.forEach(t => types.add(t));
      if (ev.ville) villes.add(ev.ville);
      if (ev.langue) langues.add(ev.langue);
    });
    fillSelect(document.getElementById("filter-type"), types, "Type : Tous");
    fillSelect(document.getElementById("filter-ville"), villes, "Ville : Toutes");
    fillSelect(document.getElementById("filter-langue"), langues, "Langue : Toutes");
  }

  function fillSelect(select, values, placeholder) {
    if (!select) return;
    select.innerHTML = `<option value="">${placeholder}</option>`;
    [...values].sort().forEach(v => {
      select.innerHTML += `<option value="${v}">${v}</option>`;
    });
  }

  function wireFilterEvents() {
    ["filter-type", "filter-ville", "filter-langue", "filter-hs"].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener("change", rafraichirAffichage);
    });
  }

  // Applique les filtres communs (type / ville / hors-saison) à un
  // ensemble d'événements déjà pré-filtré (par jour ou par plage de dates)
 function appliquerFiltresCommuns(events) {
    const typeFilter = document.getElementById("filter-type")?.value || "";
    const villeFilter = document.getElementById("filter-ville")?.value || "";
    const langueFilter = document.getElementById("filter-langue")?.value || "";
    const hsFilter = document.getElementById("filter-hs")?.value || "";

    let resultat = events;
    if (typeFilter) resultat = resultat.filter(ev => ev.types.includes(typeFilter));
    if (villeFilter) resultat = resultat.filter(ev => ev.ville === villeFilter);
    if (langueFilter) resultat = resultat.filter(ev => ev.langue === langueFilter);
    if (hsFilter === "hide") resultat = resultat.filter(ev => !ev.hors_saison);
    if (hsFilter === "only") resultat = resultat.filter(ev => ev.hors_saison);
    return resultat;
  }

  // ------------------------------
  // Rendu principal — s'adapte au mode courant (jour ou plage de dates)
  // ------------------------------
  // ------------------------------
  // Rendu principal — combine jour (ou "tous") ET plage de dates,
  // en plus des filtres communs (type / ville / hors-saison)
  // ------------------------------
  function rafraichirAffichage() {
    if (!window.eventsData) return;

    const typeGroup = document.getElementById("type-filter-group");
    const hsGroup = document.getElementById("hs-filter-group");
    const langueGroup = document.getElementById("langue-filter-group");

    if (currentDay === "festivals") {
      // Les filtres Type, Langue et Hors saison ne s'appliquent pas aux
      // festivals/tournois (concepts différents) — on les masque, mais on
      // garde Ville et la plage de dates, qui restent pertinents.
      if (typeGroup) typeGroup.hidden = true;
      if (hsGroup) hsGroup.hidden = true;
      if (langueGroup) langueGroup.hidden = true;
      afficherFestivals();
      return;
    }

    if (typeGroup) typeGroup.hidden = false;
    if (hsGroup) hsGroup.hidden = false;
    if (langueGroup) langueGroup.hidden = false;
    let base = currentDay === "tous"
      ? window.eventsData
      : window.eventsData.filter(ev => ev.jour === currentDay);

    // Règle de base non contournable : un événement à date connue et
    // révolue ne s'affiche plus jamais, peu importe ce que contiennent les
    // champs "Du"/"Au" — même si un visiteur les vide manuellement.
    //
    // Exception : les spectacles à fréquence VRAIMENT récurrente
    // (Hebdomadaire / Bi-Mensuel / Mensuel) qui sont hors saison restent
    // affichés avec le badge "Hors saison" — c'est une info utile (la
    // ligue existe, reviendra plus tard). Mais un spectacle "Unique" ou
    // "Ponctuel" devenu hors saison, lui, ne reviendra jamais : il doit
    // disparaître complètement, pas juste être tagué hors saison.
    const FREQUENCES_RECURRENTES = ["hebdomadaire", "bi-mensuel", "mensuel"];
    const minuitAujourdhui = new Date();
    minuitAujourdhui.setHours(0, 0, 0, 0);
    base = base.filter(ev => {
      if (ev.hors_saison) {
        return FREQUENCES_RECURRENTES.includes(ev.frequence.toLowerCase());
      }
      if (!ev.dateObj) return true; // date illisible : on ne masque pas par prudence
      return ev.dateObj >= minuitAujourdhui;
    });

    const debut = parseDate((filterDateStart?.value || "").trim());
    const fin = parseDate((filterDateEnd?.value || "").trim());

    if (debut || fin) {
      // Les hors saison n'ont pas de date connue et restent gérés
      // uniquement par leur propre filtre ("Hors saison"), jamais par la
      // plage de dates — sinon ils disparaîtraient silencieusement dès
      // que "Du" contient une valeur par défaut (aujourd'hui).
      base = base.filter(ev => {
        if (ev.hors_saison) return true;
        if (!ev.dateObj) return false;
        if (debut && ev.dateObj < debut) return false;
        if (fin && ev.dateObj > fin) return false;
        return true;
      });
    }

    displayEvents(sortEvents(appliquerFiltresCommuns(base)));
  }

  window.selectDay = function (day) {
    currentDay = day;
    document.querySelectorAll(".day-btn").forEach(btn => {
      btn.classList.toggle("active", btn.dataset.day === day);
    });
    rafraichirAffichage();
  };

  const JOURS_LABELS = {
    lundi: "Lundi", mardi: "Mardi", mercredi: "Mercredi", jeudi: "Jeudi",
    vendredi: "Vendredi", samedi: "Samedi", dimanche: "Dimanche"
  };

  // ------------------------------
  // Affichage du mode Festivals & Tournois
  // ------------------------------
  function afficherFestivals() {
    if (!window.festivalsData) {
      // Les données festivals arrivent en parallèle et peuvent ne pas
      // encore être chargées au moment où on clique sur l'onglet
      document.getElementById("events").innerHTML =
        `<p style="text-align:center; width:100%;">Chargement...</p>`;
      return;
    }

    const villeFilter = document.getElementById("filter-ville")?.value || "";
    const debut = parseDate((filterDateStart?.value || "").trim());
    const fin = parseDate((filterDateEnd?.value || "").trim());

    let events = window.festivalsData;

    if (villeFilter) events = events.filter(f => f.ville === villeFilter);

    if (debut || fin) {
      // Un festival "chevauche" la plage si sa fin n'est pas avant le
      // début de la plage, et son début n'est pas après la fin de la plage
      events = events.filter(f => {
        if (!f.dateDebutObj) return false;
        const finFestival = f.dateFinObj || f.dateDebutObj;
        if (fin && f.dateDebutObj > fin) return false;
        if (debut && finFestival < debut) return false;
        return true;
      });
    }

    events = [...events].sort((a, b) => {
      if (!a.dateDebutObj) return 1;
      if (!b.dateDebutObj) return -1;
      return a.dateDebutObj - b.dateDebutObj;
    });

    displayFestivals(events);
  }

  function displayFestivals(festivals) {
    const container = document.getElementById("events");
    container.innerHTML = "";

    if (festivals.length === 0) {
      container.innerHTML = `<p style="text-align:center; width:100%;">Aucun festival ou tournoi trouvé avec ces filtres.</p>`;
      return;
    }

    festivals.forEach(f => {
      const card = document.createElement("div");
      card.className = "event-card festival-card";

      const logoHtml = f.logo
        ? `<div class="event-logo-wrapper"><img src="${f.logo}" alt="Logo ${f.nom}" loading="lazy" onerror="this.parentElement.style.display='none'"></div>`
        : "";

      const plageDates = f.dateFinStr && f.dateFinStr !== f.dateDebutStr
        ? `${f.dateDebutStr} au ${f.dateFinStr}`
        : f.dateDebutStr;

      const deadlineHtml = f.dateLimiteStr
        ? `<div class="festival-deadline">📌 Date limite d'inscription : <strong>${f.dateLimiteStr}</strong></div>`
        : "";

      const descriptionHtml = f.description
        ? `<p class="event-description">${tronquerTexte(f.description, 150)}</p>`
        : "";

      const liensSociaux = [];
      if (f.instagram) liensSociaux.push(`<a href="${f.instagram}" target="_blank" rel="noopener">Instagram</a>`);
      if (f.facebook) liensSociaux.push(`<a href="${f.facebook}" target="_blank" rel="noopener">Facebook</a>`);
      if (f.site) liensSociaux.push(`<a href="${f.site}" target="_blank" rel="noopener">Site web</a>`);
      if (f.linktree) liensSociaux.push(`<a href="${f.linktree}" target="_blank" rel="noopener">Linktree</a>`);
      const liensSociauxHtml = liensSociaux.length
        ? `<div class="social-links">${liensSociaux.join("")}</div>`
        : "";

      const majLienHtml = `<div class="update-link"><a href="${buildFestivalUpdateLink(f)}" target="_blank" rel="noopener">Mettre à jour</a></div>`;

      card.innerHTML = `
        ${logoHtml}
        <div class="event-card-body">
          <div class="tags">
            <span class="tag ${f.type}">${f.type}</span>
            <span class="tag ville">${f.ville}</span>
          </div>
          <h3>${f.nom}</h3>
          ${descriptionHtml}
          <ul class="meta-list">
            <li><span class="icon">📅</span> ${plageDates}</li>
          </ul>
          ${deadlineHtml}
          ${liensSociauxHtml}
          ${majLienHtml}
        </div>
      `;
      container.appendChild(card);
    });
  }

  function displayEvents(events) {
    const container = document.getElementById("events");
    container.innerHTML = "";

    if (events.length === 0) {
      container.innerHTML = `<p style="text-align:center; width:100%;">Aucun spectacle trouvé avec ces filtres.</p>`;
      return;
    }

    events.forEach(ev => {
      const card = document.createElement("div");
      card.className = ev.hors_saison ? "event-card event-card--hors-saison" : "event-card";

      const lieuHtml = ev.adresse
        ? `<a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(ev.adresse)}" target="_blank" rel="noopener">${ev.lieu}</a>`
        : ev.lieu;

      const billetLignes = [];
      if (estAudition(ev) && ev.auditionPublique.toLowerCase() === "oui") {
        billetLignes.push("Audition avec public");
      }
      if (ev.billetRequis) billetLignes.push(`Billet requis : <strong>${ev.billetRequis}</strong>`);
      if (ev.prix) billetLignes.push(`Prix : <strong>${ev.prix}</strong>`);
      const billetTexte = (estAudition(ev) && ev.auditionPublique.toLowerCase() === "non")
        ? `<div class="billet-requis">Audition sans public</div>`
        : (billetLignes.length ? `<div class="billet-requis">${billetLignes.join(" - ")}</div>` : "");

      const liensSociaux = [];
      if (ev.instagram) liensSociaux.push(`<a href="${ev.instagram}" target="_blank" rel="noopener">Instagram</a>`);
      if (ev.facebook) liensSociaux.push(`<a href="${ev.facebook}" target="_blank" rel="noopener">Facebook</a>`);
      if (ev.site) liensSociaux.push(`<a href="${ev.site}" target="_blank" rel="noopener">Site web</a>`);
      if (ev.linktree) liensSociaux.push(`<a href="${ev.linktree}" target="_blank" rel="noopener">Linktree</a>`);
      const liensSociauxHtml = liensSociaux.length
        ? `<div class="social-links">${liensSociaux.join("")}</div>`
        : "";

      const majLienHtml = `<div class="update-link"><a href="${estAudition(ev) ? buildAuditionUpdateLink(ev) : buildUpdateLink(ev)}" target="_blank" rel="noopener">Mettre à jour</a></div>`;

      const logoHtml = ev.logo
        ? `<div class="event-logo-wrapper"><img src="${ev.logo}" alt="Logo ${ev.titre}" loading="lazy" onerror="this.parentElement.style.display='none'"></div>`
        : "";

      const typeTagsHtml = ev.types.map(t => `<span class="tag ${t}">${t}</span>`).join("");
      const langueTagHtml = ev.langue ? `<span class="tag ${ev.langue}">${ev.langue}</span>` : "";

      const descriptionHtml = ev.description
        ? `<p class="event-description">${tronquerTexte(ev.description, 150)}</p>`
        : "";

      const badges = [];
      if (ev.hors_saison) badges.push(`<span class="badge badge-hors-saison">Hors saison</span>`);
      const badgesHtml = badges.length ? `<div class="badges">${badges.join("")}</div>` : "";

      const deadlineHtml = (estAudition(ev) && ev.dateLimiteInscriptionStr)
        ? `<div class="festival-deadline">📌 Date limite d'inscription : <strong>${ev.dateLimiteInscriptionStr}</strong></div>`
        : "";

      card.innerHTML = `
        ${logoHtml}
        <div class="event-card-body">
          <div class="tags">
            ${typeTagsHtml}
            <span class="tag ville">${ev.ville}</span>
            ${langueTagHtml}
          </div>
          ${badgesHtml}
          <h3>${ev.titre}</h3>
          ${ev.festival ? `<div class="festival-badge">🎪 Fait partie de la programmation du <strong>${ev.festival}</strong></div>` : ""}
          ${descriptionHtml}
          <ul class="meta-list">
            <li><span class="icon">📅</span> ${JOURS_LABELS[ev.jour] ? JOURS_LABELS[ev.jour] + " · " : ""}${ev.date || "À venir"}</li>
            <li><span class="icon">🕒</span> ${ev.heure}</li>
            <li><span class="icon">📍</span> ${lieuHtml}</li>
          </ul>
          ${deadlineHtml}
          ${billetTexte}
          ${liensSociauxHtml}
          ${majLienHtml}
        </div>
      `;
      container.appendChild(card);
    });
  }
});
