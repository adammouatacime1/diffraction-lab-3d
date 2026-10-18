# Publier Diffraction Lab 3D comme site web

Le laboratoire est désormais en ligne : **https://adammouatacime1.github.io/diffraction-lab-3d/**. Cette adresse peut être partagée directement avec le professeur. La publication GitHub Pages utilise la branche `gh-pages`, qui contient les fichiers compilés du site et un fichier `.nojekyll`. La branche `main` n’a pas été modifiée.

Pour actualiser ce site, recompilez les sources avec `npm ci` puis `npm run build`, et publiez le contenu de `dist` à la racine de `gh-pages`, en conservant `.nojekyll`. GitHub Pages reconstruit ensuite la publication. Les instructions Netlify ci-dessous restent une autre possibilité d’hébergement.

Le laboratoire est déjà une application web. Il suffit d’héberger sa version compilée pour obtenir une adresse que le professeur peut ouvrir dans son navigateur. Aucun serveur de calcul, base de données ou clé d’API n’est nécessaire.

## Méthode simple : envoyer le site déjà compilé

1. [Téléchargez le site prêt à publier](https://raw.githubusercontent.com/adammouatacime1/diffraction-lab-3d/livraison-diffraction-lab-3d/docs/site/diffraction-lab-website.zip).
2. Sous Windows, faites un clic droit sur le ZIP, puis **Extraire tout**. Ouvrez le dossier extrait : il contient un dossier **dist**, avec **index.html** et **assets** à l’intérieur.
3. Ouvrez [Netlify Drop](https://app.netlify.com/drop), connectez-vous ou créez un compte si demandé.
4. Glissez le dossier **dist** dans la zone de dépôt. Utilisez le dossier extrait, pas l’archive ZIP ni le dossier des sources du projet.
5. Attendez la fin de la publication, puis ouvrez l’adresse HTTPS fournie par Netlify. Cette adresse peut être partagée avec le professeur. Le nom du site peut ensuite être personnalisé dans les réglages Netlify.

Cette méthode ne demande pas d’installer Node.js sur votre ordinateur. Le site sera publié lorsque vous aurez envoyé le dossier à Netlify ; l’archive GitHub seule ne crée pas de site public.

L’archive contient le laboratoire interactif. La vidéo de présentation et les documents restent accessibles dans ce dépôt. Pour mettre à jour une publication manuelle, envoyez une nouvelle version du dossier compilé.

## Méthode avec mises à jour depuis GitHub

Dans [Netlify](https://app.netlify.com/), choisissez **Add new project → Import an existing project → GitHub**, puis le dépôt **adammouatacime1/diffraction-lab-3d**. Utilisez ces réglages :

| Réglage | Valeur |
| --- | --- |
| Branche à publier | `livraison-diffraction-lab-3d` |
| Dossier de base | Racine du dépôt, laisser vide |
| Commande de compilation | `npm run build` |
| Dossier à publier | `dist` |
| Node.js | 22 LTS, si une version doit être choisie |

Cliquez sur **Deploy**. Netlify fournit ensuite une adresse de site et peut reconstruire le laboratoire lors des prochains changements de cette branche. La branche `main` ne contient pas encore l’application : sélectionner la branche de livraison est nécessaire.

## Recréer le dossier du site

Depuis le dossier du projet, avec Node.js installé :

```sh
npm ci
npm run build
```

Le dossier **dist** produit par la compilation est celui à héberger. Pour l’essayer localement, lancez `npm run preview`, puis ouvrez l’adresse affichée. Utilisez un serveur web ou l’hébergement pour ouvrir le laboratoire ; un double-clic sur `index.html` ne remplace pas ce serveur.

L’archive fournie a été produite avec la même compilation Vite. Elle inclut uniquement les fichiers du dossier **dist**, sans outils de développement ni dépendances à installer sur l’ordinateur du visiteur.
