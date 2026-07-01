/* ------------------------------
   GLOBAL
------------------------------ */

body {
  background-color: #121212;
  color: #f5f5f5;
  font-family: 'Inter', sans-serif;
  margin: 0;
  line-height: 1.6;
}

/* ------------------------------
   HEADER
------------------------------ */

header {
  background-color: #1e1e1e;
  padding: 1.5rem 2rem;
  text-align: center;
  border-bottom: 1px solid #333;
}

.site-title {
  font-family: 'Montserrat', sans-serif;
  font-size: 2.2rem;
  margin: 0;
  color: #ffcc00;
  font-weight: 700;
  letter-spacing: 1px;
}

/* ------------------------------
   NAVIGATION DES JOURS
------------------------------ */

.days-nav {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 0.8rem;
  padding: 1rem;
  background-color: #1e1e1e;
  border-bottom: 1px solid #333;
}

.day-btn {
  background-color: #2a2a2a;
  color: #f5f5f5;
  border: none;
  padding: 0.8rem 1.4rem;
  border-radius: 6px;
  cursor: pointer;
  font-size: 1.1rem;
  transition: 0.2s;
}

.day-btn:hover {
  background-color: #ffcc00;
  color: #000;
}

.day-btn.active {
  background-color: #ffcc00;
  color: #000;
  font-weight: 700;
}

/* ------------------------------
   CONTENU PRINCIPAL
------------------------------ */

main {
  padding: 2rem;
  max-width: 1100px;
  margin: auto;
}

.event-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 1.5rem;
  justify-content: center;
}

/* ------------------------------
   CARTES D'ÉVÉNEMENTS
------------------------------ */

.event-card {
  background-color: #1e1e1e;
  border-radius: 12px;
  padding: 1.4rem;
  width: 100%;
  max-width: 360px;
  border: 1px solid #333;
  box-shadow: 0 2px 6px rgba(0,0,0,0.35);
}

.event-card h3 {
  margin-top: 0;
  margin-bottom: 1rem;
  font-size: 1.5rem;
  color: #ffcc00;
  line-height: 1.3;
}

/* ------------------------------
   BADGES
------------------------------ */

.badges {
  margin-bottom: 10px;
}

.badge {
  display: inline-block;
  padding: 5px 10px;
  border-radius: 6px;
  font-size: 0.8rem;
  font-weight: 600;
  margin-right: 6px;
  color: white;
}

.badge-hors-saison {
  background-color: #777;
}

/* ------------------------------
   INFO BOX
------------------------------ */

.info-box {
  background-color: #ffe687;
  color: #2e2e2e;
  padding: 1rem 1.2rem;
  border-radius: 10px;
  margin: 1.2rem 0;
  line-height: 1.5;
  font-size: 1rem;
  border: 1px solid #bdb7ad;
}

.info-box p {
  margin: 0.6rem 0;
}

.info-box a {
  color: #0055aa;
  font-weight: 600;
  text-decoration: none;
}

.info-box a:hover {
  text-decoration: underline;
}

/* ------------------------------
   TAGS
------------------------------ */

.tags {
  margin-bottom: 1rem;
}

.tag {
  display: inline-block;
  padding: 0.3rem 0.7rem;
  border-radius: 6px;
  font-size: 0.85rem;
  margin-right: 0.4rem;
  font-weight: 600;
}

.tag.ville {
  background-color: #444;
  color: white;
  border-radius: 12px;
}

.tag.Spectacle { background-color: #00bcd4; color: #000; }
.tag.Match { background-color: #ffcc00; color: #000; }
.tag.Formation { background-color: #4caf50; color: #000; }
.tag.Jam { background-color: #ff6b00; color: #000; }

/* ------------------------------
   FILTRES DESKTOP
------------------------------ */

#filters {
  display: flex;
  gap: 1rem;
  justify-content: center;
  margin: 1.5rem 0;
  flex-wrap: wrap;
}

#filters select {
  background-color: #2a2a2a;
  color: #f5f5f5;
  border: 1px solid #444;
  padding: 0.6rem 1rem;
  border-radius: 6px;
  font-size: 1rem;
  cursor: pointer;
}

#filters select:hover {
  background-color: #ffcc00;
  color: #000;
}

/* ------------------------------
   ACCORDÉON MOBILE
------------------------------ */

@media (max-width: 600px) {

  #filters {
    display: none;
  }

  .accordion-wrapper {
    display: block;
    background-color: #1e1e1e;
    border: 1px solid #333;
    border-radius: 8px;
    overflow: hidden;
    margin: 1rem;
  }

  .accordion-header {
    padding: 1rem;
    font-size: 1.2rem;
    font-weight: 600;
    background-color: #2a2a2a;
    color: #f5f5f5;
    cursor: pointer;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .accordion-header .arrow {
    transition: transform 0.25s ease;
  }

  .accordion-header.open .arrow {
    transform: rotate(90deg);
  }

  .accordion-content {
    max-height: 0;
    overflow: hidden;
    transition: max-height 0.35s ease;
    background-color: #1e1e1e;
    padding: 0 1rem;
  }

  .accordion-content.open {
    padding: 1rem;
    max-height: 500px;
  }

  #filters-mobile select {
    width: 100%;
    margin-bottom: 1rem;
    background-color: #2a2a2a;
    color: #f5f5f5;
    border: 1px solid #444;
    padding: 0.6rem 1rem;
    border-radius: 6px;
    font-size: 1rem;
  }
}

/* ------------------------------
   ACCORDÉON HIDDEN ON DESKTOP
------------------------------ */

@media (min-width: 601px) {
  .accordion-wrapper {
    display: none;
  }
}
