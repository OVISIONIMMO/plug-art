# PLUGY 3D — animations à prévoir

## 1. Idle
Boucle 4–6 s. Flottement vertical faible, respiration du volume central, micro-rotation de 1–2°. Pas de translation brusque.

## 2. Blink
0,12–0,22 s. Fermeture douce des deux yeux, possibilité de clignement simple ou double. Déclenchement aléatoire toutes les 3–7 s.

## 3. Thinking
Boucle 1,8–3 s. Noyau légèrement plus lumineux, orbites qui accélèrent, petite inclinaison, yeux attentifs. Doit rester lisible pendant 20–40 s sans devenir fatigant.

## 4. Speaking
Boucle 1–2 s. Pulsation discrète du noyau et micro-mouvements du corps. Aucun lip-sync nécessaire pour la première version.

## 5. Greeting
0,8–1,4 s. Petit rebond contrôlé et orientation vers l’utilisateur lors de la première ouverture du widget.

## 6. MiniIdle
Boucle 5–7 s. Version très subtile pour le widget réduit : flottement 2–4 px et clignement uniquement.

## 7. OpenChat
0,35–0,6 s. Léger scale-up, translation vers la zone de chat et halo bref.

## 8. Success
0,6–1 s. Halo cyan/violet + petite montée/descente après une action réussie.

## 9. CursorFollow
Piloté côté web, pas nécessairement exporté dans le GLB. Rotation max ±5° en X/Y avec interpolation lente.

## 10. Reduced motion
Lorsque `prefers-reduced-motion` est actif : supprimer float/parallaxe/orbites et conserver uniquement un clignement rare ou une pose statique.

## Noms recommandés dans le GLB
`Idle`, `Blink`, `Thinking`, `Speaking`, `Greeting`, `MiniIdle`, `OpenChat`, `Success`.