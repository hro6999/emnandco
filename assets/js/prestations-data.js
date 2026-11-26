/* ==========================================================================
   emn & co — PRESTATIONS ET TARIFS
   --------------------------------------------------------------------------
   La page « Prestations » (et l'offre de la page d'accueil) sont fabriquées
   automatiquement à partir de cette liste.

   • Changer un prix : modifiez le texte entre guillemets, ex. prix: "35 €"
   • Ajouter une prestation : copiez une ligne { nom: ..., prix: ..., duree: ... },
     collez-la à la suite (avec sa virgule) et changez le texte.
   • Masquer les offres du moment : offresActives: false
   • Champs facultatifs d'une prestation :
       description: "texte"            → petit texte sous le nom
       prixAvant: "95 €"               → ancien prix barré (offres)
       badge: "Sur devis"              → petite étiquette
       telephoneUniquement: true       → bouton « Appeler » au lieu de « Réserver »
   ========================================================================== */

window.EMN_PRESTATIONS = {

  /* ---- Offres du moment : true = affichées, false = masquées partout ---- */
  offresActives: true,

  categories: [
    {
      id: "offres",
      titre: "Offre spéciale rentrée",
      onglet: "Offres",
      offre: true,
      intro: "Des tarifs doux pour un éclat de rentrée : bronzage sans soleil et sourire lumineux.",
      prestations: [
        { nom: "Offre Spraytan + Blanchiment", prix: "65 €", prixAvant: "95 €", duree: "1 h 45" },
        { nom: "Offre Spraytan", prix: "30 €", prixAvant: "35 €", duree: "1 h" },
        { nom: "Offre Blanchiment", prix: "40 €", prixAvant: "60 €", duree: "1 h 15" }
      ]
    },
    {
      id: "mains",
      titre: "Ongles mains",
      onglet: "Mains",
      intro: "Manucure, semi-permanent, gainage ou rallongement : des mains soignées et une tenue impeccable, adaptées à vos ongles et à votre style.",
      prestations: [
        { nom: "Manucure et soin de l'ongle", prix: "20 €", duree: "30 min", description: "Travail des cuticules, remise en forme de l'ongle et soin." },
        { nom: "Semi-permanent", prix: "35 €", duree: "55 min" },
        { nom: "Dépose semi-permanent extérieur", prix: "5 €", duree: "5 min", description: "À ajouter à la prestation semi-permanent." },
        { nom: "Dépose extérieure + Pose (gainage et renfort)", prix: "15 €", duree: "25 min", description: "Comprend la dépose d'une ancienne pose réalisée ailleurs." },
        { nom: "Pose sur ongles naturels (gainage / renfort)", prix: "40 €", duree: "1 h", description: "Pour les ongles naturels qui ont besoin de solidité." },
        { nom: "Capsules américaines", prix: "45 €", duree: "1 h 15", description: "Pose rapide et ultra naturelle grâce aux capsules." },
        { nom: "Rallongement gel", prix: "60 €", duree: "1 h 35" },
        { nom: "Supplément French / Baby boomer", prix: "5 €", duree: "15 min" }
      ]
    },
    {
      id: "remplissage",
      titre: "Remplissage",
      onglet: "Remplissage",
      badge: "Uniquement sur mes poses",
      intro: "Les remplissages sont réalisés uniquement sur mes poses, jusqu'à 4 semaines maximum.",
      prestations: [
        { nom: "Dépose + vernis semi-permanent", prix: "35 €", duree: "55 min", description: "Uniquement sur mes poses. Si dépose extérieure, supplément de 5 €.", badge: "Uniquement sur mes poses" },
        { nom: "Remplissage renfort / gainage ongle court", prix: "40 €", duree: "1 h 05", description: "Uniquement sur mes poses, 4 semaines max.", badge: "Uniquement sur mes poses" },
        { nom: "Remplissage gel ongles longs", prix: "48 €", duree: "1 h 05", description: "Uniquement sur mes poses, 4 semaines max.", badge: "Uniquement sur mes poses" },
        { nom: "Dépose pose américaine + pose américaine", prix: "50 €", duree: "1 h 20", description: "À ajouter lors d'un rendez-vous pour une pose." },
        { nom: "Reconstruction d'un ongle", prix: "3 €", duree: "5 min" }
      ]
    },
    {
      id: "petits-plus",
      titre: "Les petits plus",
      onglet: "Petits plus",
      intro: "Nail art, réparation, changement de forme… les finitions qui rendent votre pose unique.",
      prestations: [
        { nom: "Nail art niveau 1 – 1 technique", prix: "5 €", duree: "15 min", description: "1 ou 2 ongles décorés avec un motif simple, ou une technique." },
        { nom: "Nail art niveau 2 – 2 techniques", prix: "10 €", duree: "25 min", description: "Un motif plus complexe sur quelques ongles, ou 2 techniques." },
        { nom: "Nail art niveau 3 – 3 techniques ou plus", prix: "Sur devis", duree: "35 min", description: "Le niveau expert, pour un rendu 100 % personnalisé.", badge: "Sur devis" },
        { nom: "Supplément déco 3D", prix: "2 € / ongle", duree: "5 min" },
        { nom: "Strass / déco / blooming / airbrush", prix: "1 € / doigt", duree: "5 min" },
        { nom: "Reconstruction d'un ongle", prix: "3 €", duree: "5 min" },
        { nom: "Changement de forme (pendant remplissage), mains complètes", prix: "5 €", duree: "20 min" }
      ]
    },
    {
      id: "pieds",
      titre: "Ongles pieds",
      onglet: "Pieds",
      intro: "Des pieds nets et lumineux, prêts pour les sandales comme pour le cocooning.",
      prestations: [
        { nom: "Semi-permanent pieds", prix: "35 €", duree: "50 min", description: "Pour des pieds nets et colorés pendant plusieurs semaines." },
        { nom: "Gainage pieds (gel)", prix: "37 €", duree: "1 h", description: "Le soin parfait pour des pieds impeccables et une tenue longue durée." },
        { nom: "Gainage pieds + reconstruction 2 orteils", prix: "42 €", duree: "1 h 05" },
        { nom: "Reconstruction gros orteil (x1)", prix: "3 €", duree: "5 min" },
        { nom: "Dépose complète pieds + soin des ongles (si souhaité)", prix: "20 €", duree: "30 min" }
      ]
    },
    {
      id: "depose",
      titre: "Dépose",
      onglet: "Dépose",
      intro: "Une dépose en douceur, dans le respect de l'ongle naturel.",
      prestations: [
        { nom: "Dépose de vernis semi-permanent", prix: "20 €", duree: "20 min" },
        { nom: "Dépose complète gainage / renfort / gel / capsules américaines + soin des ongles (si souhaité)", prix: "25 €", duree: "25 min", description: "Dépose gel." },
        { nom: "Dépose semi-permanent pieds", prix: "20 €", duree: "30 min" }
      ]
    },
    {
      id: "spraytan",
      titre: "Spraytan",
      onglet: "Spraytan",
      intro: "Un bronzage naturel, uniforme et instantané, sans soleil.",
      instagram: true,
      prestations: [
        { nom: "Visage et buste", prix: "15 €", duree: "15 min", description: "Pour un coup d'éclat rapide et naturel !" },
        { nom: "Corps entier", prix: "35 €", duree: "30 min", description: "Obtenez un bronzage naturel, uniforme et instantané." },
        { nom: "Corps", prix: "30 €", duree: "25 min", description: "Un joli hâle sur tout le corps, sans inclure le visage." }
      ]
    },
    {
      id: "blanchiment",
      titre: "Blanchiment dentaire esthétique",
      onglet: "Blanchiment",
      intro: "Soin esthétique pour éclaircir les dents et atténuer les taches. Formule conforme à la réglementation (0,1 % de peroxyde). Résultat visible dès la première séance.",
      prestations: [
        { nom: "Blanchiment White", prix: "60 €", duree: "1 h", description: "Séance de 40 min." },
        { nom: "Blanchiment White – retouche 2e séance", prix: "50 €", duree: "1 h", description: "Retouche à faire 7 jours après la première séance." },
        { nom: "Blanchiment Extra White", prix: "75 €", duree: "1 h 15", description: "Séance de 1 h.", badge: "Réservation par téléphone uniquement", telephoneUniquement: true },
        { nom: "Retouche blanchiment Extra White", prix: "60 €", duree: "55 min", description: "Au minimum 7 jours après la première séance.", badge: "Réservation par téléphone uniquement", telephoneUniquement: true }
      ]
    }
  ]
};
