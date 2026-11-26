/* ==========================================================================
   emn & co — Espace pro : agenda, ajout, blocages & congés, horaires,
   prestations, réglages, chiffre du jour / de la semaine.
   ========================================================================== */
(function () {
  "use strict";

  var cfg = window.EMN_CONFIG || {};
  var S = window.EMN_STORE, C = window.EMN_CRENEAUX, R = window.EMN_RENDER;
  var app = document.getElementById("pro-app");
  if (!app || !S) return;
  var T = S.outils, esc = R.esc;
  var logout = document.getElementById("pro-logout");
  var today = function () { return C.maintenantParis().slice(0, 10); };
  var st = { onglet: "agenda", vue: "jour", date: today(), edition: null, message: "" };
  var JOURS_COURTS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
  var STATUTS = { confirme: "Confirmé", annule: "Annulé", venue: "Venue", absente: "Absente" };

  if (S.mode === "demo") {
    var b = document.createElement("p"); b.className = "demo-ribbon";
    b.textContent = "Version de démonstration";
    var box = document.querySelector(".pro-main .container");
    box.insertBefore(b, box.firstChild);
  }

  function lundi(d) { return C.ajouterJours(d, -C.jourSemaine(d)); }
  var MOIS_COURTS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
  function court(d) { return JOURS_COURTS[C.jourSemaine(d)] + " " + (+d.slice(8, 10)) + " " + MOIS_COURTS[+d.slice(5, 7) - 1]; }
  function chiffre(list) {
    return T.formatPrix(list.filter(function (r) { return r.statut === "confirme" || r.statut === "venue"; })
      .reduce(function (s, r) { return s + (r.total || 0); }, 0));
  }
  function flash(msg) { st.message = msg; }

  /* ---------- Connexion ---------- */
  function ecranConnexion(erreur) {
    logout.hidden = true;
    app.innerHTML =
      '<div class="pro-login">' +
      '<h2 class="booking__title">Connexion</h2>' +
      (S.mode === "demo" ? '<p class="pro-demo-ids">Identifiant de démonstration : <strong>demo@emnandco.fr</strong><br>Mot de passe : <strong>demo</strong></p>' : "") +
      '<form class="form" id="f-login">' +
      '<div class="field"><label for="l-email">E-mail</label><input id="l-email" name="email" type="email" autocomplete="username" required></div>' +
      '<div class="field"><label for="l-mdp">Mot de passe</label><input id="l-mdp" name="mdp" type="password" autocomplete="current-password" required></div>' +
      (erreur ? '<p class="form__error" role="alert">' + esc(erreur) + "</p>" : "") +
      '<button class="btn btn--primary btn--block" type="submit">Se connecter</button></form></div>';
    document.getElementById("f-login").addEventListener("submit", function (e) {
      e.preventDefault();
      S.connexion(e.target.email.value, e.target.mdp.value).then(demarrer).catch(function (ex) { ecranConnexion(ex.message); });
    });
  }
  logout.addEventListener("click", function () { S.deconnexion().then(function () { ecranConnexion(); }); });

  /* ---------- Cadre : onglets ---------- */
  var ONGLETS = [["agenda", "Agenda"], ["ajouter", "Ajouter"], ["blocages", "Congés & blocages"], ["horaires", "Horaires"], ["prestations", "Prestations"], ["reglages", "Réglages"]];
  function cadre(contenu) {
    app.innerHTML =
      '<nav class="pro-tabs" aria-label="Sections de l\'espace pro"><ul>' +
      ONGLETS.map(function (o) { return '<li><button type="button" data-onglet="' + o[0] + '"' + (st.onglet === o[0] ? ' aria-current="page" class="is-active"' : "") + ">" + o[1] + "</button></li>"; }).join("") +
      "</ul></nav>" +
      (st.message ? '<p class="booking__ok" role="status">' + esc(st.message) + "</p>" : "") +
      '<section class="pro-panel">' + contenu + "</section>";
    st.message = "";
  }
  function rendre() {
    var f = { agenda: agenda, ajouter: ajouter, blocages: blocages, horaires: horaires, prestations: prestations, reglages: reglages }[st.onglet];
    f();
  }

  /* ---------- Agenda ---------- */
  function agenda() {
    var de = st.vue === "jour" ? st.date : lundi(st.date), a = st.vue === "jour" ? st.date : C.ajouterJours(lundi(st.date), 6);
    var semDe = lundi(today()), semA = C.ajouterJours(semDe, 6);
    Promise.all([S.listerRdv(de, a), S.listerRdv(today(), today()), S.listerRdv(semDe, semA), S.listerBlocages()]).then(function (x) {
      var rdvs = x[0], blocs = x[3].filter(function (b) { return b.fin.slice(0, 10) >= de && b.debut.slice(0, 10) <= a; });
      var titre = st.vue === "jour" ? T.dateLongue(st.date + "T00:00") : "Semaine du " + court(de) + " au " + court(a);
      var html =
        '<div class="kpis"><p class="kpi"><span class="kpi__label">Chiffre du jour</span><strong>' + chiffre(x[1]) + "</strong></p>" +
        '<p class="kpi"><span class="kpi__label">Cette semaine</span><strong>' + chiffre(x[2]) + "</strong></p></div>" +
        '<p class="muted kpi__note">Indicatif : rendez-vous confirmés ou honorés, prix de la carte.</p>' +
        '<div class="agenda-bar">' +
        '<div class="seg" role="group" aria-label="Affichage"><button type="button" data-vue="jour" aria-pressed="' + (st.vue === "jour") + '">Jour</button><button type="button" data-vue="semaine" aria-pressed="' + (st.vue === "semaine") + '">Semaine</button></div>' +
        '<div class="agenda-nav"><button class="cal__nav" type="button" data-decaler="-1" aria-label="Précédent">‹</button>' +
        '<button class="btn btn--outline btn--small" type="button" data-aujourdhui>Aujourd\'hui</button>' +
        '<button class="cal__nav" type="button" data-decaler="1" aria-label="Suivant">›</button></div></div>' +
        '<h2 class="agenda__title">' + titre + "</h2>";
      var jours = [];
      for (var d = de; d <= a; d = C.ajouterJours(d, 1)) jours.push(d);
      jours.forEach(function (d) {
        var duJour = rdvs.filter(function (r) { return r.debut.slice(0, 10) === d; });
        var blocsJour = blocs.filter(function (b) { return b.debut.slice(0, 10) <= d && b.fin.slice(0, 10) >= d; });
        if (st.vue === "semaine") html += '<h3 class="agenda__day">' + court(d) + ' <span class="muted">· ' + chiffre(duJour) + "</span></h3>";
        if (!duJour.length && !blocsJour.length) { html += '<p class="agenda__empty">' + (cfg.horaires && cfg.horaires[C.jourSemaine(d)] && cfg.horaires[C.jourSemaine(d)].ferme ? "Fermé." : "Aucun rendez-vous.") + "</p>"; return; }
        html += '<ul class="agenda">';
        blocsJour.forEach(function (b) {
          html += '<li class="appt appt--bloc"><p class="appt__time">' + (b.type === "conge" ? "Congés" : b.debut.slice(11, 16) + " – " + b.fin.slice(11, 16)) + '</p><p class="appt__who">' + (b.type === "conge" ? "Congés" : "Plage bloquée") + (b.motif ? " · " + esc(b.motif) : "") + "</p></li>";
        });
        duJour.forEach(function (r) { html += carte(r); });
        html += "</ul>";
      });
      cadre(html);
    });
  }
  function carte(r) {
    var edit = st.edition === r.id;
    return '<li class="appt appt--' + r.statut + '" data-id="' + esc(r.id) + '">' +
      '<p class="appt__time">' + r.debut.slice(11, 16) + " – " + r.fin.slice(11, 16) + "</p>" +
      '<div class="appt__body"><p class="appt__who">' + esc(r.client.prenom + " " + (r.client.nom || "")) + ' <span class="appt__status">' + STATUTS[r.statut] + "</span>" + (r.source === "telephone" ? ' <span class="appt__src">tél.</span>' : "") + "</p>" +
      '<p class="appt__what">' + esc(r.prestations.map(function (p) { return p.nom; }).join(" + ")) + "</p>" +
      '<p class="appt__meta"><span>À encaisser : <strong>' + esc(r.totalTexte) + "</strong></span>" +
      (r.client.tel ? '<a href="tel:' + esc(r.client.tel.replace(/[^0-9+]/g, "")) + '">' + esc(r.client.tel) + "</a>" : "") + "</p>" +
      (r.client.message ? '<p class="appt__msg">« ' + esc(r.client.message) + " »</p>" : "") +
      (r.statut === "confirme"
        ? (edit
          ? '<form class="appt__move" data-move="' + esc(r.id) + '"><label>Nouvelle date <input type="date" name="d" value="' + r.debut.slice(0, 10) + '" required></label>' +
            '<label>Heure <input type="time" name="h" step="300" value="' + r.debut.slice(11, 16) + '" required></label>' +
            '<button class="btn btn--primary btn--small" type="submit">Enregistrer</button><button class="link-arrow" type="button" data-act="fermer">Fermer</button></form>'
          : '<div class="appt__actions"><button type="button" data-act="venue">Venue</button><button type="button" data-act="absente">Absente</button>' +
            '<button type="button" data-act="deplacer">Déplacer</button><button type="button" data-act="annuler">Annuler</button></div>')
        : "") +
      "</div></li>";
  }

  /* ---------- Ajouter un rendez-vous (pris par téléphone) ---------- */
  function ajouter() {
    S.getCatalogue().then(function (cat) {
      cadre(
        '<h2 class="agenda__title">Ajouter un rendez-vous</h2>' +
        '<form class="form" id="f-ajout">' +
        '<div class="form__row"><div class="field"><label for="a-date">Date</label><input id="a-date" name="date" type="date" value="' + st.date + '" required></div>' +
        '<div class="field"><label for="a-heure">Heure</label><input id="a-heure" name="heure" type="time" step="300" value="10:00" required></div></div>' +
        '<fieldset class="field"><legend>Prestations</legend><div class="pick-list">' +
        cat.map(function (c) {
          return '<p class="pick-list__cat">' + esc(c.titre) + "</p>" + c.prestations.map(function (p) {
            return '<label class="pick"><input type="checkbox" name="p" value="' + esc(p.id) + '"><span>' + esc(p.nom) + '</span><span class="muted">' + esc(p.prix) + " · " + esc(p.duree) + "</span></label>";
          }).join("");
        }).join("") + "</div></fieldset>" +
        '<div class="form__row"><div class="field"><label for="a-prenom">Prénom</label><input id="a-prenom" name="prenom" required></div>' +
        '<div class="field"><label for="a-nom">Nom</label><input id="a-nom" name="nom"></div></div>' +
        '<div class="form__row"><div class="field"><label for="a-tel">Téléphone</label><input id="a-tel" name="tel" type="tel" required></div>' +
        '<div class="field"><label for="a-email">E-mail <span class="field__opt">(facultatif)</span></label><input id="a-email" name="email" type="email"></div></div>' +
        '<p class="form__error" id="a-err" role="alert" hidden></p>' +
        '<button class="btn btn--primary btn--block" type="submit">Ajouter le rendez-vous</button></form>');
      document.getElementById("f-ajout").addEventListener("submit", function (e) {
        e.preventDefault();
        var f = e.target, ids = Array.prototype.map.call(f.querySelectorAll("[name=p]:checked"), function (i) { return i.value; });
        var err = document.getElementById("a-err");
        if (!ids.length) { err.textContent = "Choisissez au moins une prestation."; err.hidden = false; return; }
        S.reserver({ debut: f.date.value + "T" + f.heure.value, prestationIds: ids, source: "telephone",
          client: { prenom: f.prenom.value.trim(), nom: f.nom.value.trim(), tel: f.tel.value.trim(), email: f.email.value.trim(), message: "" } })
          .then(function () { st.date = f.date.value; st.vue = "jour"; st.onglet = "agenda"; flash("Rendez-vous ajouté."); rendre(); })
          .catch(function (ex) { err.textContent = ex.code === "CRENEAU_PRIS" ? "Ce créneau n'est pas libre (rendez-vous, pause, congé ou fermeture)." : ex.message; err.hidden = false; });
      });
    });
  }

  /* ---------- Congés & plages bloquées ---------- */
  function blocages() {
    S.listerBlocages().then(function (list) {
      cadre(
        '<h2 class="agenda__title">Bloquer une plage</h2>' +
        '<form class="form" id="f-bloc"><div class="form__row"><div class="field"><label for="b-date">Date</label><input id="b-date" name="date" type="date" value="' + st.date + '" required></div>' +
        '<div class="field"><label for="b-de">De</label><input id="b-de" name="de" type="time" step="300" value="12:00" required></div>' +
        '<div class="field"><label for="b-a">À</label><input id="b-a" name="a" type="time" step="300" value="14:00" required></div></div>' +
        '<div class="field"><label for="b-motif">Motif <span class="field__opt">(facultatif)</span></label><input id="b-motif" name="motif"></div>' +
        '<button class="btn btn--dark btn--block" type="submit">Bloquer cette plage</button></form>' +
        '<h2 class="agenda__title">Poser des congés</h2>' +
        '<form class="form" id="f-conge"><div class="form__row"><div class="field"><label for="c-du">Du</label><input id="c-du" name="du" type="date" required></div>' +
        '<div class="field"><label for="c-au">Au (inclus)</label><input id="c-au" name="au" type="date" required></div></div>' +
        '<button class="btn btn--dark btn--block" type="submit">Poser les congés</button></form>' +
        '<h2 class="agenda__title">À venir</h2>' +
        (list.length ? '<ul class="agenda">' + list.map(function (b) {
          return '<li class="appt appt--bloc"><p class="appt__time">' + (b.type === "conge" ? "Congés" : "Bloqué") + '</p><div class="appt__body"><p class="appt__who">' +
            (b.type === "conge" ? "Du " + court(b.debut.slice(0, 10)) + " au " + court(b.fin.slice(0, 10)) : court(b.debut.slice(0, 10)) + ", " + b.debut.slice(11, 16) + " – " + b.fin.slice(11, 16)) +
            "</p>" + (b.motif ? '<p class="appt__what">' + esc(b.motif) + "</p>" : "") +
            '<div class="appt__actions"><button type="button" data-suppr="' + esc(b.id) + '">Supprimer</button></div></div></li>';
        }).join("") + "</ul>" : '<p class="agenda__empty">Aucune plage bloquée ni aucun congé.</p>'));
      document.getElementById("f-bloc").addEventListener("submit", function (e) {
        e.preventDefault(); var f = e.target;
        if (f.a.value <= f.de.value) { flash("L'heure de fin doit être après l'heure de début."); return rendre(); }
        S.ajouterBlocage({ debut: f.date.value + "T" + f.de.value, fin: f.date.value + "T" + f.a.value, type: "blocage", motif: f.motif.value })
          .then(function () { flash("Plage bloquée."); rendre(); });
      });
      document.getElementById("f-conge").addEventListener("submit", function (e) {
        e.preventDefault(); var f = e.target;
        if (f.au.value < f.du.value) { flash("La date de fin doit être après la date de début."); return rendre(); }
        S.ajouterBlocage({ debut: f.du.value + "T00:00", fin: f.au.value + "T23:59", type: "conge" }).then(function () { flash("Congés enregistrés."); rendre(); });
      });
    });
  }

  /* ---------- Horaires ---------- */
  function horaires() {
    S.getReglages().then(function (r) {
      cadre('<h2 class="agenda__title">Horaires d\'ouverture</h2><form class="form" id="f-horaires">' +
        r.horaires.map(function (j, i) {
          return '<div class="hours-row"><p class="hours-row__day">' + j.jour + "</p>" +
            '<label class="pick pick--inline"><input type="checkbox" name="ferme' + i + '"' + (j.ferme ? " checked" : "") + "><span>Fermé</span></label>" +
            '<label>De <input type="time" name="o' + i + '" step="300" value="' + (j.ouverture || "10:00") + '"></label>' +
            '<label>À <input type="time" name="f' + i + '" step="300" value="' + (j.fermeture || "17:00") + '"></label></div>';
        }).join("") + '<button class="btn btn--primary btn--block" type="submit">Enregistrer les horaires</button></form>');
      document.getElementById("f-horaires").addEventListener("submit", function (e) {
        e.preventDefault(); var f = e.target;
        var h = r.horaires.map(function (j, i) {
          return f["ferme" + i].checked ? { jour: j.jour, ferme: true } : { jour: j.jour, ouverture: f["o" + i].value, fermeture: f["f" + i].value };
        });
        S.setReglages({ horaires: h }).then(function () { flash("Horaires enregistrés."); rendre(); });
      });
    });
  }

  /* ---------- Prestations ---------- */
  function prestations() {
    S.getCatalogue().then(function (cat) {
      cadre('<h2 class="agenda__title">Prestations</h2><p class="muted">Modifiez le prix ou la durée, ou désactivez une prestation : la page Réserver se met à jour.</p>' +
        cat.map(function (c) {
          return '<h3 class="agenda__day">' + esc(c.titre) + '</h3><ul class="agenda">' + c.prestations.map(function (p) {
            return '<li class="appt' + (p.actif ? "" : " appt--off") + '"><form class="presta-row" data-presta="' + esc(p.id) + '"><p class="appt__who">' + esc(p.nom) + "</p>" +
              '<label>Prix <input name="prix" value="' + esc(p.prix) + '" size="9"></label>' +
              '<label>Durée <input name="duree" value="' + esc(p.duree) + '" size="7"></label>' +
              '<label class="pick pick--inline"><input type="checkbox" name="actif"' + (p.actif ? " checked" : "") + "><span>Active</span></label>" +
              '<button class="btn btn--outline btn--small" type="submit">Enregistrer</button></form></li>';
          }).join("") + "</ul>";
        }).join(""));
    });
  }

  /* ---------- Réglages ---------- */
  function reglages() {
    S.getReglages().then(function (r) {
      function sel(name, label, val, options, unite) {
        return '<div class="field"><label for="r-' + name + '">' + label + '</label><select id="r-' + name + '" name="' + name + '">' +
          options.map(function (o) { return '<option value="' + o + '"' + (+val === o ? " selected" : "") + ">" + o + " " + unite + "</option>"; }).join("") + "</select></div>";
      }
      cadre('<h2 class="agenda__title">Réglages</h2><form class="form" id="f-reglages">' +
        sel("pauseMin", "Pause entre deux clientes", r.pauseMin, [0, 15, 30, 45, 60, 90], "min") +
        sel("intervalleMin", "Intervalle entre les créneaux proposés", r.intervalleMin, [15, 30, 60], "min") +
        sel("delaiMinHeures", "Délai minimum avant un rendez-vous", r.delaiMinHeures, [0, 1, 2, 4, 12, 24, 48], "h") +
        sel("horizonJours", "Réservation possible jusqu'à", r.horizonJours, [14, 30, 60, 90], "jours") +
        sel("annulationHeures", "Annulation / déplacement en ligne jusqu'à", r.annulationHeures, [12, 24, 48], "h avant") +
        '<button class="btn btn--primary btn--block" type="submit">Enregistrer les réglages</button></form>' +
        (S.mode === "demo" ? '<div class="good-to-know pro-reset"><h3>Démonstration</h3><p>Remet l\'agenda de démonstration à zéro (faux rendez-vous, réglages et prix d\'origine).</p>' +
          '<button class="btn btn--dark" type="button" data-reset>Réinitialiser la démo</button></div>' : ""));
      document.getElementById("f-reglages").addEventListener("submit", function (e) {
        e.preventDefault(); var f = e.target, patch = {};
        ["pauseMin", "intervalleMin", "delaiMinHeures", "horizonJours", "annulationHeures"].forEach(function (k) { patch[k] = +f[k].value; });
        S.setReglages(patch).then(function () { flash("Réglages enregistrés."); rendre(); });
      });
    });
  }

  /* ---------- Événements ---------- */
  app.addEventListener("click", function (e) {
    var t;
    if ((t = e.target.closest("[data-onglet]"))) { st.onglet = t.getAttribute("data-onglet"); st.edition = null; return rendre(); }
    if ((t = e.target.closest("[data-vue]"))) { st.vue = t.getAttribute("data-vue"); return rendre(); }
    if ((t = e.target.closest("[data-decaler]"))) { st.date = C.ajouterJours(st.date, +t.getAttribute("data-decaler") * (st.vue === "jour" ? 1 : 7)); return rendre(); }
    if (e.target.closest("[data-aujourdhui]")) { st.date = today(); return rendre(); }
    if ((t = e.target.closest("[data-suppr]"))) { return S.supprimerBlocage(t.getAttribute("data-suppr")).then(function () { flash("Supprimé."); rendre(); }); }
    if (e.target.closest("[data-reset]")) {
      if (window.confirm("Réinitialiser toute la démonstration ?")) S.reinitialiser().then(function () { st.onglet = "agenda"; st.date = today(); flash("Démo réinitialisée."); rendre(); });
      return;
    }
    if ((t = e.target.closest("[data-act]"))) {
      var id = t.closest("[data-id]").getAttribute("data-id"), act = t.getAttribute("data-act");
      if (act === "deplacer") { st.edition = id; return rendre(); }
      if (act === "fermer") { st.edition = null; return rendre(); }
      if (act === "annuler" && !window.confirm("Annuler ce rendez-vous ?")) return;
      var statut = { venue: "venue", absente: "absente", annuler: "annule" }[act];
      S.majRdv(id, { statut: statut }).then(function () { flash(statut === "annule" ? "Rendez-vous annulé." : "Statut mis à jour."); rendre(); });
    }
  });
  app.addEventListener("submit", function (e) {
    var f = e.target;
    if (f.hasAttribute("data-move")) {
      e.preventDefault();
      S.majRdv(f.getAttribute("data-move"), { debut: f.d.value + "T" + f.h.value })
        .then(function () { st.edition = null; st.date = f.d.value; flash("Rendez-vous déplacé."); rendre(); })
        .catch(function (ex) { flash(ex.message); rendre(); });
    } else if (f.hasAttribute("data-presta")) {
      e.preventDefault();
      S.setPrestation(f.getAttribute("data-presta"), { prix: f.prix.value.trim(), duree: f.duree.value.trim(), actif: f.actif.checked })
        .then(function () { flash("Prestation enregistrée."); rendre(); });
    }
  });

  function demarrer() { logout.hidden = false; rendre(); }
  S.estConnecte().then(function (ok) { if (ok) demarrer(); else ecranConnexion(); });
})();
