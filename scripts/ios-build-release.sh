#!/bin/bash
# Script de build iOS pour App Store (Unix/macOS)
# Génère un IPA pour upload sur App Store Connect
# NOTE: Nécessite macOS et Xcode

set -e

echo "🍎 Build iOS pour App Store"
echo "============================"
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

# 1. Vérifier que nous sommes sur macOS
if [[ "$OSTYPE" != "darwin"* ]]; then
  show_error "Ce script nécessite macOS et Xcode"
fi

# 2. Vérifier que nous sommes dans le bon répertoire
if [ ! -f "package.json" ]; then
  show_error "Ce script doit être exécuté depuis la racine du projet"
fi

# 3. Vérifier que Node.js est installé
echo "📦 Vérification de Node.js..."
if ! command -v node &> /dev/null; then
  show_error "Node.js n'est pas installé"
fi
NODE_VERSION=$(node -v)
show_success "Node.js $NODE_VERSION détecté"
echo ""

# 4. Vérifier que Xcode est installé
echo "🔍 Vérification de Xcode..."
if ! command -v xcodebuild &> /dev/null; then
  show_error "Xcode n'est pas installé ou xcodebuild n'est pas dans le PATH"
fi
XCODE_VERSION=$(xcodebuild -version | head -n 1)
show_success "$XCODE_VERSION détecté"
echo ""

# 5. Vérifier que le dossier ios existe
if [ ! -d "ios" ]; then
  show_error "Le dossier ios n'existe pas. Exécutez d'abord: npm run cap:add:ios"
fi

# 6. Vérifier CocoaPods
echo "📦 Vérification de CocoaPods..."
if ! command -v pod &> /dev/null; then
  show_warning "CocoaPods n'est pas installé"
  echo "Installation de CocoaPods..."
  sudo gem install cocoapods || show_error "Installation de CocoaPods échouée"
fi
POD_VERSION=$(pod --version)
show_success "CocoaPods $POD_VERSION détecté"
echo ""

# 7. Installer/Mettre à jour les pods
echo "📦 Installation des dépendances CocoaPods..."
cd ios/App
pod install || {
  cd ../..
  show_error "L'installation des pods a échoué"
}
cd ../..
show_success "Dépendances CocoaPods installées"
echo ""

# 8. Build de l'application web
echo "🔨 Build de l'application web..."
npm run build || show_error "Le build web a échoué"
show_success "Build web réussi"
echo ""

# 9. Synchroniser Capacitor
echo "🔄 Synchronisation Capacitor..."
npx cap sync ios || show_error "La synchronisation Capacitor a échoué"
show_success "Synchronisation Capacitor réussie"
echo ""

# 10. Demander les informations de build
echo "📝 Configuration du build:"
echo ""
read -p "Scheme (défaut: App): " scheme
scheme=${scheme:-App}

read -p "Configuration (Release/Debug, défaut: Release): " configuration
configuration=${configuration:-Release}

read -p "Workspace (défaut: ios/App/App.xcworkspace): " workspace
workspace=${workspace:-ios/App/App.xcworkspace}

echo ""
echo "🔐 IMPORTANT: Assurez-vous que:"
echo "  - Votre compte Apple Developer est configuré dans Xcode"
echo "  - Le certificat de distribution est installé"
echo "  - Le provisioning profile est configuré"
echo "  - Le Bundle Identifier est correct (com.ringarecord.app)"
echo ""
read -p "Continuer? [y/N] " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  exit 1
fi

# 11. Clean le build précédent
echo "🧹 Nettoyage du build précédent..."
cd ios/App
xcodebuild clean -workspace App.xcworkspace -scheme "$scheme" || {
  cd ../..
  show_warning "Le nettoyage a échoué, continuation..."
}
cd ../..
echo ""

# 12. Archive l'application
echo "📦 Archivage de l'application..."
ARCHIVE_PATH="ios/build/RingaRecord.xcarchive"
cd ios/App

xcodebuild archive \
  -workspace App.xcworkspace \
  -scheme "$scheme" \
  -configuration "$configuration" \
  -archivePath "../../$ARCHIVE_PATH" \
  -allowProvisioningUpdates || {
  cd ../..
  show_error "L'archivage a échoué"
}

cd ../..
show_success "Archive créée avec succès"
echo ""

# 13. Exporter l'IPA
echo "📦 Export de l'IPA..."
EXPORT_PATH="ios/build/export"
EXPORT_OPTIONS_PLIST="ios/ExportOptions.plist"

# Créer ExportOptions.plist si nécessaire
if [ ! -f "$EXPORT_OPTIONS_PLIST" ]; then
  show_warning "ExportOptions.plist n'existe pas"
  echo "Création d'un ExportOptions.plist par défaut..."
  cat > "$EXPORT_OPTIONS_PLIST" << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>method</key>
    <string>app-store</string>
    <key>teamID</key>
    <string>YOUR_TEAM_ID</string>
    <key>uploadBitcode</key>
    <false/>
    <key>uploadSymbols</key>
    <true/>
    <key>compileBitcode</key>
    <false/>
</dict>
</plist>
EOF
  show_warning "⚠️  Modifiez $EXPORT_OPTIONS_PLIST avec votre Team ID avant de continuer"
  echo ""
  read -p "Appuyez sur Entrée après avoir modifié ExportOptions.plist..."
fi

cd ios/App

xcodebuild -exportArchive \
  -archivePath "../../$ARCHIVE_PATH" \
  -exportPath "../../$EXPORT_PATH" \
  -exportOptionsPlist "../../$EXPORT_OPTIONS_PLIST" \
  -allowProvisioningUpdates || {
  cd ../..
  show_error "L'export de l'IPA a échoué"
}

cd ../..

# 14. Vérifier que le fichier IPA existe
IPA_PATH="$EXPORT_PATH/$scheme.ipa"
if [ -f "$IPA_PATH" ]; then
  FILE_SIZE=$(du -h "$IPA_PATH" | cut -f1)
  show_success "IPA créé avec succès (taille: $FILE_SIZE)"
  echo ""
  echo "📁 Fichier IPA: $IPA_PATH"
  echo ""
  echo "✅ Build terminé avec succès!"
  echo ""
  echo "Prochaines étapes:"
  echo "1. Ouvrir Xcode et valider l'archive"
  echo "2. Uploader l'IPA sur App Store Connect"
  echo "3. Remplir les métadonnées dans App Store Connect"
  echo "4. Soumettre pour review"
  echo ""
  echo "💡 Alternative: Utiliser Transporter ou xcodebuild pour uploader"
else
  show_error "Le fichier IPA n'a pas été créé"
fi

