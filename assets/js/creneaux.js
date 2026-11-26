/* ==========================================================================
   emn & co — Calcul des créneaux disponibles (module isolé, sans dépendance)
   --------------------------------------------------------------------------
   Toutes les heures sont exprimées à l'heure de Paris, sous forme de texte :
     date "2026-12-01", heure "10:00", date-heure "2026-12-01T10:00".
   Règles :
   • on part des horaires du jour, on retire congés et plages bloquées ;
   • chaque rendez-vous occupe sa durée + la pause qui le suit ;
   • un nouveau rendez-vous doit lui aussi laisser la pause avant le suivant ;
   • heures de début alignées sur l'intervalle (60, 30 ou 15 min) ;
   • la prestation doit être terminée à l'heure de fermeture ;
   • on retire les créneaux trop proches (délai minimum) ou trop lointains.
   ========================================================================== */
(function (root) {
  "use strict";

  function toMin(hhmm) { var p = String(hhmm).split(":"); return +p[0] * 60 + +(p[1] || 0); }
  function toHHMM(min) { var h = Math.floor(min / 60), m = min % 60; return (h < 10 ? "0" : "") + h + ":" + (m < 10 ? "0" : "") + m; }
  function pad(n) { return (n < 10 ? "0" : "") + n; }

  /* "2026-12-01" → 0 (lundi) … 6 (dimanche) */
  function jourSemaine(date) { return (new Date(date + "T12:00:00Z").getUTCDay() + 6) % 7; }
  function ajouterJours(date, n) {
    var d = new Date(date + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + n);
    return d.getUTCFullYear() + "-" + pad(d.getUTCMonth() + 1) + "-" + pad(d.getUTCDate());
  }
  function ecartJours(a, b) { return Math.round((new Date(b + "T12:00:00Z") - new Date(a + "T12:00:00Z")) / 86400000); }

  /* Date-heure actuelle à Paris : "2026-11-26T14:05" */
  function maintenantParis(d) {
    var parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23"
    }).formatToParts(d || new Date());
    var o = {}; parts.forEach(function (x) { o[x.type] = x.value; });
    return o.year + "-" + o.month + "-" + o.day + "T" + o.hour + ":" + o.minute;
  }

  /* Intervalles occupés (en minutes) sur une date, à partir d'objets {debut, fin} en date-heure */
  function intervallesDuJour(date, items, pauseMin) {
    var out = [];
    (items || []).forEach(function (it) {
      var d0 = it.debut.slice(0, 10), d1 = it.fin.slice(0, 10);
      if (d1 < date || d0 > date) return;
      var a = d0 < date ? 0 : toMin(it.debut.slice(11, 16));
      var b = d1 > date ? 24 * 60 : toMin(it.fin.slice(11, 16));
      out.push([a, b + (pauseMin || 0)]);
    });
    return out;
  }

  /**
   * Créneaux libres pour une date.
   * @param {object} o
   *   date, dureeMin, horaires (7 jours, lundi d'abord : {ferme} ou {ouverture, fermeture}),
   *   rdvs [{debut, fin}], blocages [{debut, fin}], pauseMin (60), intervalleMin (60),
   *   maintenant ("YYYY-MM-DDTHH:MM", Paris), delaiMinMin (120), horizonJours (60)
   * @returns {string[]} heures de début, ex. ["10:00", "12:00"]
   */
  function creneauxDuJour(o) {
    var pause = o.pauseMin == null ? 60 : o.pauseMin;
    var pas = o.intervalleMin || 60;
    var duree = o.dureeMin;
    var h = o.horaires[jourSemaine(o.date)];
    if (!h || h.ferme || !duree) return [];
    var now = o.maintenant || maintenantParis();
    var today = now.slice(0, 10);
    if (o.date < today) return [];
    if (o.horizonJours != null && ecartJours(today, o.date) > o.horizonJours) return [];

    var ouv = toMin(h.ouverture), ferm = toMin(h.fermeture);
    var rdvs = intervallesDuJour(o.date, o.rdvs, pause);        // rendez-vous + pause qui suit
    var bloques = intervallesDuJour(o.date, o.blocages, 0);     // congés, plages bloquées
    var limite = -1;
    if (o.date === today) limite = toMin(now.slice(11, 16)) + (o.delaiMinMin == null ? 120 : o.delaiMinMin);

    var out = [];
    var debut = Math.ceil(ouv / pas) * pas;
    for (var s = debut; s + duree <= ferm; s += pas) {
      if (s < limite) continue;
      var fin = s + duree;
      // le soin + la pause qui le suit ne doivent pas toucher un autre rendez-vous
      var libreRdv = rdvs.every(function (iv) { return fin + pause <= iv[0] || s >= iv[1]; });
      // le soin ne doit pas chevaucher une plage bloquée
      var libreBloc = bloques.every(function (iv) { return fin <= iv[0] || s >= iv[1]; });
      if (libreRdv && libreBloc) out.push(toHHMM(s));
    }
    return out;
  }

  /* Ajoute des minutes à une date-heure */
  function ajouterMinutes(dateHeure, min) {
    var date = dateHeure.slice(0, 10), t = toMin(dateHeure.slice(11, 16)) + min;
    var jours = Math.floor(t / 1440); t -= jours * 1440;
    return ajouterJours(date, jours) + "T" + toHHMM(t);
  }

  var api = {
    creneauxDuJour: creneauxDuJour, maintenantParis: maintenantParis, jourSemaine: jourSemaine,
    ajouterJours: ajouterJours, ajouterMinutes: ajouterMinutes, ecartJours: ecartJours, toMin: toMin, toHHMM: toHHMM
  };
  root.EMN_CRENEAUX = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : this);
