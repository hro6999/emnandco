/* ==========================================================================
   emn & co — Scripts du site (v2)
   (Aucune information à modifier ici : voir config.js et prestations-data.js)
   ========================================================================== */
(function () {
  "use strict";

  var cfg = window.EMN_CONFIG || {};
  var data = window.EMN_PRESTATIONS;
  var R = window.EMN_RENDER;
  var H = window.EMN_HORAIRES;
  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }

  /* ---------- 1. Informations issues de config.js ---------- */
  function applyConfig() {
    if ((cfg.modeReservation || "demo") !== "planity") {
      // Réservation sur le site : tous les boutons « Réserver » mènent à reserver.html
      $$("[data-planity]").forEach(function (a) {
        if (/Lire tous les avis/.test(a.textContent)) { a.href = cfg.planity; return; } // les avis restent sur Planity
        a.href = "reserver.html";
        a.removeAttribute("target"); a.removeAttribute("rel");
        $$(".sr-only", a).forEach(function (s) { if (/Planity|onglet/.test(s.textContent)) s.remove(); });
        a.innerHTML = a.innerHTML.replace(/ sur Planity/, " en ligne");
      });
    } else if (cfg.planity) $$("[data-planity]").forEach(function (a) { a.href = cfg.planity; });
    if (cfg.telephoneLien) $$("[data-tel]").forEach(function (a) { a.href = "tel:" + cfg.telephoneLien; });

    var adr = cfg.adresse || {};
    var values = {
      telephone: cfg.telephone && cfg.telephone.replace(/ /g, "\u00a0"),
      rue: adr.rue,
      ville: adr.codePostal && adr.ville ? adr.codePostal + " " + adr.ville : null,
      acces: adr.acces,
      instagramPseudo: cfg.instagramPseudo,
      instagramSpraytanPseudo: cfg.instagramSpraytanPseudo
    };
    $$("[data-cfg]").forEach(function (el) {
      var v = values[el.getAttribute("data-cfg")];
      if (v) el.textContent = v;
    });
    $$("[data-social]").forEach(function (el) {
      var url = cfg[el.getAttribute("data-social")];
      if (url) { el.href = url; el.hidden = false; } else { el.hidden = true; }
    });

    if (cfg.horaires && H) {
      var today = H.jourParis();
      $$("[data-hours='list']").forEach(function (ul) {
        ul.innerHTML = cfg.horaires.map(function (j, i) {
          return "<li" + (i === today ? ' class="is-today"' : "") + "><span>" + j.jour + "</span><span>" + H.plage(j) + "</span></li>";
        }).join("");
      });
      $$("[data-hours='table'] tbody").forEach(function (tb) {
        tb.innerHTML = cfg.horaires.map(function (j, i) {
          var t = i === today;
          return "<tr" + (t ? ' class="is-today" aria-current="date"' : "") + '><th scope="row">' + j.jour +
            (t ? '<span class="sr-only"> (aujourd\'hui)</span>' : "") + "</th><td>" + H.plage(j) + "</td></tr>";
        }).join("");
      });
    }
    if (cfg.paiements) {
      $$("[data-payments]").forEach(function (ul) {
        ul.innerHTML = cfg.paiements.map(function (p) { return "<li>" + R.esc(p) + "</li>"; }).join("");
      });
    }
    if (R) $$("[data-bon-a-savoir]").forEach(function (ul) { ul.innerHTML = R.renderBonASavoir(cfg); });
  }

  /* Statut « Ouvert aujourd'hui jusqu'à… » (mis à jour chaque minute) */
  function updateStatus() {
    if (!H || !cfg.horaires) return;
    var s = H.statut(new Date(), cfg.horaires);
    $$("[data-statut]").forEach(function (el) {
      el.textContent = s.texte;
      el.classList.toggle("is-open", s.ouvert);
      el.classList.toggle("is-closed", !s.ouvert);
    });
  }

  /* ---------- 2. Prestations ---------- */
  function renderPrestations() {
    if (!data || !R) return;
    var menu = $("#carte-prestations");
    var sig = menu && $("[data-sig]", menu);
    var stale = !sig || sig.getAttribute("data-sig") !== R.signature(data, cfg);
    if (menu && stale) menu.innerHTML = R.renderMenu(data, cfg);   // données modifiées depuis le dernier « npm run build »
    var tabs = $("#onglets-liste");
    if (tabs && stale) tabs.innerHTML = R.renderTabs(data);
    var offre = $("[data-offre-accueil]");
    if (offre) {
      var html = R.renderOffreAccueil(data, cfg);
      var section = offre.closest("section");
      if (html) { offre.innerHTML = html; if (section) section.hidden = false; }
      else { offre.innerHTML = ""; if (section) section.hidden = true; }
    }
  }

  /* Accordéon : une catégorie ouverte au départ (ou celle de l'ancre) */
  function initAccordion() {
    var cats = $$(".cat");
    if (!cats.length) return;
    function set(cat, open, animate) {
      var btn = $(".cat__toggle", cat), panel = $(".cat__panel", cat);
      btn.setAttribute("aria-expanded", open ? "true" : "false");
      panel.hidden = !open;
      if (open && animate && !reduceMotion) {
        panel.classList.remove("is-opening"); void panel.offsetWidth; panel.classList.add("is-opening");
      }
    }
    function openFromHash(scroll) {
      var id = decodeURIComponent(location.hash.slice(1));
      var target = id && document.getElementById(id);
      if (target && target.classList.contains("cat")) {
        set(target, true, true);
        if (scroll) target.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" });
        return true;
      }
      return false;
    }
    cats.forEach(function (c, i) { set(c, i === 0, false); });
    openFromHash(false);
    cats.forEach(function (c) {
      $(".cat__toggle", c).addEventListener("click", function () {
        set(c, this.getAttribute("aria-expanded") !== "true", true);
      });
    });
    window.addEventListener("hashchange", function () { openFromHash(true); });
    // Les onglets ouvrent la catégorie visée
    $$(".tabs a").forEach(function (a) {
      a.addEventListener("click", function () {
        var t = document.getElementById(a.getAttribute("href").slice(1));
        if (t) set(t, true, true);
      });
    });
  }

  function initTabs() {
    var nav = $(".tabs");
    if (!nav || !("IntersectionObserver" in window)) return;
    var links = $$("a", nav), map = {}, current = null;
    links.forEach(function (a) { map[a.getAttribute("href").slice(1)] = a; });
    function clear() { links.forEach(function (a) { a.classList.remove("is-active"); a.removeAttribute("aria-current"); }); }
    function reset() { clear(); var ul = $("ul", nav); if (ul) ul.scrollTo({ left: 0 }); }
    function setActive(id) {
      if (current === id || !map[id]) return;
      current = id; clear();
      map[id].classList.add("is-active");
      map[id].setAttribute("aria-current", "location");
      var ul = map[id].closest("ul"), li = map[id].parentNode;
      if (ul && li) ul.scrollTo({ left: li.offsetLeft - 24, behavior: reduceMotion ? "auto" : "smooth" });
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) setActive(e.target.id); });
    }, { rootMargin: "-30% 0px -65% 0px" });
    var sections = $$(".cat");
    sections.forEach(function (s) { io.observe(s); });
    window.addEventListener("scroll", function () {
      if (current && sections[0] && sections[0].getBoundingClientRect().top > window.innerHeight * 0.35) { current = null; reset(); }
    }, { passive: true });
  }

  /* ---------- 3. En-tête & menu mobile ---------- */
  function initHeader() {
    var header = $(".site-header");
    if (header) {
      var onScroll = function () { header.classList.toggle("is-scrolled", window.scrollY > 24); };
      onScroll();
      window.addEventListener("scroll", onScroll, { passive: true });
    }
    var burger = $(".burger"), menu = $("#menu-mobile");
    if (!burger || !menu) return;
    var root = document.documentElement;
    function focusables() { return [burger].concat($$("a[href], button:not([disabled])", menu)); }
    function open() {
      burger.setAttribute("aria-expanded", "true");
      burger.setAttribute("aria-label", "Fermer le menu");
      menu.hidden = false;
      requestAnimationFrame(function () { menu.classList.add("is-open"); });
      root.classList.add("menu-open");
    }
    function close(returnFocus) {
      burger.setAttribute("aria-expanded", "false");
      burger.setAttribute("aria-label", "Ouvrir le menu");
      menu.classList.remove("is-open");
      root.classList.remove("menu-open");
      setTimeout(function () { if (!menu.classList.contains("is-open")) menu.hidden = true; }, reduceMotion ? 0 : 500);
      if (returnFocus) burger.focus();
    }
    burger.addEventListener("click", function () {
      burger.getAttribute("aria-expanded") === "true" ? close(true) : open();
    });
    menu.addEventListener("click", function (e) { if (e.target.closest("a")) close(false); });
    document.addEventListener("keydown", function (e) {
      if (burger.getAttribute("aria-expanded") !== "true") return;
      if (e.key === "Escape") close(true);
      if (e.key === "Tab") {
        var f = focusables(), first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
    window.addEventListener("resize", function () {
      if (window.innerWidth >= 992 && burger.getAttribute("aria-expanded") === "true") close(false);
    });
  }

  /* ---------- 4. Révélations au défilement (décalage 80 ms) ---------- */
  function initReveal() {
    $$("[data-stagger]").forEach(function (group) {
      $$(".reveal", group).forEach(function (el, i) { el.style.setProperty("--d", (i * 0.08) + "s"); });
    });
    var els = $$(".reveal");
    if (reduceMotion || !("IntersectionObserver" in window)) {
      els.forEach(function (el) { el.classList.add("is-visible"); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("is-visible"); io.unobserve(e.target); }
      });
    }, { rootMargin: "0px 0px -6% 0px", threshold: 0.06 });
    els.forEach(function (el) { io.observe(el); });
  }

  /* ---------- 5. Compteurs animés ---------- */
  function initCounters() {
    var els = $$("[data-count]");
    if (!els.length || reduceMotion || !("IntersectionObserver" in window)) return;
    function fmt(v, dec) { return v.toFixed(dec).replace(".", ","); }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        io.unobserve(e.target);
        var el = e.target, to = parseFloat(el.getAttribute("data-count")), dec = (el.getAttribute("data-count").split(".")[1] || "").length;
        var t0 = null, dur = 1600;
        function step(t) {
          if (!t0) t0 = t;
          var k = Math.min(1, (t - t0) / dur), ease = 1 - Math.pow(1 - k, 3);
          el.textContent = fmt(to * ease, dec);
          if (k < 1) requestAnimationFrame(step);
        }
        el.textContent = fmt(0, dec);
        requestAnimationFrame(step);
      });
    }, { threshold: 0.6 });
    els.forEach(function (el) { io.observe(el); });
  }

  /* ---------- 6. Carrousel d'avis ---------- */
  function initReviews() {
    var root = $(".reviews");
    if (!root) return;
    var track = $(".reviews__track", root), slides = $$(".review", root), dotsWrap = $(".reviews__dots", root), index = 0;
    dotsWrap.innerHTML = slides.map(function (_, i) {
      return '<button type="button" class="reviews__dot" aria-label="Avis ' + (i + 1) + " sur " + slides.length + '"></button>';
    }).join("");
    var dots = $$(".reviews__dot", root);
    function update(i) { index = i; dots.forEach(function (d, k) { d.setAttribute("aria-current", k === i ? "true" : "false"); }); }
    function go(i) {
      i = (i + slides.length) % slides.length;
      track.scrollTo({ left: slides[i].offsetLeft - track.offsetLeft, behavior: reduceMotion ? "auto" : "smooth" });
      update(i);
    }
    dots.forEach(function (d, i) { d.addEventListener("click", function () { go(i); }); });
    $(".reviews__prev", root).addEventListener("click", function () { go(index - 1); });
    $(".reviews__next", root).addEventListener("click", function () { go(index + 1); });
    var t;
    track.addEventListener("scroll", function () {
      clearTimeout(t);
      t = setTimeout(function () {
        var i = Math.round(track.scrollLeft / track.clientWidth);
        if (i !== index && slides[i]) update(i);
      }, 80);
    }, { passive: true });
    update(0);
  }

  /* ---------- 7. Galerie : filtres + lightbox ---------- */
  function initGallery() {
    var gallery = $(".gallery");
    if (!gallery) return;
    var items = $$("li", gallery), filters = $$(".filter");
    filters.forEach(function (btn) {
      btn.addEventListener("click", function () {
        var f = btn.getAttribute("data-filter");
        filters.forEach(function (b) { b.setAttribute("aria-pressed", b === btn ? "true" : "false"); });
        items.forEach(function (li) { li.classList.toggle("is-hidden", !(f === "tout" || li.getAttribute("data-cat") === f)); });
        var n = items.filter(function (li) { return !li.classList.contains("is-hidden"); }).length;
        var status = $("#galerie-statut");
        if (status) status.textContent = n + " photo" + (n > 1 ? "s" : "") + " affichée" + (n > 1 ? "s" : "");
      });
    });
    var dlg = $("#lightbox");
    if (!dlg || typeof dlg.showModal !== "function") return;
    var img = $("img", dlg), cap = $("figcaption", dlg), count = $(".lightbox__count", dlg);
    var visible = [], pos = 0, opener = null;
    function show(i) {
      pos = (i + visible.length) % visible.length;
      var b = $("button", visible[pos]), thumb = $("img", b);
      img.src = b.getAttribute("data-full");
      img.alt = thumb.alt;
      cap.textContent = thumb.alt;
      count.textContent = (pos + 1) + " / " + visible.length;
    }
    items.forEach(function (li) {
      $("button", li).addEventListener("click", function () {
        visible = items.filter(function (x) { return !x.classList.contains("is-hidden"); });
        opener = this;
        show(visible.indexOf(li));
        dlg.showModal();
        document.documentElement.classList.add("menu-open");
      });
    });
    dlg.addEventListener("close", function () {
      document.documentElement.classList.remove("menu-open");
      if (opener) opener.focus();
    });
    $(".lightbox__close", dlg).addEventListener("click", function () { dlg.close(); });
    $(".lightbox__prev", dlg).addEventListener("click", function () { show(pos - 1); });
    $(".lightbox__next", dlg).addEventListener("click", function () { show(pos + 1); });
    dlg.addEventListener("click", function (e) { if (e.target === dlg || e.target.tagName === "FIGURE") dlg.close(); });
    dlg.addEventListener("keydown", function (e) {
      if (e.key === "ArrowLeft") { e.preventDefault(); show(pos - 1); }
      if (e.key === "ArrowRight") { e.preventDefault(); show(pos + 1); }
    });
    var x0 = null, y0 = null;
    dlg.addEventListener("touchstart", function (e) { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; }, { passive: true });
    dlg.addEventListener("touchend", function (e) {
      if (x0 === null) return;
      var dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0;
      if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)) show(pos + (dx < 0 ? 1 : -1));
      x0 = y0 = null;
    }, { passive: true });
  }

  /* ---------- 8. Carte Google Maps au clic (RGPD) ---------- */
  function initMap() {
    var btn = $("[data-load-map]");
    if (!btn) return;
    btn.addEventListener("click", function () {
      var box = btn.closest(".map"), g = cfg.gps || { lat: 45.9883468, lng: 4.7183266 };
      var iframe = document.createElement("iframe");
      iframe.src = "https://www.google.com/maps?q=" + g.lat + "," + g.lng + "&z=17&output=embed";
      iframe.title = "Carte : emn & co, " + ((cfg.adresse && cfg.adresse.rue) || "") + ", " + ((cfg.adresse && cfg.adresse.ville) || "");
      iframe.loading = "lazy";
      iframe.referrerPolicy = "no-referrer-when-downgrade";
      iframe.setAttribute("allowfullscreen", "");
      box.innerHTML = "";
      box.appendChild(iframe);
      iframe.focus();
    });
  }

  /* ---------- 9. Focus visible sur une iframe (contenu tiers) ---------- */
  function initIframeFocus() {
    if (!$("iframe")) return;
    window.addEventListener("blur", function () {
      setTimeout(function () {
        var el = document.activeElement;
        if (el && el.tagName === "IFRAME") el.classList.add("has-focus");
      }, 0);
    });
    window.addEventListener("focus", function () {
      $$("iframe.has-focus").forEach(function (f) { f.classList.remove("has-focus"); });
    });
  }

  /* ---------- Lancement ---------- */
  renderPrestations();
  applyConfig();
  updateStatus();
  setInterval(updateStatus, 60000);
  initHeader();
  initAccordion();
  initTabs();
  initReveal();
  initCounters();
  initReviews();
  initGallery();
  initMap();
  initIframeFocus();
})();
