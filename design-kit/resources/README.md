# Ressources et dépendances

## Marque vectorielle

[`diffraction-mark.svg`](./diffraction-mark.svg) est une copie exacte de `public/favicon.svg` du laboratoire à la révision `db725076835a54065b8a59cf7c2b8375f4856e49` : carré arrondi `#e9f5f6`, trois ondes `#218ca2`, dessin 64×64. Cette ressource du dépôt ne dépend d’aucun serveur externe. Elle conserve les couleurs claires du favicon ; contrairement à une icône SVG utilisant `currentColor`, elle ne change pas automatiquement avec le thème.

Le nom « Diffraction Lab 3D » et cette marque identifient le laboratoire d’origine. Pour les autres laboratoires, conserver les proportions et le langage de l’interface, puis choisir un nom et un pictogramme adaptés. Le dépôt ne fournit pas de licence distincte pour sa marque : ce fichier ne lui attribue pas une nouvelle licence.

Pour un chemin compatible avec un sous-dossier de déploiement Vite, importer le SVG depuis le code (`import markUrl from './resources/diffraction-mark.svg'`, avec les types Vite) ou utiliser `new URL('./resources/diffraction-mark.svg', import.meta.url).href` dans un module. Éviter les chaînes absolues telles que `/diffraction-lab-3d/favicon.svg`.

## Polices

La pile CSS est `Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`, avec `Georgia, serif` pour les symboles en italique. Aucun fichier `.woff`, `.ttf` ou `.otf` n’est distribué ; aucune police n’est chargée depuis Google Fonts ou un CDN. Inter est une préférence si la police est déjà installée. La police système détermine autrement le rendu, comme dans le laboratoire actuel. L’utilisation de polices locales ne crée pas une licence de redistribution de ces polices.

## Icônes et React

L’interface d’origine utilise `lucide-react` **0.468.0**, sous licence **ISC**, comprenant des portions de Feather sous MIT. Les icônes sont rendues en SVG par React, sans police d’icônes ni fichier d’image à télécharger. Le kit conserve cette dépendance d’interface ; importer les icônes nommément permet à Vite d’éliminer les icônes inutilisées du bundle.

React et ReactDOM sont sous licence MIT (Meta Platforms, Inc. and affiliates). Les installer depuis npm avec le projet hôte ; le kit ne redistribue pas leur code source ou leur dossier `node_modules`. Les fichiers de verrouillage de l’exemple précisent les versions résolues. Conserver les notices des dépendances dans les distributions qui les embarquent.

Le kit d’interface ne nécessite ni `three`, ni `@react-three/fiber`, ni le solveur FDTD de la diffraction. Ces dépendances ne sont utiles que si un laboratoire choisit son propre rendu 3D. Vite, TypeScript et le plugin React sont des outils de développement de l’exemple, non des ressources graphiques.

### Notice Lucide conservée

Texte de `node_modules/lucide-react/LICENSE`, version 0.468.0 :

```text
ISC License

Copyright (c) for portions of Lucide are held by Cole Bemis 2013-2022 as part of Feather (MIT). All other copyright (c) for Lucide are held by Lucide Contributors 2022.

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted, provided that the above
copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
```

Les captures de référence proviennent du laboratoire réel ; elles ne sont pas utilisées comme arrière-plan de l’exemple. Aucun fichier audio, vidéo, texture externe ou asset provenant du moteur physique n’est requis pour le kit.
