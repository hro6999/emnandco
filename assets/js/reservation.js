/* ==========================================================================
   emn & co — Sélection de prestations & récapitulatif (« façon Planity »)
   --------------------------------------------------------------------------
   • Bouton « Choisir » (data-choose="<id>") : ajoute la prestation à la
     sélection et ouvre le récapitulatif.
   • La sélection reste dans le navigateur (sessionStorage), rien n'est envoyé.
   • Étape finale actuelle : « Choisir mon créneau sur Planity ».
     Au brief n°3, seule la fonction etapeSuivante() sera remplacée par le
     choix du créneau sur le site ; la liste, le bouton « Choisir » et le
     récapitulatif restent identiques.
   ========================================================================== */
(function () {
  "use strict";

  var cfg = window.EMN_CONFIG || {};
  var data = window.EMN_PRESTATIONS;
  var R = window.EMN_RENDER;
  if (!data || !R) return;
  if (document.body.hasAttribute("data-sans-panneau")) return; // page Réserver / espace pro : pas de panneau

  var KEY = "emn-selection";
  var INDEX = R.index(data);
  var esc = R.esc;
  var listeners = [];

  /* ---------- Stockage (tolérant : navigation privée, stockage bloqué) ---------- */
  function load() {
    try {
      var ids = JSON.parse(sessionStorage.getItem(KEY) || "[]");
      return Array.isArray(ids) ? ids.filter(function (id) { return INDEX[id]; }) : [];
    } catch (e) { return []; }
  }
  var selection = load();
  function save() {
    try { sessionStorage.setItem(KEY, JSON.stringify(selection)); } catch (e) { /* stockage indisponible */ }
    listeners.forEach(function (fn) { fn(selection.slice()); });
  }

  /* ---------- Calculs ---------- */
  // « 35 € » → 35 ; « 2 € / ongle » → 2 (variable) ; « Sur devis » → null
  function parsePrix(txt) {
    var m = String(txt).replace(",", ".").match(/(\d+(?:\.\d+)?)\s*€/);
    return { valeur: m ? parseFloat(m[1]) : null, variable: !m || /\//.test(txt) };
  }
  // « 1 h 45 » → 105 ; « 55 min » → 55 ; « 1 h » → 60
  function parseDuree(txt) {
    var h = String(txt).match(/(\d+)\s*h(?:\s*(\d+))?/);
    if (h) return parseInt(h[1], 10) * 60 + (h[2] ? parseInt(h[2], 10) : 0);
    var m = String(txt).match(/(\d+)\s*min/);
    return m ? parseInt(m[1], 10) : 0;
  }
  function formatDuree(min) {
    var h = Math.floor(min / 60), m = min % 60;
    if (!h) return m + " min";
    return h + " h" + (m ? " " + (m < 10 ? "0" : "") + m : "");
  }
  function formatPrix(v) {
    return (Math.round(v * 100) / 100).toString().replace(".", ",") + " €";
  }
  function totaux(ids) {
    var prix = 0, duree = 0, variable = false;
    (ids || selection).forEach(function (id) {
      var p = INDEX[id].p, px = parsePrix(p.prix);
      if (px.valeur !== null) prix += px.valeur;
      if (px.variable) variable = true;
      duree += parseDuree(p.duree);
    });
    return { prix: prix, duree: duree, variable: variable, prixTexte: formatPrix(prix), dureeTexte: formatDuree(duree) };
  }

  /* ---------- API publique ---------- */
  var api = {
    items: function () { return selection.map(function (id) { return { id: id, prestation: INDEX[id].p, categorie: INDEX[id].cat }; }); },
    has: function (id) { return selection.indexOf(id) !== -1; },
    add: function (id) { if (INDEX[id] && !api.has(id)) { selection.push(id); save(); } },
    remove: function (id) { selection = selection.filter(function (x) { return x !== id; }); save(); },
    clear: function () { selection = []; save(); },
    totaux: totaux,
    parsePrix: parsePrix,
    parseDuree: parseDuree,
    formatDuree: formatDuree,
    onChange: function (fn) { listeners.push(fn); },
    open: function () { openPanel(); },
    close: function () { closePanel(); }
  };
  window.EMN_RESA = api;

  /* ---------- Étape suivante : réservation sur le site, ou Planity ---------- */
  var SUR_SITE = (cfg.modeReservation || "demo") !== "planity";
  function etapeSuivante() {
    if (SUR_SITE) return '<a class="btn btn--primary btn--block" href="reserver.html">Choisir mon créneau</a>';
    return '<a class="btn btn--primary btn--block" href="' + esc(cfg.planity) + '" target="_blank" rel="noopener" data-planity>' +
      "Choisir mon créneau sur Planity<span class=\"sr-only\"> (nouvel onglet)</span></a>";
  }

  /* ---------- Panneau ---------- */
  var ICON_X = '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M6 6l12 12M18 6L6 18"/></svg>';
  var ICON_INFO = '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></svg>';
  var ICON_SPARK = '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 3.5l1.8 5.2 5.2 1.8-5.2 1.8L12 17.5l-1.8-5.2L5 10.5l5.2-1.8z"/></svg>';

  var dlg = document.createElement("dialog");
  dlg.className = "resa";
  dlg.id = "resa";
  dlg.setAttribute("aria-labelledby", "resa-titre");
  dlg.innerHTML =
    '<div class="resa__head">' +
      '<p class="eyebrow">Votre rendez-vous</p>' +
      '<h2 id="resa-titre">Ma <em>sélection</em></h2>' +
      '<button class="resa__close" type="button" aria-label="Fermer le récapitulatif">' + ICON_X + "</button>" +
    "</div>" +
    '<div class="resa__body" tabindex="-1">' +
      '<ul class="resa__list" aria-live="polite"></ul>' +
      '<p class="resa__empty" hidden>Aucune prestation choisie pour le moment.</p>' +
      '<div class="resa__summary">' +
        '<p class="resa__total"><span>Total <span class="resa__duree"></span></span><strong class="resa__prix"></strong></p>' +
        (SUR_SITE
          ? '<p class="resa__note">Paiement sur place : espèces de préférence, ou PayPal.</p>'
          : '<p class="resa__note">Le prix final est confirmé sur Planity.</p>' +
            '<p class="resa__hint">' + ICON_INFO + '<span class="resa__hint-text"></span></p>') +
      "</div>" +
      '<details class="resa__gtk"><summary>Bon à savoir</summary><div class="good-to-know"><ul>' + R.renderBonASavoir(cfg) + "</ul></div></details>" +
    "</div>" +
    '<div class="resa__foot">' +
      '<div class="resa__next">' + etapeSuivante() + "</div>" +
      '<button class="link-arrow resa__more" type="button">Ajouter une autre prestation</button>' +
    "</div>";
  document.body.appendChild(dlg);

  var pill = document.createElement("button");
  pill.type = "button";
  pill.className = "cart-pill";
  pill.hidden = true;
  pill.innerHTML = '<span class="cart-pill__count">0</span><span class="cart-pill__label">Ma sélection</span>';
  document.body.appendChild(pill);

  var listEl = dlg.querySelector(".resa__list");
  var emptyEl = dlg.querySelector(".resa__empty");
  var summaryEl = dlg.querySelector(".resa__summary");
  var nextEl = dlg.querySelector(".resa__next");
  var opener = null;

  function render() {
    var items = api.items();
    listEl.innerHTML = items.map(function (it) {
      var p = it.prestation;
      return '<li class="resa__item" data-id="' + esc(it.id) + '">' +
        '<span class="resa__name">' + esc(p.nom) + "</span>" +
        '<span class="resa__meta">' + R.ICON.clock + esc(p.duree) + "</span>" +
        '<span class="resa__price">' + esc(p.prix) + "</span>" +
        '<button class="resa__remove" type="button" data-remove="' + esc(it.id) + '" aria-label="Retirer ' + esc(p.nom) + '">' + ICON_X + "</button>" +
        "</li>";
    }).join("");
    var empty = !items.length;
    emptyEl.hidden = !empty;
    summaryEl.hidden = empty;
    nextEl.hidden = empty;
    if (!empty) {
      var t = totaux();
      dlg.querySelector(".resa__prix").textContent = (t.variable ? "à partir de " : "") + t.prixTexte;
      dlg.querySelector(".resa__duree").textContent = "· " + t.dureeTexte;
      if (!SUR_SITE) dlg.querySelector(".resa__hint-text").innerHTML =
        "Sur Planity, choisissez : <strong>" + items.map(function (it) { return esc(it.prestation.nom); }).join("</strong> + <strong>") + "</strong>";
    }
    // Pastille flottante
    pill.hidden = empty;
    pill.querySelector(".cart-pill__count").textContent = items.length;
    pill.setAttribute("aria-label", "Ma sélection : " + items.length + " prestation" + (items.length > 1 ? "s" : "") + (empty ? "" : ", " + totaux().prixTexte));
    // Boutons « Choisir »
    Array.prototype.forEach.call(document.querySelectorAll("[data-choose]"), function (b) {
      var on = api.has(b.getAttribute("data-choose"));
      b.classList.toggle("is-chosen", on);
      var label = b.querySelector(".btn-choose__label");
      if (label) label.textContent = on ? "✓ Choisi" : "Choisir";
    });
  }

  function focusables() {
    return Array.prototype.filter.call(
      dlg.querySelectorAll('a[href], button:not([disabled]), summary, [tabindex]:not([tabindex="-1"])'),
      function (el) { return el.offsetParent !== null; }
    );
  }

  function openPanel(from) {
    opener = from || document.activeElement;
    render();
    if (!dlg.open) dlg.showModal();
    document.documentElement.classList.add("resa-open");
    var first = dlg.querySelector(".resa__close");
    if (first) first.focus();
  }
  function closePanel() { if (dlg.open) dlg.close(); }

  dlg.addEventListener("close", function () {
    document.documentElement.classList.remove("resa-open");
    if (opener && document.contains(opener)) opener.focus();
  });
  // Clic à l'extérieur (sur le fond)
  dlg.addEventListener("click", function (e) {
    if (e.target === dlg) closePanel();
    var rm = e.target.closest("[data-remove]");
    if (rm) {
      api.remove(rm.getAttribute("data-remove"));
      var f = dlg.querySelector("[data-remove]") || dlg.querySelector(".resa__more");
      if (f) f.focus();
    }
  });
  dlg.querySelector(".resa__close").addEventListener("click", closePanel);
  dlg.querySelector(".resa__more").addEventListener("click", function () {
    closePanel();
    if (!document.querySelector(".cats") ) window.location.href = "prestations.html";
  });
  // Piège à focus
  dlg.addEventListener("keydown", function (e) {
    if (e.key !== "Tab") return;
    var f = focusables();
    if (!f.length) return;
    var first = f[0], last = f[f.length - 1];
    if (e.shiftKey && (document.activeElement === first || !dlg.contains(document.activeElement))) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && (document.activeElement === last || !dlg.contains(document.activeElement))) { e.preventDefault(); first.focus(); }
  });

  pill.addEventListener("click", function () { openPanel(pill); });

  document.addEventListener("click", function (e) {
    var b = e.target.closest("[data-choose]");
    if (!b) return;
    api.add(b.getAttribute("data-choose"));
    openPanel(b);
  });

  api.onChange(render);
  api.render = render;
  render();
})();
