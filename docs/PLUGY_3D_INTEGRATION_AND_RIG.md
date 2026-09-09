# PLUGY 3D — intégration développeur + rig/animations

## 1. Objectif produit
PLUGY doit exister comme assistant flottant global du dashboard PLUG ART. Il reste visible dans toutes les vues, peut se réduire en miniature, ouvre le chat ou le Studio, et change d’état selon les actions de l’utilisateur.

## 2. États UI
- `idle`: animation calme, clignements aléatoires.
- `thinking`: pendant un appel `/api/plugy`, glow plus fort + mouvement d’attention.
- `speaking`: pendant l’affichage d’une réponse.
- `success`: courte animation après génération/export.
- `error`: courte animation d’erreur, puis retour idle.
- `mini`: version réduite persistante.
- `open`: menu rapide / panneau PLUGY affiché.

## 3. Présence globale
- position fixe bottom/right
- desktop : 130–170 px
- mobile : 72–100 px
- mode mini : 70–90 px desktop, 58–72 px mobile
- ne jamais couvrir les actions importantes de l’interface
- état mini conservé dans `localStorage`
- visible dans toutes les vues sans rechargement

## 4. Interactions
Clic principal : ouvrir/fermer le dock PLUGY.
Actions du dock :
- Parler à PLUGY
- Ouvrir le Studio
- Analyser le Radar
- Créer un carrousel
- Créer une légende
- Trouver 3 idées de post

Survol/pointeur : très légère rotation du personnage vers le curseur, limitée à ±5°.

## 5. GLB runtime
Chemin prévu : `/static/plugy.glb`.
Le site doit fonctionner même si le fichier n’existe pas : fallback 3D procédural CSS déjà intégré.
Quand `plugy.glb` est disponible :
1. HEAD/GET du fichier.
2. charger le moteur 3D uniquement à ce moment (lazy-load).
3. remplacer le fallback CSS par le rendu GLB.
4. respecter `prefers-reduced-motion`.
5. suspendre le rendu 3D quand l’onglet n’est pas visible.

## 6. Rig minimal recommandé
- `ROOT`
- `CORE`
- `LOBE_TOP`
- `LOBE_BOTTOM`
- `LOBE_L`
- `LOBE_R`
- `EYE_L`
- `EYE_R`
- `ORBIT_A` optional
- `ORBIT_B` optional

Les yeux doivent être séparés, ou utiliser des morph targets indépendants `blink_L` et `blink_R`.

## 7. Clips requis
- `Idle` 4–6 s loop
- `Blink` 0.18–0.28 s one-shot
- `Think` 1.5–2.5 s loop
- `Speak` 1.5–3 s loop
- `Greeting` 1–1.5 s one-shot
- `MiniIdle` 3–5 s loop
- `Success` 1–1.5 s one-shot
- `Error` 0.8–1.2 s one-shot

## 8. Clignement
Ne pas intégrer un blink fixe dans `Idle`. Déclencher `Blink` aléatoirement toutes les 3,5 à 7,5 secondes pour un rendu naturel. Ajouter parfois un double blink (probabilité faible ~10%).

## 9. Performance
- cible GLB web < 4–6 MB
- 25k–60k triangles
- textures 1K par défaut
- KTX2/Basis et Meshopt/Draco si possible
- lazy load
- pas d’ombres dynamiques lourdes dans le widget
- max DPR 1.5 pour le canvas flottant
- pause animation hors viewport/tab hidden

## 10. Accessibilité
- bouton principal `aria-label="Ouvrir PLUGY"`
- clavier : Enter/Space ouvre le dock
- mode reduced-motion : image/statue 3D sans animation continue
- conserver un fallback fonctionnel sans WebGL

## 11. Chat PLUGY
Les réponses doivent être rendues en blocs structurés :
- paragraphes espacés
- titres et sous-titres
- listes
- boutons sous la réponse : Copier, Envoyer au Studio, Transformer en carrousel, Créer une légende
- utilisateur à droite, PLUGY à gauche
- état de chargement lisible

## 12. Studio de création
Workflow :
1. Format
2. Contenu
3. Style
4. Génération

Types à proposer : Open Call Radar, Dernier jour, Top opportunités, Exposition, Artiste émergent, Projet/Lieu, Story, Affiche, Carrousel éducatif, Institutionnel, Focus artiste, Sélection hebdo, Partenaire/Lieu, PLUG ART HUB.

Styles : PLUG ART bleu clean, Minimal épuré, Éditorial magazine, Galerie contemporaine, Noir & blanc premium, Urbain artistique, Peinture/matière, Urgence impactante, Instagram moderne, Culture premium, Brutaliste soft, Europe/opportunités.

Profils IA UI : Rapide, Équilibré, Créatif, Stratégique, Premium. Les libellés servent à l’UX et peuvent être mappés à des modèles/paramètres réels côté backend.

## 13. Passerelle PLUGY → Studio
Chaque réponse PLUGY doit pouvoir être envoyée au Studio. Le contenu est injecté dans le champ description/source, puis la vue Studio est activée automatiquement.

## 14. Critères de validation
- chat lisible à 100 % sur desktop/mobile
- aucune réponse collée
- Studio centré et utilisable sans explication
- PLUGY visible sur toutes les vues
- mini mode persistant
- bouton Studio fonctionnel
- fallback local si OpenAI échoue
- fallback 3D si GLB absent
