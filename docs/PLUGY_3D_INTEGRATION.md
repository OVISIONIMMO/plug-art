# PLUGY 3D — brief développeur

## But
Faire de PLUGY un assistant 3D persistant sur toute l’application PLUG ART, sans gêner la lecture ni ralentir le dashboard.

## Architecture
Créer un widget global `Plugy3DWidget` monté une seule fois dans le shell principal. Il contient :
- `Plugy3DModel` : rendu GLB/WebGL quand `static/models/plugy.glb` est disponible ;
- `PlugyFallback` : rendu procédural/CSS animé quand le GLB n’est pas disponible ;
- `PlugyQuickActions` : actions contextuelles ;
- `PlugyMiniChat` : accès au chat ;
- `PlugyStateController` : idle / thinking / speaking / minimized / success.

## Comportement global
- position fixe en bas à droite ;
- visible sur toutes les vues ;
- bouton réduire/agrandir ;
- mémoriser le mode mini dans `localStorage` ;
- suivre légèrement le curseur avec rotation/parallaxe limitée ;
- clignement toutes les 3 à 7 secondes avec jitter aléatoire ;
- respiration flottante continue ;
- clic sur PLUGY ouvre la conversation ;
- aucune interaction ne doit bloquer le scroll du site.

## États
- `idle` : respiration + micro-parallaxe ;
- `thinking` : pulsation cyan/violet + orbites plus rapides ;
- `speaking` : pulsation douce du noyau ;
- `success` : halo bref ;
- `minimized` : 78–96 px desktop, 64–80 px mobile ;
- `expanded` : 140–180 px desktop.

## Actions rapides
1. Parler à PLUGY
2. Créer une publication
3. Trouver des opportunités
4. Transformer en carrousel
5. Créer une légende
6. Ouvrir le Studio

## Contexte de page
- Radar : proposer « Résume les meilleures opportunités » ;
- Opportunités : « Transforme cette opportunité en carrousel » ;
- Studio : « Aide-moi à structurer cette publication » ;
- Expositions : « Prépare un post sur cette exposition ».

## Performance
- chargement différé du GLB après contenu critique ;
- `requestAnimationFrame` uniquement lorsque le widget est visible ;
- respecter `prefers-reduced-motion` ;
- suspendre les animations lorsque l’onglet est masqué ;
- cible GLB < 2 Mo, idéalement < 1 Mo ;
- fallback automatique si WebGL/model échoue.

## Chat
Les réponses doivent être rendues comme du contenu structuré : paragraphes espacés, listes, titres, liens cliquables, cartes d’opportunités et actions sous chaque réponse. Ne jamais afficher un long bloc compact.

## Studio
Le Studio est un workflow en 4 étapes : format, contenu, style, génération. Ajouter presets PLUG ART, raccourcis de ton, aperçu central, actions de variante et passerelle PLUGY -> Studio.