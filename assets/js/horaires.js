/* ==========================================================================
   emn & co — Statut d'ouverture (« Ouvert aujourd'hui jusqu'à… »)
   Calculé à l'heure de Paris à partir des horaires de config.js.
   Pas besoin de modifier ce fichier : changez les horaires dans config.js.
   ========================================================================== */
(function (root) {
  "use strict";

  var JOURS_EN = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };

  function minutes(hhmm) {
    var p = String(hhmm).split(":");
    return parseInt(p[0], 10) * 60 + parseInt(p[1] || "0", 10);
  }

  /* « 19:30 » → « 19 h 30 », « 10:00 » → « 10 h » */
  function formatHeure(hhmm) {
    var p = String(hhmm).split(":");
    return parseInt(p[0], 10) + " h" + (p[1] && p[1] !== "00" ? " " + p[1] : "");
  }

  function plage(j) {
    return j.ferme ? "Fermé" : formatHeure(j.ouverture) + " – " + formatHeure(j.fermeture);
  }

  /* Jour (0 = lundi) et minutes écoulées, à l'heure de Paris */
  function heureParis(date) {
    var parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/Paris", weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23"
    }).formatToParts(date);
    var o = {};
    parts.forEach(function (x) { o[x.type] = x.value; });
    return { jour: JOURS_EN[o.weekday], min: parseInt(o.hour, 10) * 60 + parseInt(o.minute, 10) };
  }

  /* Statut à une date donnée → { ouvert: bool, texte: "…" } */
  function statut(date, horaires) {
    var t = heureParis(date || new Date());
    var auj = horaires[t.jour];
    if (auj && !auj.ferme) {
      var o = minutes(auj.ouverture), f = minutes(auj.fermeture);
      if (t.min >= o && t.min < f) {
        return { ouvert: true, texte: "Ouvert aujourd'hui jusqu'à " + formatHeure(auj.fermeture) };
      }
      if (t.min < o) {
        return { ouvert: false, texte: "Fermé, ouverture aujourd'hui à " + formatHeure(auj.ouverture) };
      }
    }
    for (var k = 1; k <= 7; k++) {
      var j = horaires[(t.jour + k) % 7];
      if (j && !j.ferme) {
        return { ouvert: false, texte: "Fermé, réouverture " + j.jour.toLowerCase() + " à " + formatHeure(j.ouverture) };
      }
    }
    return { ouvert: false, texte: "Fermé" };
  }

  var api = { statut: statut, plage: plage, formatHeure: formatHeure, jourParis: function (d) { return heureParis(d || new Date()).jour; } };
  root.EMN_HORAIRES = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : this);
