/* ==========================================================================
   emn & co — Page « Réserver en ligne » (4 étapes)
   Données : window.EMN_STORE (reservation-store.js). Créneaux : creneaux.js.
   ========================================================================== */
(function () {
  "use strict";

  var cfg = window.EMN_CONFIG || {};
  var S = window.EMN_STORE, C = window.EMN_CRENEAUX, R = window.EMN_RENDER;
  var app = document.getElementById("resa-app");
  if (!app || !S) return;
  var T = S.outils, esc = R.esc, ICON = R.ICON;
  var bar = document.getElementById("booking-bar");
  var barNext = bar.querySelector(".booking-bar__next");
  var SELECTION = "emn-selection";

  var st = { step: 1, catalogue: [], index: {}, ids: [], date: null, heure: null, mois: null, client: { prenom: "", nom: "", tel: "", email: "", message: "", consentement: false }, rdv: null, erreur: "" };

  /* ---------- Mode Planity : renvoi simple ---------- */
  if (cfg.modeReservation === "planity") {
    app.innerHTML = '<div class="good-to-know"><h2>Réservation sur Planity</h2><p>Les rendez-vous se prennent sur Planity, 24h/24.</p>' +
      '<a class="btn btn--primary" href="' + esc(cfg.planity) + '" target="_blank" rel="noopener">Réserver sur Planity<span class="sr-only"> (nouvel onglet)</span></a></div>';
    document.querySelector(".progress").hidden = true;
    return;
  }

  /* ---------- Bandeau démo ---------- */
  if (S.mode === "demo") {
    var b = document.createElement("p");
    b.className = "demo-ribbon";
    b.innerHTML = "Version de démonstration · aucune réservation réelle";
    var box = document.querySelector(".booking .container");
    box.insertBefore(b, box.firstChild);
  }

  /* ---------- Outils ---------- */
  var ICON_CHECK = '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
  var ICON_LEFT = '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M15 5l-7 7 7 7"/></svg>';
  var ICON_RIGHT = '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M9 5l7 7-7 7"/></svg>';
  var ICON_CAL = '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/></svg>';
  var ICON_MAP = '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M9 4.5l-5.5 2v13l5.5-2 6 2 5.5-2v-13l-5.5 2z"/><path d="M9 4.5v13M15 6.5v13"/></svg>';
  var ICON_WALLET = '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect x="3.5" y="6" width="17" height="13" rx="2"/><path d="M3.5 10h17M15.5 14.5h2"/></svg>';

  function choisies() { return st.ids.map(function (id) { return st.index[id]; }).filter(Boolean); }
  function totaux() { return T.total(choisies()); }
  function sauverSelection() { try { sessionStorage.setItem(SELECTION, JSON.stringify(st.ids)); } catch (e) { /* */ } }
  function heureTexte(h) { return window.EMN_HORAIRES ? window.EMN_HORAIRES.formatHeure(h) : h; }
  function moisTexte(ym) { return T.MOIS[+ym.slice(5, 7) - 1] + " " + ym.slice(0, 4); }

  /* ---------- Progression & barre récapitulative ---------- */
  function progression() {
    Array.prototype.forEach.call(document.querySelectorAll(".progress li"), function (li) {
      var n = +li.getAttribute("data-step");
      li.classList.toggle("is-done", n < st.step);
      li.classList.toggle("is-current", n === st.step);
      if (n === st.step) li.setAttribute("aria-current", "step"); else li.removeAttribute("aria-current");
    });
  }
  function majBarre() {
    var n = st.ids.length, t = totaux();
    var visible = (st.step === 1 && n > 0) || (st.step === 2 && st.heure);
    bar.hidden = !visible;
    document.body.classList.toggle("has-booking-bar", !!visible);
    if (!visible) return;
    bar.querySelector(".booking-bar__total").textContent = t.prixTexte;
    bar.querySelector(".booking-bar__meta").textContent = st.step === 1
      ? n + " prestation" + (n > 1 ? "s" : "") + " · " + t.dureeTexte + " · Paiement sur place"
      : T.dateLongue(st.date + "T00:00") + " à " + heureTexte(st.heure);
  }
  barNext.addEventListener("click", function () { aller(st.step + 1); });

  function aller(step) {
    st.step = step; st.erreur = st.step === 2 ? st.erreur : "";
    rendre();
    window.scrollTo({ top: document.querySelector(".booking").offsetTop - 90, behavior: "auto" });
    var h = app.querySelector("h2");
    if (h) { h.setAttribute("tabindex", "-1"); h.focus({ preventScroll: true }); }
  }

  function rendre() {
    progression();
    if (st.step === 1) etape1();
    else if (st.step === 2) etape2();
    else if (st.step === 3) etape3();
    else etape4();
    majBarre();
  }

  /* ---------- Étape 1 : prestations ---------- */
  var ouvertes = {};
  function etape1() {
    var html = '<h2 class="booking__title">Choisissez vos <em>prestations</em></h2>' +
      '<p class="booking__hint">Une ou plusieurs : le total et la durée s\'affichent en bas de l\'écran.</p><div class="cats">';
    st.catalogue.forEach(function (c, i) {
      var items = c.prestations.filter(function (p) { return p.actif; });
      if (!items.length) return;
      var nb = items.filter(function (p) { return st.ids.indexOf(p.id) !== -1; }).length;
      var open = ouvertes[c.id] != null ? ouvertes[c.id] : (nb > 0 || (i === 0 && !st.ids.length));
      ouvertes[c.id] = open;
      html += '<section class="cat' + (c.offre ? " cat--offre on-night" : "") + '" id="r-' + esc(c.id) + '">' +
        '<h3 class="cat__title"><button class="cat__toggle" type="button" data-cat="' + esc(c.id) + '" aria-expanded="' + open + '" aria-controls="r-panel-' + esc(c.id) + '">' +
        '<span class="cat__label">' + esc(c.titre) + "</span>" +
        '<span class="cat__count">' + (nb ? nb + " choisie" + (nb > 1 ? "s" : "") : items.length + " soins") + "</span>" +
        '<span class="cat__chev">' + ICON.chev + "</span></button></h3>" +
        '<div class="cat__panel" id="r-panel-' + esc(c.id) + '"' + (open ? "" : " hidden") + '><ul class="svc-list">' +
        items.map(function (p) {
          var on = st.ids.indexOf(p.id) !== -1;
          var action = p.telephoneUniquement
            ? '<a class="btn-choose btn-choose--call" href="tel:' + esc(cfg.telephoneLien) + '">' + ICON.phone + "Appeler</a>"
            : '<button class="btn-choose' + (on ? " is-chosen" : "") + '" type="button" data-pick="' + esc(p.id) + '" aria-pressed="' + on + '">' +
              (on ? ICON_CHECK + "Choisie" : "Choisir") + '<span class="sr-only"> ' + esc(p.nom) + "</span></button>";
          return '<li class="svc' + (p.prixAvant ? " svc--promo" : "") + '"><div class="svc__main"><h4 class="svc__name">' + esc(p.nom) + "</h4>" +
            '<p class="svc__meta"><span class="svc__duree">' + ICON.clock + esc(p.duree) + "</span>" + (p.badge ? '<span class="badge">' + esc(p.badge) + "</span>" : "") + "</p>" +
            (p.description ? '<p class="svc__desc">' + esc(p.description) + "</p>" : "") +
            '</div><div class="svc__side"><p class="svc__price"><span class="svc__price-now">' + esc(p.prix) + "</span>" +
            (p.prixAvant ? '<span class="svc__price-old"><span class="sr-only">au lieu de </span><del>' + esc(p.prixAvant) + "</del></span>" : "") +
            "</p>" + action + "</div></li>";
        }).join("") + "</ul></div></section>";
    });
    html += "</div>";
    app.innerHTML = html;
  }

  app.addEventListener("click", function (e) {
    var t = e.target.closest("[data-cat]");
    if (t) {
      var id = t.getAttribute("data-cat"); ouvertes[id] = t.getAttribute("aria-expanded") !== "true";
      t.setAttribute("aria-expanded", ouvertes[id]);
      document.getElementById("r-panel-" + id).hidden = !ouvertes[id];
      return;
    }
    var p = e.target.closest("[data-pick]");
    if (p) {
      var pid = p.getAttribute("data-pick"), i = st.ids.indexOf(pid);
      if (i === -1) st.ids.push(pid); else st.ids.splice(i, 1);
      st.date = st.heure = null; sauverSelection();
      var sy = window.scrollY; etape1(); window.scrollTo(0, sy); majBarre();
      var again = app.querySelector('[data-pick="' + pid + '"]'); if (again) again.focus();
      return;
    }
    var nav = e.target.closest("[data-mois]");
    if (nav) { st.mois = nav.getAttribute("data-mois"); st.date = st.heure = null; etape2(); majBarre(); return; }
    var d = e.target.closest("[data-date]");
    if (d && d.getAttribute("aria-disabled") !== "true") { st.date = d.getAttribute("data-date"); st.heure = null; st.erreur = ""; etape2(true); majBarre(); return; }
    var h = e.target.closest("[data-heure]");
    if (h) {
      st.heure = h.getAttribute("data-heure");
      Array.prototype.forEach.call(app.querySelectorAll("[data-heure]"), function (b) { b.setAttribute("aria-pressed", b === h); });
      majBarre(); return;
    }
    var back = e.target.closest("[data-retour]");
    if (back) { aller(+back.getAttribute("data-retour")); return; }
    var ics = e.target.closest("[data-ics]");
    if (ics) {
      var blob = new Blob([T.ics(st.rdv)], { type: "text/calendar;charset=utf-8" });
      var a = document.createElement("a");
      a.href = URL.createObjectURL(blob); a.download = "rendez-vous-emn-and-co.ics";
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
    }
  });

  /* ---------- Étape 2 : date & heure ---------- */
  function joursDuMois(ym) {
    var first = ym + "-01", out = [], d = first;
    while (d.slice(0, 7) === ym) { out.push(d); d = C.ajouterJours(d, 1); }
    return out;
  }
  function etape2(gardeCalendrier) {
    var duree = totaux().duree;
    var today = C.maintenantParis().slice(0, 10);
    if (!st.mois) st.mois = (st.date || today).slice(0, 7);
    var jours = joursDuMois(st.mois);
    var prev = C.ajouterJours(st.mois + "-01", -1).slice(0, 7), next = C.ajouterJours(jours[jours.length - 1], 1).slice(0, 7);
    var horizon = C.ajouterJours(today, 60).slice(0, 7);

    S.joursDisponibles(jours, duree).then(function (dispo) {
      var html = '<h2 class="booking__title">Choisissez la <em>date</em> et l\'<em>heure</em></h2>' +
        '<p class="booking__hint">' + esc(choisies().map(function (p) { return p.nom; }).join(" + ")) + " · " + totaux().dureeTexte + "</p>" +
        (st.erreur ? '<p class="booking__alert" role="alert">' + esc(st.erreur) + "</p>" : "") +
        '<div class="cal"><div class="cal__head">' +
        '<button class="cal__nav" type="button" data-mois="' + prev + '" aria-label="Mois précédent"' + (prev < today.slice(0, 7) ? " disabled" : "") + ">" + ICON_LEFT + "</button>" +
        '<p class="cal__month" aria-live="polite">' + moisTexte(st.mois) + "</p>" +
        '<button class="cal__nav" type="button" data-mois="' + next + '" aria-label="Mois suivant"' + (next > horizon ? " disabled" : "") + ">" + ICON_RIGHT + "</button></div>" +
        '<div class="cal__grid" role="grid" aria-label="' + moisTexte(st.mois) + '"><div class="cal__row cal__dow" role="row">' +
        ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map(function (x) { return '<span role="columnheader">' + x + "</span>"; }).join("") + '</div><div class="cal__row" role="row">';
      var offset = C.jourSemaine(jours[0]);
      for (var i = 0; i < offset; i++) html += '<span class="cal__empty" role="gridcell"></span>';
      jours.forEach(function (d) {
        var ok = dispo.indexOf(d) !== -1, sel = d === st.date;
        html += '<span role="gridcell"><button class="cal__day' + (sel ? " is-selected" : "") + (d === today ? " is-today" : "") + '" type="button" data-date="' + d + '"' +
          (ok ? "" : ' aria-disabled="true"') + ' aria-label="' + T.dateLongue(d + "T00:00") + (ok ? "" : ", complet ou fermé") + '"' + (sel ? ' aria-pressed="true"' : "") + ">" + (+d.slice(8, 10)) + "</button></span>";
      });
      html += "</div></div>";
      if (!dispo.length) html += '<p class="booking__empty">Aucun créneau ce mois-ci : essayez le mois suivant.</p>';
      html += "</div>";
      html += '<div class="slots" id="slots"></div>';
      html += '<p class="booking__back"><button class="link-arrow" type="button" data-retour="1">' + ICON_LEFT + "Modifier mes prestations</button></p>";
      app.innerHTML = html;
      if (st.date) return S.creneaux(st.date, duree).then(rendreHeures);
      // Premier affichage : on présélectionne le premier jour disponible
      if (!gardeCalendrier && dispo.length) { st.date = dispo[0]; return S.creneaux(st.date, duree).then(function (h) { etape2(true); }); }
    });
  }
  function rendreHeures(heures) {
    var box = document.getElementById("slots");
    if (!box) return;
    box.innerHTML = '<h3 class="slots__title">' + T.dateLongue(st.date + "T00:00") + "</h3>" +
      (heures.length
        ? '<div class="slots__grid" role="group" aria-label="Heures disponibles">' + heures.map(function (h) {
            return '<button class="slot" type="button" data-heure="' + h + '" aria-pressed="' + (h === st.heure) + '">' + h + "</button>";
          }).join("") + "</div>"
        : '<p class="booking__empty">Plus de créneau libre ce jour-là.</p>');
    if (st.date && !document.querySelector(".cal__day.is-selected")) {
      var d = app.querySelector('[data-date="' + st.date + '"]');
      if (d) { d.classList.add("is-selected"); d.setAttribute("aria-pressed", "true"); }
    }
  }

  /* ---------- Étape 3 : coordonnées ---------- */
  function etape3() {
    var t = totaux(), c = st.client;
    app.innerHTML =
      '<h2 class="booking__title">Vos <em>coordonnées</em></h2>' +
      '<div class="recap"><p class="recap__when">' + ICON_CAL + "<span>" + T.dateLongue(st.date + "T00:00") + " à " + heureTexte(st.heure) + "</span></p>" +
      '<p class="recap__what">' + esc(choisies().map(function (p) { return p.nom; }).join(" + ")) + "</p>" +
      '<p class="recap__total">' + t.prixTexte + " · " + t.dureeTexte + "</p></div>" +
      '<form class="form" id="form-client" novalidate>' +
      champ("prenom", "Prénom", "text", c.prenom, 'autocomplete="given-name" required') +
      champ("nom", "Nom", "text", c.nom, 'autocomplete="family-name" required') +
      champ("tel", "Téléphone", "tel", c.tel, 'autocomplete="tel" inputmode="tel" required pattern="[0-9 +.\\-]{10,}"') +
      champ("email", "E-mail", "email", c.email, 'autocomplete="email" required') +
      '<div class="field"><label for="f-message">Message <span class="field__opt">(facultatif)</span></label>' +
      '<textarea id="f-message" name="message" rows="3" placeholder="Une idée de nail art, une précision…">' + esc(c.message) + "</textarea></div>" +
      '<p class="pay-note">' + ICON_WALLET + "<span><strong>Aucun paiement en ligne.</strong> Vous réglez sur place (espèces de préférence, ou PayPal).</span></p>" +
      '<div class="field field--check"><input type="checkbox" id="f-consentement" name="consentement" required' + (c.consentement ? " checked" : "") + ">" +
      '<label for="f-consentement">J\'accepte que mes coordonnées soient utilisées uniquement pour gérer ce rendez-vous.</label></div>' +
      '<p class="form__error" id="form-error" role="alert" hidden></p>' +
      '<button class="btn btn--primary btn--block" type="submit">Confirmer mon rendez-vous</button>' +
      '<p class="booking__back"><button class="link-arrow" type="button" data-retour="2">' + ICON_LEFT + "Changer la date ou l'heure</button></p>" +
      "</form>";
    document.getElementById("form-client").addEventListener("submit", envoyer);
  }
  function champ(name, label, type, value, attrs) {
    return '<div class="field"><label for="f-' + name + '">' + label + '</label><input id="f-' + name + '" name="' + name + '" type="' + type + '" value="' + esc(value) + '" ' + attrs + "></div>";
  }
  var MESSAGES = {
    prenom: "Indiquez votre prénom.", nom: "Indiquez votre nom.", tel: "Indiquez un numéro de téléphone valide.",
    email: "Indiquez une adresse e-mail valide.", consentement: "Merci de cocher la case de consentement."
  };
  function envoyer(e) {
    e.preventDefault();
    var f = e.target, err = document.getElementById("form-error");
    ["prenom", "nom", "tel", "email", "message"].forEach(function (k) { st.client[k] = f.elements[k].value.trim(); });
    st.client.consentement = f.elements.consentement.checked;
    var bad = null;
    Array.prototype.forEach.call(f.querySelectorAll("input"), function (i) {
      var invalid = !i.checkValidity();
      i.setAttribute("aria-invalid", invalid);
      if (invalid && !bad) bad = i;
    });
    if (bad) { err.textContent = MESSAGES[bad.name] || "Vérifiez ce champ."; err.hidden = false; bad.focus(); return; }
    err.hidden = true;
    var btn = f.querySelector("[type=submit]"); btn.disabled = true; btn.textContent = "Confirmation…";
    S.reserver({
      debut: st.date + "T" + st.heure, prestationIds: st.ids, source: "en-ligne",
      client: { prenom: st.client.prenom, nom: st.client.nom, tel: st.client.tel, email: st.client.email, message: st.client.message }
    }).then(function (rdv) {
      st.rdv = rdv; st.ids = []; sauverSelection();
      aller(4);
    }).catch(function (ex) {
      if (ex.code === "CRENEAU_PRIS") {
        st.heure = null; st.erreur = "Ce créneau vient d'être réservé. Choisissez une autre heure.";
        aller(2);
      } else { err.textContent = ex.message || "Une erreur est survenue. Réessayez ou appelez le salon."; err.hidden = false; btn.disabled = false; btn.textContent = "Confirmer mon rendez-vous"; }
    });
  }

  /* ---------- Étape 4 : confirmation ---------- */
  function etape4() {
    var r = st.rdv, adr = cfg.adresse || {};
    var mail = T.emailConfirmation(r, "");
    var maps = "https://www.google.com/maps/dir/?api=1&destination=" + cfg.gps.lat + "," + cfg.gps.lng;
    app.innerHTML =
      '<div class="confirm">' +
      '<span class="confirm__badge">' + ICON_CHECK + "</span>" +
      '<h2 class="booking__title">C\'est <em>réservé</em>, ' + esc(r.client.prenom) + " !</h2>" +
      '<div class="recap recap--big"><p class="recap__when">' + ICON_CAL + "<span>" + T.dateLongue(r.debut) + " à " + heureTexte(r.debut.slice(11, 16)) + "</span></p>" +
      '<ul class="recap__list">' + r.prestations.map(function (p) { return "<li><span>" + esc(p.nom) + "</span><span>" + esc(p.prix) + "</span></li>"; }).join("") + "</ul>" +
      '<p class="recap__total">Total ' + esc(r.totalTexte) + " · " + esc(r.dureeTexte) + "</p>" +
      '<p class="pay-note">' + ICON_WALLET + "<span><strong>Paiement sur place</strong> : espèces de préférence, ou PayPal.</span></p></div>" +
      '<div class="confirm__where"><h3>Adresse</h3><p>' + esc(adr.rue) + "<br>" + esc(adr.codePostal + " " + adr.ville) + "</p>" +
      '<p class="access-note"><span><strong>Accès :</strong> ' + esc(adr.acces) + "</span></p></div>" +
      '<div class="btn-row btn-row--center confirm__actions">' +
      '<button class="btn btn--primary" type="button" data-ics>' + ICON_CAL + "Ajouter à mon agenda</button>" +
      '<a class="btn btn--outline" href="' + maps + '" target="_blank" rel="noopener">' + ICON_MAP + 'Itinéraire<span class="sr-only"> (nouvel onglet)</span></a></div>' +
      '<p class="confirm__manage"><a class="link-arrow" href="' + esc(mail.lien) + '">Gérer mon rendez-vous</a></p>' +
      "</div>" +
      apercuEmail(mail);
  }
  function apercuEmail(mail) {
    return '<section class="mail" aria-labelledby="mail-titre">' +
      '<h3 class="mail__label" id="mail-titre">' + (S.mode === "demo" ? "Aperçu de l'e-mail envoyé" : "E-mail de confirmation") + "</h3>" +
      '<div class="mail__card"><dl class="mail__head"><dt>De</dt><dd>' + esc(mail.de) + "</dd><dt>À</dt><dd>" + esc(mail.a) + "</dd><dt>Objet</dt><dd>" + esc(mail.objet) + "</dd></dl>" +
      '<div class="mail__body"><img src="assets/logo/emn-co-logo-transparent.svg" alt="emn &amp; co" width="140" height="72">' +
      mail.lignes.map(function (l) { return "<p>" + esc(l) + "</p>"; }).join("") +
      '<p><a class="btn btn--dark btn--small" href="' + esc(mail.lien) + '">Gérer mon rendez-vous</a></p></div></div>' +
      (S.mode === "demo" ? '<p class="mail__note">Démonstration : aucun e-mail n\'est réellement envoyé.</p>' : "") +
      "</section>";
  }

  /* ---------- Démarrage ---------- */
  S.getCatalogue().then(function (cat) {
    st.catalogue = cat;
    cat.forEach(function (c) { c.prestations.forEach(function (p) { st.index[p.id] = p; }); });
    try { st.ids = (JSON.parse(sessionStorage.getItem(SELECTION) || "[]") || []).filter(function (id) { var p = st.index[id]; return p && p.actif && !p.telephoneUniquement; }); } catch (e) { st.ids = []; }
    rendre();
  }).catch(function () {
    app.innerHTML = '<p class="booking__alert" role="alert">La réservation est momentanément indisponible. Appelez le salon au <a href="tel:' + esc(cfg.telephoneLien) + '">' + esc(cfg.telephone) + "</a>.</p>";
  });
})();
