# PLUGY 3D — prompt de génération GLB

Créer une mascotte 3D nommée **PLUGY**, fidèle à la direction artistique « nuage d’idées » de PLUG ART : une petite entité flottante constituée d’un cœur bleu profond brillant, entouré de volumes souples ressemblant à un nuage d’énergie créative, avec des flux colorés bleu électrique, violet, cyan, rose et petites touches orange. Le visage doit être très lisible même en miniature : deux yeux lumineux simples et expressifs sur une zone centrale bleu nuit. Aucun réalisme humain. Rendu premium, doux, futuriste, culturel, artistique, contemporain, légèrement glossy, sans surcharge.

## Contraintes web
- Export final : **GLB / glTF 2.0**.
- 15k à 35k triangles maximum pour la version web principale.
- Une version LOD miniature de 5k à 10k triangles.
- Textures 1024 px maximum, KTX2/Basis si possible.
- Matériaux PBR simples, peu nombreux.
- Pivot au centre du corps.
- Échelle cohérente : environ 1 unité de haut.
- Pas de décor ni de socle dans le fichier final.
- Silhouette lisible de face, 3/4, côté.
- Prévoir des zones séparées/riggables pour les yeux et le noyau central.

## Rig / morphs souhaités
- yeux séparés gauche/droite ;
- morph ou bones `EyeBlink_L`, `EyeBlink_R` ;
- contrôle `Head/Core` pour micro-inclinaisons ;
- contrôles secondaires pour les lobes du nuage afin de créer une respiration légère ;
- possibilité de faire tourner de petits éléments orbitaux indépendamment.

## Animations à exporter dans le GLB
`Idle`, `Blink`, `Thinking`, `Speaking`, `Greeting`, `MiniIdle`, `OpenChat`, `Success`.

## Intentions d’animation
PLUGY doit sembler vivant mais calme : respiration flottante, micro-mouvements, clignements naturels non synchronisés, légère orientation vers le curseur, réaction douce au clic. Jamais nerveux, jamais enfantin, jamais « mascotte de jeu mobile ». L’objectif est un agent créatif premium pour une plateforme artistique professionnelle.

## Vue de référence
La priorité visuelle est le PLUGY « nuage d’idées » : noyau bleu nuit, yeux lumineux, nuage coloré bleu/violet/cyan/rose et orbites créatives autour de lui.