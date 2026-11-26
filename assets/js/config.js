/* ==========================================================================
   emn & co — RÉGLAGES DU SITE
   --------------------------------------------------------------------------
   C'est ICI que l'on change le lien Planity, le téléphone, l'adresse,
   les horaires et les réseaux sociaux. Le site entier se met à jour.
   Gardez bien les guillemets "..." et les virgules en fin de ligne.
   ========================================================================== */

window.EMN_CONFIG = {
  nom: "emn & co",

  /* Adresse du site une fois en ligne [À COMPLÉTER] (sert à Google et aux réseaux sociaux).
     Après modification, lancez « npm run build ». */
  siteUrl: "https://hro6999.github.io/emnandco",

  /* Mode de réservation (une seule valeur à changer) :
       "demo"    → réservation sur le site, données gardées dans le navigateur (démonstration)
       "planity" → tous les boutons « Réserver » mènent à Planity
       "site"    → vraie réservation sur le site, avec Supabase (voir GUIDE-MISE-EN-SERVICE.md) */
  modeReservation: "demo",

  /* Pour le mode "site" uniquement : adresse et clé publique (anon) du projet Supabase */
  supabase: { url: "", clePublique: "" },

  /* Lien de réservation Planity (utilisé en mode "planity") */
  planity: "https://www.planity.com/emnandco-chez-davidson-69400-villefranche-sur-saone",

  /* Téléphone : affichage + format international pour l'appel direct */
  telephone: "07 60 59 85 31",
  telephoneLien: "+33760598531",

  /* Adresse */
  adresse: {
    rue: "782 rue Nationale",
    codePostal: "69400",
    ville: "Villefranche-sur-Saône",
    acces: "Porte grise à côté du commerce voisin, puis traversez la cour."
  },

  /* Coordonnées GPS (carte Google Maps de la page Contact) */
  gps: { lat: 45.9883468, lng: 4.7183266 },

  /* Horaires : "ouverture" et "fermeture" au format HH:MM.
     Pour un jour fermé, mettez ferme: true. */
  horaires: [
    { jour: "Lundi",    ouverture: "10:00", fermeture: "17:00" },
    { jour: "Mardi",    ouverture: "10:00", fermeture: "19:30" },
    { jour: "Mercredi", ouverture: "10:00", fermeture: "19:30" },
    { jour: "Jeudi",    ouverture: "10:00", fermeture: "19:30" },
    { jour: "Vendredi", ouverture: "10:00", fermeture: "19:30" },
    { jour: "Samedi",   ouverture: "10:00", fermeture: "17:00" },
    { jour: "Dimanche", ferme: true }
  ],

  /* Réseaux sociaux. Laisser "" (vide) pour masquer l'icône. */
  instagram: "https://www.instagram.com/emnandco/",
  instagramPseudo: "@emnandco",
  instagramSpraytan: "https://www.instagram.com/glowbyemn/",
  instagramSpraytanPseudo: "@glowbyemn",
  tiktok: "",

  /* Moyens de paiement acceptés */
  paiements: ["Espèces (de préférence)", "PayPal"],

  /* Encart « Bon à savoir » (page Prestations et récapitulatif de réservation) */
  bonASavoir: [
    "Les remplissages sont réalisés uniquement sur mes poses, jusqu'à 4 semaines maximum.",
    "Dépose d'une pose réalisée ailleurs : supplément de 5 €.",
    "Blanchiment Extra White : réservation par téléphone uniquement au 07 60 59 85 31.",
    "Paiement en espèces (de préférence) ou PayPal.",
    "Accès : porte grise à côté du commerce voisin, puis traversez la cour."
  ],

  /* Note Planity */
  note: { valeur: "4,9", sur: "5", avis: 87 }
};
