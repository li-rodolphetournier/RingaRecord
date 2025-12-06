#!/bin/bash
# Script de build Android APK pour installation directe (Unix)
# Génère un APK signé pour installation directe sur appareil Android

set -e

echo "🚀 Build Android APK pour installation directe"
echo "==============================================="
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

# 4. Demander le type de build
echo "📱 Type de build APK:"
echo "1. Debug (non signé, pour tests rapides)"
echo "2. Release (signé, pour distribution)"
echo ""
read -p "Choisir le type (1 ou 2): " build_type

if [ "$build_type" = "1" ]; then
  build_variant="debug"
  signed=false
elif [ "$build_type" = "2" ]; then
  build_variant="release"
  signed=true
  
  # Vérifier le keystore pour release
  echo "🔐 Vérification du keystore..."
  KEYSTORE_FILE="android/keystore.properties"
  if [ ! -f "$KEYSTORE_FILE" ]; then
    show_warning "keystore.properties n'existe pas"
    echo "Pour créer un keystore, exécutez: npm run android:generate-keystore"
    echo ""
    read -p "Continuer sans keystore? (l'APK ne sera pas signé) [y/N] " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
      exit 1
    fi
    signed=false
  else
    show_success "keystore.properties trouvé"
  fi
else
  show_error "Choix invalide"
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

# 7. Build APK
echo "📦 Build APK ($build_variant)..."
cd android
if [ "$build_variant" = "debug" ]; then
  ./gradlew assembleDebug || {
    cd ..
    show_error "Le build APK a échoué"
  }
else
  ./gradlew assembleRelease || {
    cd ..
    show_error "Le build APK a échoué"
  }
fi
cd ..

# 8. Vérifier que le fichier APK existe
if [ "$build_variant" = "debug" ]; then
  apk_path="android/app/build/outputs/apk/debug/app-debug.apk"
else
  apk_path="android/app/build/outputs/apk/release/app-release.apk"
fi

if [ -f "$apk_path" ]; then
  file_size=$(du -h "$apk_path" | cut -f1)
  show_success "APK créé avec succès (taille: $file_size)"
  echo ""
  echo "📁 Fichier APK: $apk_path"
  echo ""
  
  if [ "$signed" = true ]; then
    echo "✅ APK signé prêt pour installation!"
  else
    echo "⚠️  APK non signé (debug ou keystore manquant)"
  fi
  
  echo ""
  echo "📱 Installation sur téléphone Android:"
  echo "1. Transférer l'APK sur votre téléphone (USB, email, cloud)"
  echo "2. Activer 'Sources inconnues' dans les paramètres Android"
  echo "3. Ouvrir le fichier APK sur le téléphone"
  echo "4. Suivre les instructions d'installation"
  echo ""
  echo "💡 Installation rapide via ADB:"
  echo "   adb install $apk_path"
  echo ""
  
  # Proposer l'installation automatique si ADB est disponible
  if command -v adb &> /dev/null; then
    echo "🔌 ADB détecté. Voulez-vous installer l'APK maintenant?"
    read -p "Installer sur l'appareil connecté? [y/N] " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
      echo "📲 Installation en cours..."
      adb install -r "$apk_path"
      if [ $? -eq 0 ]; then
        show_success "Application installée avec succès!"
        echo ""
        echo "🚀 Lancer l'application:"
        echo "   adb shell am start -n com.ringarecord.app/.MainActivity"
      else
        show_warning "L'installation a échoué. Vérifiez que:"
        echo "  - Un appareil Android est connecté"
        echo "  - Le débogage USB est activé"
        echo "  - Les autorisations sont accordées"
      fi
    fi
  fi
else
  show_error "Le fichier APK n'a pas été créé"
fi

