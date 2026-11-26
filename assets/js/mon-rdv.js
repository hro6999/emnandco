/* ==========================================================================
   emn & co — Page « Mon rendez-vous » : voir, déplacer, annuler (jusqu'à 24 h avant)
   ========================================================================== */
(function () {
  "use strict";

  var cfg = window.EMN_CONFIG || {};
  var S = window.EMN_STORE, C = window.EMN_CRENEAUX, R = window.EMN_RENDER;
  var app = document.getElementById("rdv-app");
  if (!app || !S) return;
  var T = S.outils, esc = R.esc;
  var token = new URLSearchParams(location.search).get("token") || "";
  var rdv = null, reglages = null, choix = null;
  var tel = '<a href="tel:' + esc(cfg.telephoneLien) + '">' + esc(cfg.telephone).replace(/ /g, "&nbsp;") + "</a>";

  if (S.mode === "demo") {
    var b = document.createElement("p"); b.className = "demo-ribbon";
    b.textContent = "Version de démonstration · aucune réservation réelle";
    var box = document.querySelector(".booking .container");
    box.insertBefore(b, box.firstChild);
  }

  function heure(dt) { return window.EMN_HORAIRES ? window.EMN_HORAIRES.formatHeure(dt.slice(11, 16)) : dt.slice(11, 16); }
  function modifiable() {
    var limite = C.ajouterMinutes(C.maintenantParis(), (reglages ? reglages.annulationHeures : 24) * 60);
    return rdv.statut === "confirme" && rdv.debut >= limite;
  }
  var STATUTS = { confirme: "Confirmé", annule: "Annulé", venue: "Honoré", absente: "Non honoré" };

  function afficher(message) {
    var ok = modifiable();
    app.innerHTML =
      (message ? '<p class="booking__ok" role="status">' + message + "</p>" : "") +
      '<div class="recap recap--big">' +
      '<p class="recap__status recap__status--' + rdv.statut + '">' + STATUTS[rdv.statut] + "</p>" +
      '<p class="recap__when"><span>' + T.dateLongue(rdv.debut) + " à " + heure(rdv.debut) + "</span></p>" +
      '<ul class="recap__list">' + rdv.prestations.map(function (p) { return "<li><span>" + esc(p.nom) + "</span><span>" + esc(p.prix) + "</span></li>"; }).join("") + "</ul>" +
      '<p class="recap__total">Total ' + esc(rdv.totalTexte) + " · " + esc(rdv.dureeTexte) + " · Paiement sur place</p></div>" +
      (rdv.statut !== "confirme" ? '<p class="booking__back"><a class="btn btn--primary" href="reserver.html">Prendre un nouveau rendez-vous</a></p>'
        : ok
          ? '<div class="btn-row btn-row--center confirm__actions">' +
            '<button class="btn btn--outline" type="button" data-action="deplacer">Déplacer</button>' +
            '<button class="btn btn--dark" type="button" data-action="annuler">Annuler le rendez-vous</button></div>' +
            '<p class="muted center">Modification possible jusqu\'à ' + (reglages ? reglages.annulationHeures : 24) + " h avant le rendez-vous.</p>" +
            '<div id="rdv-zone"></div>'
          : '<p class="good-to-know">Le délai pour modifier en ligne est dépassé. Pour toute demande, appelez le salon au ' + tel + ".</p>");
  }

  app.addEventListener("click", function (e) {
    var a = e.target.closest("[data-action]");
    if (!a) return;
    var zone = document.getElementById("rdv-zone");
    var act = a.getAttribute("data-action");
    if (act === "annuler") {
      zone.innerHTML = '<div class="good-to-know"><p><strong>Confirmer l\'annulation ?</strong> Le créneau sera libéré pour une autre cliente.</p>' +
        '<div class="btn-row"><button class="btn btn--dark" type="button" data-action="annuler-ok">Oui, annuler</button>' +
        '<button class="link-arrow" type="button" data-action="fermer">Non, garder mon rendez-vous</button></div></div>';
      zone.querySelector("[data-action=annuler-ok]").focus();
    } else if (act === "annuler-ok") {
      S.annulerParToken(token).then(function (r) { rdv = r; afficher("Votre rendez-vous est annulé. À bientôt !"); })
        .catch(function (ex) { zone.innerHTML = '<p class="booking__alert" role="alert">' + esc(ex.message) + "</p>"; });
    } else if (act === "fermer") {
      zone.innerHTML = "";
    } else if (act === "deplacer") {
      var min = C.maintenantParis().slice(0, 10), max = C.ajouterJours(min, reglages ? reglages.horizonJours : 60);
      zone.innerHTML = '<div class="good-to-know"><div class="field"><label for="f-date">Nouvelle date</label>' +
        '<input id="f-date" type="date" min="' + min + '" max="' + max + '" value="' + rdv.debut.slice(0, 10) + '"></div>' +
        '<div class="slots" id="slots-deplacer"></div></div>';
      var input = document.getElementById("f-date");
      input.addEventListener("change", charger);
      input.focus(); charger();
    } else if (act === "heure") {
      choix = a.getAttribute("data-heure");
      Array.prototype.forEach.call(zone.querySelectorAll("[data-action=heure]"), function (b) { b.setAttribute("aria-pressed", b === a); });
      var btn = document.getElementById("btn-deplacer"); btn.disabled = false;
      btn.textContent = "Déplacer au " + T.dateLongue(document.getElementById("f-date").value + "T00:00") + " à " + choix.replace(":", " h ");
    } else if (act === "deplacer-ok") {
      var d = document.getElementById("f-date").value;
      S.deplacerParToken(token, d + "T" + choix).then(function (r) { rdv = r; afficher("C'est noté : votre rendez-vous est déplacé."); })
        .catch(function (ex) { document.getElementById("slots-deplacer").insertAdjacentHTML("afterbegin", '<p class="booking__alert" role="alert">' + esc(ex.message) + "</p>"); charger(); });
    }
  });

  function charger() {
    var d = document.getElementById("f-date").value, box = document.getElementById("slots-deplacer");
    choix = null;
    if (!d) { box.innerHTML = ""; return; }
    S.creneauxPourDeplacer(token, d).then(function (heures) {
      box.innerHTML = heures.length
        ? '<div class="slots__grid" role="group" aria-label="Heures disponibles">' + heures.map(function (h) {
            return '<button class="slot" type="button" data-action="heure" data-heure="' + h + '" aria-pressed="false">' + h + "</button>";
          }).join("") + '</div><button class="btn btn--primary btn--block" id="btn-deplacer" type="button" data-action="deplacer-ok" disabled>Choisissez une heure</button>'
        : '<p class="booking__empty">Aucun créneau libre ce jour-là.</p>';
    });
  }

  if (!token) {
    app.innerHTML = '<p class="good-to-know">Ouvrez cette page depuis le lien « Gérer mon rendez-vous » de votre e-mail de confirmation, ou appelez le salon au ' + tel + ".</p>";
    return;
  }
  Promise.all([S.rdvParToken(token), S.getReglages()]).then(function (x) { rdv = x[0]; reglages = x[1]; afficher(); })
    .catch(function () { app.innerHTML = '<p class="booking__alert" role="alert">Rendez-vous introuvable. Vérifiez le lien de votre e-mail, ou appelez le salon au ' + tel + ".</p>"; });
})();
