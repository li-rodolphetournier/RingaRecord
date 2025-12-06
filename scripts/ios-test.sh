#!/bin/bash
# Script Bash pour tester l'application iOS sans Xcode (nécessite macOS)
# Nécessite : Xcode Command Line Tools, CocoaPods, et un appareil iOS ou simulateur

echo "🔨 Building iOS app..."

# Vérifier qu'on est sur macOS
if [[ "$OSTYPE" != "darwin"* ]]; then
    echo "❌ This script requires macOS!"
    echo "iOS development can only be done on macOS with Xcode installed."
    exit 1
fi

# Build l'application
npm run build
if [ $? -ne 0 ]; then
    echo "❌ Build failed!"
    exit 1
fi

# Synchroniser Capacitor
echo "🔄 Syncing Capacitor..."
npx cap sync
if [ $? -ne 0 ]; then
    echo "❌ Sync failed!"
    exit 1
fi

# Vérifier si CocoaPods est installé
if ! command -v pod &> /dev/null; then
    echo "⚠️  CocoaPods not found. Installing..."
    sudo gem install cocoapods
    if [ $? -ne 0 ]; then
        echo "❌ Failed to install CocoaPods!"
        exit 1
    fi
fi

# Installer les dépendances CocoaPods
echo "📦 Installing CocoaPods dependencies..."
cd ios/App
pod install
if [ $? -ne 0 ]; then
    echo "❌ Pod install failed!"
    cd ../..
    exit 1
fi
cd ../..

# Vérifier si xcodebuild est disponible
if ! command -v xcodebuild &> /dev/null; then
    echo "❌ xcodebuild not found!"
    echo "Please install Xcode from the App Store"
    exit 1
fi

# Lister les simulateurs disponibles
echo "📱 Available simulators:"
xcrun simctl list devices available | grep -i "iphone" | head -5

# Demander à l'utilisateur quel simulateur utiliser ou utiliser le premier disponible
SIMULATOR=$(xcrun simctl list devices available | grep -i "iphone" | head -1 | sed -E 's/.*\(([^)]+)\).*/\1/')

if [ -z "$SIMULATOR" ]; then
    echo "❌ No iOS simulator found!"
    echo "Please create a simulator in Xcode: Xcode > Window > Devices and Simulators"
    exit 1
fi

echo "✅ Using simulator: $SIMULATOR"

# Boot le simulateur s'il n'est pas déjà démarré
echo "🚀 Booting simulator..."
xcrun simctl boot "$SIMULATOR" 2>/dev/null || echo "Simulator already booted"

# Ouvrir Simulator.app
open -a Simulator

# Attendre que le simulateur soit prêt
echo "⏳ Waiting for simulator to be ready..."
sleep 5

# Build et installer sur le simulateur
echo "🔨 Building and installing on simulator..."
cd ios/App
xcodebuild -workspace App.xcworkspace \
           -scheme App \
           -configuration Debug \
           -destination "platform=iOS Simulator,name=iPhone 15" \
           -derivedDataPath ./build \
           build

if [ $? -ne 0 ]; then
    echo "❌ Build failed!"
    cd ../..
    exit 1
fi

# Installer sur le simulateur
xcrun simctl install booted ./build/Build/Products/Debug-iphonesimulator/App.app

if [ $? -eq 0 ]; then
    echo "✅ App installed successfully!"
    echo "🚀 Launching app..."
    xcrun simctl launch booted com.ringarecord.app
else
    echo "❌ Installation failed!"
    cd ../..
    exit 1
fi

cd ../..

echo "✅ Done! App should be running on the simulator."
echo "💡 To view logs: xcrun simctl spawn booted log stream --predicate 'processImagePath contains \"App\"' --level debug"

