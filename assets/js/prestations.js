/* ==========================================================================
   emn & co — Affichage des prestations (v2)
   Fabrique le HTML de la carte des tarifs à partir de prestations-data.js.
   Utilisé par le navigateur ET par outils/build.mjs (version de secours HTML).
   Pas besoin de modifier ce fichier pour changer un prix.
   ========================================================================== */
(function (root) {
  "use strict";

  var ICON = {
    clock: '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
    phone: '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M6.6 3.5h2.6l1.4 4-2 1.3a12 12 0 0 0 6.6 6.6l1.3-2 4 1.4v2.6a2 2 0 0 1-2.2 2A17 17 0 0 1 4.6 5.7a2 2 0 0 1 2-2.2z"/></svg>',
    insta: '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect x="3.5" y="3.5" width="17" height="17" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.2" cy="6.8" r=".6" fill="currentColor"/></svg>',
    chev: '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M6 9l6 6 6-6"/></svg>',
    plus: '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 5v14M5 12h14"/></svg>'
  };

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  /* Identifiant stable d'une prestation (réutilisable au brief n°3) */
  function slug(s) {
    return String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  }
  function idOf(cat, p) { return cat.id + "--" + slug(p.nom); }

  /* Index : id → { prestation, catégorie } */
  function index(data) {
    var map = {};
    data.categories.forEach(function (c) {
      c.prestations.forEach(function (p) { map[idOf(c, p)] = { p: p, cat: c }; });
    });
    return map;
  }

  function visibleCategories(data) {
    return data.categories.filter(function (c) { return !(c.offre && !data.offresActives); });
  }

  function price(p) {
    var html = '<span class="svc__price-now">' + esc(p.prix) + "</span>";
    if (p.prixAvant) {
      html += '<span class="svc__price-old"><span class="sr-only">au lieu de </span><del>' + esc(p.prixAvant) + "</del></span>";
    }
    return html;
  }

  function action(p, id, cfg) {
    if (p.telephoneUniquement) {
      return '<a class="btn-choose btn-choose--call" href="tel:' + esc(cfg.telephoneLien) + '" data-tel>' +
        ICON.phone + "Appeler pour réserver</a>";
    }
    return '<button class="btn-choose" type="button" data-choose="' + esc(id) + '">' +
      '<span class="btn-choose__label">Choisir</span><span class="sr-only"> ' + esc(p.nom) + "</span></button>";
  }

  /* Une ligne de prestation (nom, durée, prix, détails, bouton) */
  function item(cat, p, cfg) {
    var id = idOf(cat, p);
    return (
      '<li class="svc' + (p.prixAvant ? " svc--promo" : "") + '" data-id="' + esc(id) + '">' +
        '<div class="svc__main">' +
          '<h3 class="svc__name">' + esc(p.nom) + "</h3>" +
          '<p class="svc__meta"><span class="svc__duree">' + ICON.clock +
            '<span class="sr-only">Durée : </span>' + esc(p.duree) + "</span>" +
            (p.badge ? '<span class="badge">' + esc(p.badge) + "</span>" : "") + "</p>" +
          (p.description
            ? '<details class="svc__more"><summary>Plus de détails' + ICON.chev + "</summary><p>" + esc(p.description) + "</p></details>"
            : "") +
        "</div>" +
        '<div class="svc__side">' +
          '<p class="svc__price">' + price(p) + "</p>" +
          action(p, id, cfg) +
        "</div>" +
      "</li>"
    );
  }

  /* Onglets d'ancres */
  function renderTabs(data) {
    return visibleCategories(data).map(function (c) {
      return '<li><a href="#' + esc(c.id) + '">' + esc(c.onglet || c.titre) + "</a></li>";
    }).join("");
  }

  /* Carte complète en accordéon. Version HTML : tout est ouvert (lisible sans JavaScript). */
  function renderMenu(data, cfg) {
    return visibleCategories(data).map(function (c) {
      var n = c.prestations.length;
      var insta = "";
      if (c.instagram && cfg.instagramSpraytan) {
        insta = '<p class="cat__insta">Les résultats en images sur <a href="' + esc(cfg.instagramSpraytan) +
          '" target="_blank" rel="noopener">' + ICON.insta + esc(cfg.instagramSpraytanPseudo) +
          '<span class="sr-only"> (nouvel onglet)</span></a></p>';
      }
      return (
        '<section class="cat' + (c.offre ? " cat--offre on-night" : "") + '" id="' + esc(c.id) + '" aria-labelledby="cat-btn-' + esc(c.id) + '">' +
          '<h2 class="cat__title"><button class="cat__toggle" type="button" id="cat-btn-' + esc(c.id) +
            '" aria-expanded="true" aria-controls="cat-panel-' + esc(c.id) + '">' +
            '<span class="cat__label">' + esc(c.titre) + "</span>" +
            '<span class="cat__count">' + n + " soin" + (n > 1 ? "s" : "") + "</span>" +
            '<span class="cat__chev">' + ICON.chev + "</span>" +
          "</button></h2>" +
          '<div class="cat__panel" id="cat-panel-' + esc(c.id) + '">' +
            (c.intro ? '<p class="cat__intro">' + esc(c.intro) + "</p>" : "") +
            (c.badge ? '<p class="cat__badge"><span class="badge">' + esc(c.badge) + "</span></p>" : "") +
            insta +
            '<ul class="svc-list">' + c.prestations.map(function (p) { return item(c, p, cfg); }).join("") + "</ul>" +
          "</div>" +
        "</section>"
      );
    }).join("");
  }

  /* Offre du moment de la page d'accueil (liste seule) */
  function renderOffreAccueil(data, cfg) {
    var c = data.categories.filter(function (x) { return x.offre; })[0];
    if (!c || !data.offresActives) return "";
    return '<ul class="svc-list">' + c.prestations.map(function (p) { return item(c, p, cfg); }).join("") + "</ul>";
  }

  /* Encart « Bon à savoir » (liste) */
  function renderBonASavoir(cfg) {
    return (cfg.bonASavoir || []).map(function (t) { return "<li>" + esc(t) + "</li>"; }).join("");
  }

  /* Empreinte des données : si la version HTML porte la même, inutile de la refaire */
  function signature(data, cfg) {
    var s = JSON.stringify([data, cfg.planity, cfg.telephoneLien, cfg.instagramSpraytan, cfg.instagramSpraytanPseudo]);
    var h = 5381;
    for (var i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
    return (h >>> 0).toString(36);
  }

  var api = {
    signature: signature,
    renderTabs: renderTabs, renderMenu: renderMenu, renderOffreAccueil: renderOffreAccueil,
    renderBonASavoir: renderBonASavoir, index: index, idOf: idOf, esc: esc, ICON: ICON
  };
  root.EMN_RENDER = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : this);
