# Configuration pour Google Play Store

## 🎯 Objectif
Transformer l'application PWA en Trusted Web Activity (TWA) pour distribution sur Google Play Store.

## 📋 Option 1 : PWA Builder (Recommandé - Plus Simple)

### Étapes
1. Aller sur https://www.pwabuilder.com/
2. Entrer l'URL de ton application déployée
3. Télécharger le package Android
4. Configurer dans Android Studio
5. Build et upload sur Google Play

### Avantages
- Pas besoin de coder en Java/Kotlin
- Génération automatique du wrapper
- Configuration simplifiée

## 📋 Option 2 : Bubblewrap (CLI)

### Installation
```bash
npm install -g @bubblewrap/cli
bubblewrap init
```

### Configuration
- Package name : `com.ringarecord.app`
- App name : RingaRecord
- Launcher name : RingaRecord
- Display mode : standalone

### Build
```bash
bubblewrap build
```

## 📋 Prérequis PWA

### 1. Manifest.json complet
```json
{
  "name": "RingaRecord",
  "short_name": "RingaRecord",
  "description": "Créer des sonneries personnalisées",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#3b82f6",
  "orientation": "portrait",
  "icons": [
    {
      "src": "/icons/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ]
}
```

### 2. Service Worker
- Cache des assets
- Mode offline basique
- Background sync (optionnel)

### 3. Icons
- 192x192 (requis)
- 512x512 (requis)
- Format PNG
- Maskable icons (recommandé)

### 4. Splash Screen
- Généré automatiquement par le navigateur
- Basé sur le manifest.json

## 📋 Checklist Google Play Store

### Assets nécessaires
- [ ] Icon 512x512 (high-res)
- [ ] Feature graphic (1024x500)
- [ ] Screenshots (min 2, max 8)
  - Phone : 16:9 ou 9:16
  - Tablet (optionnel) : 16:9 ou 9:16
- [ ] Description (4000 caractères max)
- [ ] Short description (80 caractères)

### Informations requises
- [ ] Nom de l'application
- [ ] Catégorie (Music & Audio)
- [ ] Contenu (âge)
- [ ] Privacy Policy URL
- [ ] Support URL (optionnel)

### Tests
- [ ] Test sur différents appareils Android
- [ ] Test du mode offline
- [ ] Test des permissions (microphone)
- [ ] Test de l'upload/download

## 🚀 Déploiement

### 1. Build de production
```bash
npm run build
```

### 2. Déployer le frontend
- Vercel : `vercel --prod`
- Netlify : `netlify deploy --prod`

### 3. Générer le package Android
- Utiliser PWA Builder ou Bubblewrap
- Signer l'APK/AAB

### 4. Upload sur Google Play Console
- Créer une release
- Uploader l'AAB
- Remplir les métadonnées
- Soumettre pour review

## 📝 Notes importantes

- **HTTPS obligatoire** pour PWA
- **Domain verification** pour TWA
- **Asset Links** configurés correctement
- **Permissions** déclarées dans le manifest Android

