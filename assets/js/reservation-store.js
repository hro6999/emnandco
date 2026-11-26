/* ==========================================================================
   emn & co — Accès aux données de réservation (un seul fichier)
   --------------------------------------------------------------------------
   Toute la réservation (page Réserver, Mon rendez-vous, Espace pro) passe par
   window.EMN_STORE. Deux implémentations, même interface :
     • "demo" : tout dans le navigateur (localStorage), aucun serveur ;
     • "site" : Supabase (voir supabase/installation.sql et GUIDE-MISE-EN-SERVICE.md).
   Toutes les méthodes renvoient des Promesses. Heures = heure de Paris,
   au format "YYYY-MM-DDTHH:MM".
   ========================================================================== */
(function () {
  "use strict";

  var cfg = window.EMN_CONFIG || {};
  var C = window.EMN_CRENEAUX;
  var DATA = window.EMN_PRESTATIONS;
  var R = window.EMN_RENDER;

  /* ---------- Outils communs ---------- */
  function parsePrix(txt) {
    var m = String(txt).replace(",", ".").match(/(\d+(?:\.\d+)?)\s*€/);
    return { valeur: m ? parseFloat(m[1]) : null, variable: !m || /\//.test(txt) };
  }
  function parseDuree(txt) {
    var h = String(txt).match(/(\d+)\s*h(?:\s*(\d+))?/);
    if (h) return +h[1] * 60 + (h[2] ? +h[2] : 0);
    var m = String(txt).match(/(\d+)\s*min/);
    return m ? +m[1] : 0;
  }
  function formatDuree(min) {
    var h = Math.floor(min / 60), m = min % 60;
    return h ? h + " h" + (m ? " " + (m < 10 ? "0" : "") + m : "") : m + " min";
  }
  function formatPrix(v) { return (Math.round(v * 100) / 100).toString().replace(".", ",") + " €"; }
  function total(prestations) {
    var prix = 0, duree = 0, variable = false;
    prestations.forEach(function (p) {
      var px = parsePrix(p.prix);
      if (px.valeur !== null) prix += px.valeur;
      if (px.variable) variable = true;
      duree += parseDuree(p.duree);
    });
    return { prix: prix, duree: duree, variable: variable, prixTexte: (variable ? "à partir de " : "") + formatPrix(prix), dureeTexte: formatDuree(duree) };
  }
  function jeton() {
    var a = new Uint8Array(16);
    (window.crypto || window.msCrypto).getRandomValues(a);
    return Array.prototype.map.call(a, function (b) { return ("0" + b.toString(16)).slice(-2); }).join("");
  }
  function erreur(code, message) { var e = new Error(message); e.code = code; return e; }

  var REGLAGES_DEFAUT = {
    pauseMin: 60, intervalleMin: 60, delaiMinHeures: 2, horizonJours: 60, annulationHeures: 24,
    horaires: (cfg.horaires || []).map(function (j) {
      return j.ferme ? { jour: j.jour, ferme: true } : { jour: j.jour, ouverture: j.ouverture, fermeture: j.fermeture };
    })
  };

  /* Catalogue (prestations-data.js + modifications de l'espace pro) */
  function catalogue(overrides) {
    overrides = overrides || {};
    return DATA.categories.filter(function (c) { return !(c.offre && !DATA.offresActives); }).map(function (c) {
      return {
        id: c.id, titre: c.titre, intro: c.intro, offre: !!c.offre,
        prestations: c.prestations.map(function (p) {
          var id = R.idOf(c, p), o = overrides[id] || {};
          return {
            id: id, nom: p.nom, description: p.description, badge: p.badge, prixAvant: p.prixAvant,
            telephoneUniquement: !!p.telephoneUniquement,
            prix: o.prix || p.prix, duree: o.duree || p.duree, actif: o.actif !== false
          };
        })
      };
    });
  }
  function indexCatalogue(cats) {
    var map = {};
    cats.forEach(function (c) { c.prestations.forEach(function (p) { map[p.id] = p; }); });
    return map;
  }

  /* Fichier .ics (agenda) */
  function ics(rdv) {
    function f(dt) { return dt.replace(/[-:]/g, "") + "00"; }
    var adr = cfg.adresse || {};
    return [
      "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//emn & co//Reservation//FR", "CALSCALE:GREGORIAN", "METHOD:PUBLISH",
      "BEGIN:VEVENT",
      "UID:" + rdv.token + "@emnandco",
      "DTSTAMP:" + new Date().toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z",
      "DTSTART;TZID=Europe/Paris:" + f(rdv.debut),
      "DTEND;TZID=Europe/Paris:" + f(rdv.fin),
      "SUMMARY:Rendez-vous emn & co",
      "DESCRIPTION:" + rdv.prestations.map(function (p) { return p.nom; }).join(" + ") + "\\nPaiement sur place.",
      "LOCATION:" + [adr.rue, adr.codePostal + " " + adr.ville].join("\\, "),
      "END:VEVENT", "END:VCALENDAR"
    ].join("\r\n");
  }

  /* Aperçu de l'e-mail de confirmation (mode démo ; en mode site, il est envoyé par le serveur) */
  function emailConfirmation(rdv, base) {
    var lien = (base || "") + "mon-rdv.html?token=" + rdv.token;
    return {
      de: "emn & co <rendez-vous@emnandco.fr>",
      a: rdv.client.email,
      objet: "Votre rendez-vous emn & co est confirmé",
      lien: lien,
      lignes: [
        "Bonjour " + rdv.client.prenom + ",",
        "Votre rendez-vous est confirmé le " + dateLongue(rdv.debut) + " à " + (window.EMN_HORAIRES ? window.EMN_HORAIRES.formatHeure(rdv.debut.slice(11, 16)) : rdv.debut.slice(11, 16)) + ".",
        "Prestations : " + rdv.prestations.map(function (p) { return p.nom; }).join(" + ") + " (" + rdv.totalTexte + ", " + rdv.dureeTexte + ").",
        "Paiement sur place : espèces de préférence, ou PayPal.",
        "Adresse : " + (cfg.adresse || {}).rue + ", " + (cfg.adresse || {}).codePostal + " " + (cfg.adresse || {}).ville + ". " + (cfg.adresse || {}).acces,
        "Vous pouvez annuler ou déplacer votre rendez-vous jusqu'à 24 h avant."
      ]
    };
  }
  var JOURS = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"];
  var MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
  function dateLongue(dt) {
    var d = dt.slice(0, 10);
    return JOURS[C.jourSemaine(d)] + " " + (+d.slice(8, 10)) + " " + MOIS[+d.slice(5, 7) - 1] + " " + d.slice(0, 4);
  }

  /* ========================================================================
     Implémentation « demo » (localStorage)
     ======================================================================== */
  function storeDemo() {
    var KEY = "emn-demo-v1", SESSION = "emn-demo-pro";
    var PRENOMS = ["Léa", "Camille", "Inès", "Manon", "Chloé", "Sarah", "Julie", "Emma", "Jade", "Louise", "Lina", "Zoé", "Alice", "Clara", "Anaïs", "Maëlle"];
    var NOMS = ["M.", "D.", "B.", "R.", "L.", "P.", "G.", "C."];

    function lire() {
      try { return JSON.parse(localStorage.getItem(KEY)) || null; } catch (e) { return null; }
    }
    var memoire = null; // secours si le stockage est bloqué
    function charger() {
      var s = lire() || memoire;
      if (!s) { s = initial(); ecrire(s); }
      return s;
    }
    function ecrire(s) {
      memoire = s;
      try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) { /* stockage indisponible : mémoire */ }
    }

    /* Une quinzaine de faux rendez-vous sur les deux prochaines semaines */
    function initial() {
      var s = { reglages: JSON.parse(JSON.stringify(REGLAGES_DEFAUT)), overrides: {}, rdvs: [], blocages: [] };
      var cats = catalogue({}), choix = [];
      cats.forEach(function (c) { c.prestations.forEach(function (p) { if (!p.telephoneUniquement && !c.offre) choix.push(p); }); });
      var now = C.maintenantParis(), today = now.slice(0, 10), graine = 7, n = 0;
      function alea(max) { graine = (graine * 9301 + 49297) % 233280; return Math.floor(graine / 233280 * max); }
      for (var j = 1; j <= 14 && n < 15; j++) {
        var date = C.ajouterJours(today, j);
        var parJour = alea(3) + (C.jourSemaine(date) === 5 ? 1 : 0);
        for (var k = 0; k < parJour && n < 15; k++) {
          var p = choix[alea(choix.length)];
          var duree = parseDuree(p.duree);
          var libres = C.creneauxDuJour({
            date: date, dureeMin: duree, horaires: s.reglages.horaires, rdvs: s.rdvs, blocages: [],
            pauseMin: s.reglages.pauseMin, intervalleMin: s.reglages.intervalleMin, maintenant: now, delaiMinMin: 0, horizonJours: 60
          });
          if (!libres.length) continue;
          var debut = date + "T" + libres[alea(libres.length)];
          s.rdvs.push(nouveauRdv(debut, [p], {
            prenom: PRENOMS[n % PRENOMS.length], nom: NOMS[alea(NOMS.length)],
            tel: "06 00 00 00 " + (10 + n), email: "cliente" + (n + 1) + "@exemple.fr", message: ""
          }, n % 4 === 0 ? "telephone" : "en-ligne", true));
          n++;
        }
      }
      return s;
    }

    function nouveauRdv(debut, prestations, client, source, fictif) {
      var t = total(prestations);
      return {
        id: jeton().slice(0, 10), token: jeton(), debut: debut, fin: C.ajouterMinutes(debut, t.duree),
        prestations: prestations.map(function (p) { return { id: p.id, nom: p.nom, prix: p.prix, duree: p.duree }; }),
        total: t.prix, totalTexte: t.prixTexte, dureeMin: t.duree, dureeTexte: t.dureeTexte,
        client: client, statut: "confirme", source: source, fictif: !!fictif, creeLe: C.maintenantParis()
      };
    }

    function actifs(s) { return s.rdvs.filter(function (r) { return r.statut !== "annule"; }); }
    function opts(s, extra) {
      var r = s.reglages;
      var o = {
        horaires: r.horaires, rdvs: actifs(s), blocages: s.blocages, pauseMin: r.pauseMin, intervalleMin: r.intervalleMin,
        delaiMinMin: r.delaiMinHeures * 60, horizonJours: r.horizonJours, maintenant: C.maintenantParis()
      };
      for (var k in extra) o[k] = extra[k];
      return o;
    }
    function estLibre(s, debut, dureeMin, ignorerId, pro) {
      var autres = { rdvs: actifs(s).filter(function (r) { return r.id !== ignorerId; }) };
      if (pro) { autres.delaiMinMin = 0; autres.horizonJours = 3650; autres.intervalleMin = 5; }
      return C.creneauxDuJour(opts(s, Object.assign({ date: debut.slice(0, 10), dureeMin: dureeMin }, autres))).indexOf(debut.slice(11, 16)) !== -1;
    }
    function ok(v) { return Promise.resolve(JSON.parse(JSON.stringify(v))); }
    function ko(e) { return Promise.reject(e); }

    return {
      mode: "demo",
      getReglages: function () { return ok(charger().reglages); },
      setReglages: function (patch) { var s = charger(); Object.assign(s.reglages, patch); ecrire(s); return ok(s.reglages); },
      getCatalogue: function () { return ok(catalogue(charger().overrides)); },
      setPrestation: function (id, patch) {
        var s = charger(); s.overrides[id] = Object.assign(s.overrides[id] || {}, patch); ecrire(s); return ok(true);
      },
      creneaux: function (date, dureeMin) { var s = charger(); return ok(C.creneauxDuJour(opts(s, { date: date, dureeMin: dureeMin }))); },
      joursDisponibles: function (dates, dureeMin) {
        var s = charger();
        return ok(dates.filter(function (d) { return C.creneauxDuJour(opts(s, { date: d, dureeMin: dureeMin })).length > 0; }));
      },
      reserver: function (demande) {
        var s = charger(), idx = indexCatalogue(catalogue(s.overrides));
        var prestations = demande.prestationIds.map(function (id) { return idx[id]; }).filter(Boolean);
        if (!prestations.length) return ko(erreur("INVALIDE", "Aucune prestation choisie."));
        var t = total(prestations), pro = demande.source === "telephone";
        if (!estLibre(s, demande.debut, t.duree, null, pro)) return ko(erreur("CRENEAU_PRIS", "Ce créneau vient d'être réservé."));
        var rdv = nouveauRdv(demande.debut, prestations, demande.client, demande.source || "en-ligne");
        s.rdvs.push(rdv); ecrire(s);
        return ok(rdv);
      },
      rdvParToken: function (token) {
        var r = charger().rdvs.filter(function (x) { return x.token === token; })[0];
        return r ? ok(r) : ko(erreur("INTROUVABLE", "Rendez-vous introuvable."));
      },
      annulerParToken: function (token) {
        var s = charger(), r = s.rdvs.filter(function (x) { return x.token === token; })[0];
        if (!r) return ko(erreur("INTROUVABLE", "Rendez-vous introuvable."));
        if (!modifiable(s, r)) return ko(erreur("DELAI", "Le délai d'annulation est dépassé."));
        r.statut = "annule"; ecrire(s); return ok(r);
      },
      deplacerParToken: function (token, debut) {
        var s = charger(), r = s.rdvs.filter(function (x) { return x.token === token; })[0];
        if (!r) return ko(erreur("INTROUVABLE", "Rendez-vous introuvable."));
        if (!modifiable(s, r)) return ko(erreur("DELAI", "Le délai de modification est dépassé."));
        if (!estLibre(s, debut, r.dureeMin, r.id)) return ko(erreur("CRENEAU_PRIS", "Ce créneau vient d'être réservé."));
        r.debut = debut; r.fin = C.ajouterMinutes(debut, r.dureeMin); ecrire(s); return ok(r);
      },
      creneauxPourDeplacer: function (token, date) {
        var s = charger(), r = s.rdvs.filter(function (x) { return x.token === token; })[0];
        if (!r) return ok([]);
        return ok(C.creneauxDuJour(opts(s, { date: date, dureeMin: r.dureeMin, rdvs: actifs(s).filter(function (x) { return x.id !== r.id; }) })));
      },

      /* ----- Espace pro ----- */
      connexion: function (email, mdp) {
        if (String(email).trim().toLowerCase() === "demo@emnandco.fr" && mdp === "demo") {
          try { sessionStorage.setItem(SESSION, "1"); } catch (e) { /* */ }
          return ok(true);
        }
        return ko(erreur("IDENTIFIANTS", "Identifiant ou mot de passe incorrect."));
      },
      deconnexion: function () { try { sessionStorage.removeItem(SESSION); } catch (e) { /* */ } return ok(true); },
      estConnecte: function () { try { return ok(sessionStorage.getItem(SESSION) === "1"); } catch (e) { return ok(false); } },
      listerRdv: function (de, a) {
        return ok(charger().rdvs.filter(function (r) { return r.debut.slice(0, 10) >= de && r.debut.slice(0, 10) <= a; })
          .sort(function (x, y) { return x.debut < y.debut ? -1 : 1; }));
      },
      majRdv: function (id, patch) {
        var s = charger(), r = s.rdvs.filter(function (x) { return x.id === id; })[0];
        if (!r) return ko(erreur("INTROUVABLE", "Rendez-vous introuvable."));
        if (patch.debut && patch.debut !== r.debut) {
          if (!estLibre(s, patch.debut, r.dureeMin, r.id, true)) return ko(erreur("CRENEAU_PRIS", "Ce créneau n'est pas libre."));
          r.debut = patch.debut; r.fin = C.ajouterMinutes(patch.debut, r.dureeMin);
        }
        if (patch.statut) r.statut = patch.statut;
        ecrire(s); return ok(r);
      },
      listerBlocages: function () { return ok(charger().blocages.slice().sort(function (a, b) { return a.debut < b.debut ? -1 : 1; })); },
      ajouterBlocage: function (b) {
        var s = charger(); var x = { id: jeton().slice(0, 10), debut: b.debut, fin: b.fin, type: b.type || "blocage", motif: b.motif || "" };
        s.blocages.push(x); ecrire(s); return ok(x);
      },
      supprimerBlocage: function (id) { var s = charger(); s.blocages = s.blocages.filter(function (b) { return b.id !== id; }); ecrire(s); return ok(true); },
      reinitialiser: function () { try { localStorage.removeItem(KEY); } catch (e) { /* */ } memoire = null; charger(); return ok(true); }
    };

    function modifiable(s, r) {
      var limite = C.ajouterMinutes(C.maintenantParis(), s.reglages.annulationHeures * 60);
      return r.statut === "confirme" && r.debut >= limite;
    }
  }

  /* ========================================================================
     Implémentation « site » (Supabase) — voir supabase/installation.sql
     ======================================================================== */
  function storeSupabase() {
    var url = (cfg.supabase && cfg.supabase.url || "").replace(/\/$/, "");
    var cle = cfg.supabase && cfg.supabase.clePublique;
    var SESSION = "emn-supabase-session";
    function session() { try { return JSON.parse(sessionStorage.getItem(SESSION)); } catch (e) { return null; } }
    function appel(chemin, options) {
      options = options || {};
      var s = session();
      var headers = { apikey: cle, "Content-Type": "application/json", Authorization: "Bearer " + (s ? s.access_token : cle) };
      return fetch(url + chemin, { method: options.method || "GET", headers: Object.assign(headers, options.headers || {}), body: options.body ? JSON.stringify(options.body) : undefined })
        .then(function (r) {
          return r.text().then(function (t) {
            var data = t ? JSON.parse(t) : null;
            if (!r.ok) {
              var msg = (data && (data.message || data.error_description || data.msg)) || "Erreur du serveur";
              throw erreur(/CRENEAU_PRIS/.test(msg) ? "CRENEAU_PRIS" : (data && data.code) || "SERVEUR", /CRENEAU_PRIS/.test(msg) ? "Ce créneau vient d'être réservé." : msg);
            }
            return data;
          });
        });
    }
    function rpc(nom, args) { return appel("/rest/v1/rpc/" + nom, { method: "POST", body: args || {} }); }
    var cacheReglages = null, cacheOcc = {};

    function reglages() {
      if (cacheReglages) return Promise.resolve(cacheReglages);
      return rpc("reglages_publics").then(function (r) { cacheReglages = r; return r; });
    }
    function occupation(de, a) {
      var k = de + a;
      if (cacheOcc[k]) return Promise.resolve(cacheOcc[k]);
      return rpc("occupation", { p_de: de, p_a: a }).then(function (o) { cacheOcc[k] = o; return o; });
    }
    function calcul(date, dureeMin, occ, r, extra) {
      return C.creneauxDuJour(Object.assign({
        date: date, dureeMin: dureeMin, horaires: r.horaires, rdvs: occ.rdvs || [], blocages: occ.blocages || [],
        pauseMin: r.pauseMin, intervalleMin: r.intervalleMin, delaiMinMin: r.delaiMinHeures * 60, horizonJours: r.horizonJours
      }, extra || {}));
    }

    return {
      mode: "site",
      getReglages: reglages,
      setReglages: function (patch) { cacheReglages = null; return rpc("maj_reglages", { p_reglages: patch }); },
      getCatalogue: function () {
        return appel("/rest/v1/prestations?select=id,prix,duree,actif").then(function (rows) {
          var o = {}; (rows || []).forEach(function (x) { o[x.id] = x; }); return catalogue(o);
        });
      },
      setPrestation: function (id, patch) { return appel("/rest/v1/prestations?id=eq." + encodeURIComponent(id), { method: "PATCH", body: patch }); },
      creneaux: function (date, dureeMin) {
        return Promise.all([reglages(), occupation(date, date)]).then(function (x) { return calcul(date, dureeMin, x[1], x[0]); });
      },
      joursDisponibles: function (dates, dureeMin) {
        if (!dates.length) return Promise.resolve([]);
        return Promise.all([reglages(), occupation(dates[0], dates[dates.length - 1])]).then(function (x) {
          return dates.filter(function (d) { return calcul(d, dureeMin, x[1], x[0]).length > 0; });
        });
      },
      reserver: function (d) {
        cacheOcc = {};
        return rpc("reserver", { p_debut: d.debut, p_prestations: d.prestationIds, p_client: d.client, p_source: d.source || "en-ligne" });
      },
      rdvParToken: function (t) { return rpc("rdv_par_token", { p_token: t }); },
      annulerParToken: function (t) { cacheOcc = {}; return rpc("annuler_par_token", { p_token: t }); },
      deplacerParToken: function (t, debut) { cacheOcc = {}; return rpc("deplacer_par_token", { p_token: t, p_debut: debut }); },
      creneauxPourDeplacer: function (t, date) {
        return Promise.all([reglages(), rpc("occupation", { p_de: date, p_a: date, p_sauf_token: t }), rpc("rdv_par_token", { p_token: t })])
          .then(function (x) { return calcul(date, x[2].dureeMin, x[1], x[0]); });
      },
      connexion: function (email, mdp) {
        return fetch(url + "/auth/v1/token?grant_type=password", {
          method: "POST", headers: { apikey: cle, "Content-Type": "application/json" }, body: JSON.stringify({ email: email, password: mdp })
        }).then(function (r) { return r.json().then(function (j) {
          if (!r.ok) throw erreur("IDENTIFIANTS", "Identifiant ou mot de passe incorrect.");
          sessionStorage.setItem(SESSION, JSON.stringify(j)); return true;
        }); });
      },
      deconnexion: function () { sessionStorage.removeItem(SESSION); return Promise.resolve(true); },
      estConnecte: function () { return Promise.resolve(!!session()); },
      listerRdv: function (de, a) { return rpc("pro_lister_rdv", { p_de: de, p_a: a }); },
      majRdv: function (id, patch) { cacheOcc = {}; return rpc("pro_maj_rdv", { p_id: id, p_debut: patch.debut || null, p_statut: patch.statut || null }); },
      listerBlocages: function () { return rpc("pro_lister_blocages"); },
      ajouterBlocage: function (b) { cacheOcc = {}; return rpc("pro_ajouter_blocage", { p_debut: b.debut, p_fin: b.fin, p_type: b.type || "blocage", p_motif: b.motif || "" }); },
      supprimerBlocage: function (id) { cacheOcc = {}; return appel("/rest/v1/blocages?id=eq." + encodeURIComponent(id), { method: "DELETE" }); },
      reinitialiser: function () { return Promise.reject(erreur("INDISPONIBLE", "Réservé au mode démo.")); }
    };
  }

  var mode = cfg.modeReservation || "demo";
  var store = mode === "site" ? storeSupabase() : storeDemo();
  store.outils = { total: total, parseDuree: parseDuree, formatDuree: formatDuree, formatPrix: formatPrix, ics: ics, emailConfirmation: emailConfirmation, dateLongue: dateLongue, JOURS: JOURS, MOIS: MOIS };
  window.EMN_STORE = store;
})();
