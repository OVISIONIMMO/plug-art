# PLUGY 3D — Prompt officiel de génération GLB

## Référence visuelle
PLUGY est le « nuage d’idées » de PLUG ART : une masse organique flottante faite de volumes nuageux et de matière artistique fluide, avec un coeur/visage central bleu profond, deux yeux lumineux expressifs, et des accents bleu électrique, cyan, violet, magenta et orange. Le rendu doit reprendre l’esprit de la première maquette du dashboard PLUG ART : premium, blanc/lumineux, futuriste mais chaleureux, artistique sans être enfantin.

## Prompt principal
Create a production-ready 3D character for the PLUG ART internal creative assistant named PLUGY. PLUGY is a floating “cloud of ideas”, an intelligent artistic energy creature rather than a humanoid robot. Build a compact asymmetrical cloud silhouette made from soft rounded organic lobes and glossy flowing paint-energy ribbons. The central face/core is a deep cobalt-to-navy rounded cavity with two large expressive glowing cyan-white eyes. Surround the cloud with subtle translucent blue, violet, magenta and small orange accents, like liquid acrylic paint mixed with luminous vapor. Preserve a clean premium contemporary art direction suitable for a professional cultural dashboard. Avoid toy-like proportions, hard sci-fi armor, visible human anatomy, text, logos, props, or busy details.

The character must read clearly at both hero size and at 80–120 px as a floating website assistant. Keep the silhouette iconic and balanced. Front three-quarter presentation, neutral A-pose equivalent for a floating cloud creature. Separate the eyes as independent controllable objects or morph targets. Keep a central head/core control and independent outer cloud lobes for subtle breathing/deformation. Create a clean low-to-mid poly topology optimized for web.

### Materials
- central face/core: glossy deep navy/cobalt, emissive cyan highlights
- eyes: separate emissive cyan-white geometry, strong readability, no baked blink
- cloud lobes: pearly translucent/glossy material with blue/cyan/violet gradients
- paint-energy accents: glossy saturated violet/magenta/orange ribbons, subtle not excessive
- no baked background or floor
- transparent/neutral world

### Web constraints
- export as one `.glb`
- target 25k–60k triangles for the web version
- maximum 2K textures, preferably 1K
- PBR metallic-roughness workflow
- Draco/Meshopt compatible geometry
- KTX2/Basis compatible textures
- no unsupported Blender-only shaders
- origin centered in character body
- forward axis consistent and documented
- scale approximately 1 meter character width

### Rig requirements
Create a simple animation rig with:
- ROOT / master
- CORE / face controller
- LOBE_L, LOBE_R, LOBE_TOP, LOBE_BOTTOM
- EYE_L and EYE_R controls or morph targets
- optional ORBIT controls for floating energy accents
- no unnecessary humanoid skeleton

### Required animation clips
1. `Idle` — 4–6 s loop, gentle floating, breathing/pulsing cloud lobes, subtle core movement.
2. `Blink` — 0.18–0.28 s, both eyes close/open naturally; compatible with random triggering.
3. `BlinkLeft` / `BlinkRight` optional — subtle asymmetric personality.
4. `Think` — 1.5–2.5 s loop, core glow increases, eyes look slightly upward/sideways, orbit accelerates gently.
5. `Speak` — 1.5–3 s loop, subtle core pulse and eye expression, no fake mouth required.
6. `Greeting` — 1–1.5 s one-shot, playful tilt/bounce when user opens PLUGY.
7. `MiniIdle` — 3–5 s loop optimized for 80 px display, reduced amplitude.
8. `Success` — 1–1.5 s one-shot, small bright pulse/bounce.
9. `Error` — 0.8–1.2 s one-shot, tiny shake + dim/recover.

### Animation rules
- keep motion smooth, restrained and premium
- no rapid cartoon bouncing
- eyes must remain the main expressive feature
- all clips should work independently
- root should remain approximately in place; website code handles screen position
- loops must be seamless

## Negative prompt
No humanoid body, no arms/legs, no hard robot shell, no childish toy face, no text, no logos, no weapons, no background scene, no pedestal, no heavy glass transparency, no noisy micro-details, no excessive particles, no photoreal human features, no uncanny mouth.

## Deliverables
- `plugy.glb` optimized web master
- optional `plugy_hi.glb` higher-detail source
- texture files only if not embedded
- animation clips with exact names above
- one still front 3/4 preview PNG
