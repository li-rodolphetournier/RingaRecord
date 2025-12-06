#!/bin/bash
# Script de build Android pour Google Play Store (Unix)
# Génère un AAB (Android App Bundle) signé pour la production

set -e

echo "🚀 Build Android pour Google Play Store"
echo "========================================"
echo ""

# Fonction pour afficher les erreurs
show_error() {
  echo "❌ $1" >&2
  exit 1
}

# Fonction pour afficher les succès
show_success() {
  echo "✅ $1"
}

# Fonction pour afficher les warnings
show_warning() {
  echo "⚠️  $1"
}

# 1. Vérifier que nous sommes dans le bon répertoire
if [ ! -f "package.json" ]; then
  show_error "Ce script doit être exécuté depuis la racine du projet"
fi

# 2. Vérifier que Node.js est installé
echo "📦 Vérification de Node.js..."
if ! command -v node &> /dev/null; then
  show_error "Node.js n'est pas installé"
fi
NODE_VERSION=$(node -v)
show_success "Node.js $NODE_VERSION détecté"
echo ""

# 3. Vérifier que le dossier android existe
if [ ! -d "android" ]; then
  show_error "Le dossier android n'existe pas. Exécutez d'abord: npm run cap:add:android"
fi

# 4. Vérifier le keystore
echo "🔐 Vérification du keystore..."
KEYSTORE_FILE="android/keystore.properties"
if [ ! -f "$KEYSTORE_FILE" ]; then
  show_warning "keystore.properties n'existe pas"
  echo "Pour créer un keystore, exécutez: npm run android:generate-keystore"
  echo "Ou créez manuellement android/keystore.properties avec:"
  echo "  storeFile=../path/to/keystore.jks"
  echo "  storePassword=your-store-password"
  echo "  keyAlias=your-key-alias"
  echo "  keyPassword=your-key-password"
  echo ""
  read -p "Continuer sans keystore? (l'APK ne sera pas signé) [y/N] " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
else
  show_success "keystore.properties trouvé"
fi
echo ""

# 5. Build de l'application web
echo "🔨 Build de l'application web..."
npm run build || show_error "Le build web a échoué"
show_success "Build web réussi"
echo ""

# 6. Synchroniser Capacitor
echo "🔄 Synchronisation Capacitor..."
npx cap sync android || show_error "La synchronisation Capacitor a échoué"
show_success "Synchronisation Capacitor réussie"
echo ""

# 7. Build AAB (Android App Bundle)
echo "📦 Build AAB (Android App Bundle)..."
cd android
./gradlew bundleRelease || {
  cd ..
  show_error "Le build AAB a échoué"
}
cd ..

# 8. Vérifier que le fichier AAB existe
AAB_PATH="android/app/build/outputs/bundle/release/app-release.aab"
if [ -f "$AAB_PATH" ]; then
  FILE_SIZE=$(du -h "$AAB_PATH" | cut -f1)
  show_success "AAB créé avec succès (taille: $FILE_SIZE)"
  echo ""
  echo "📁 Fichier AAB: $AAB_PATH"
  echo ""
  echo "✅ Build terminé avec succès!"
  echo ""
  echo "Prochaines étapes:"
  echo "1. Tester l'AAB sur un appareil Android"
  echo "2. Uploader l'AAB sur Google Play Console"
  echo "3. Remplir les métadonnées dans Google Play Console"
  echo "4. Soumettre pour review"
else
  show_error "Le fichier AAB n'a pas été créé"
fi

