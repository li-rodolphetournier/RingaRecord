#!/bin/bash
# Script Bash pour tester l'application Android sans Android Studio
# Nécessite : Android SDK avec ADB dans le PATH

echo "🔨 Building Android app..."

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

# Vérifier si ADB est disponible
if ! command -v adb &> /dev/null; then
    echo "❌ ADB not found in PATH!"
    echo "Please install Android SDK Platform Tools and add to PATH"
    echo "Download: https://developer.android.com/studio/releases/platform-tools"
    exit 1
fi

# Vérifier les appareils connectés
echo "📱 Checking connected devices..."
DEVICE_COUNT=$(adb devices | grep -c "device$")

if [ $DEVICE_COUNT -eq 0 ]; then
    echo "❌ No Android device/emulator connected!"
    echo "Please connect a device via USB or start an emulator"
    echo "To start emulator: emulator -avd <avd_name>"
    exit 1
fi

echo "✅ Found $DEVICE_COUNT device(s)"

# Build l'APK debug
echo "🔨 Building debug APK..."
cd android
./gradlew assembleDebug
if [ $? -ne 0 ]; then
    echo "❌ Gradle build failed!"
    cd ..
    exit 1
fi
cd ..

# Installer sur l'appareil
echo "📲 Installing APK on device..."
APK_PATH="android/app/build/outputs/apk/debug/app-debug.apk"
if [ -f "$APK_PATH" ]; then
    adb install -r "$APK_PATH"
    if [ $? -eq 0 ]; then
        echo "✅ App installed successfully!"
        echo "🚀 Launching app..."
        adb shell am start -n com.ringarecord.app/.MainActivity
    else
        echo "❌ Installation failed!"
        exit 1
    fi
else
    echo "❌ APK not found at: $APK_PATH"
    exit 1
fi

echo "✅ Done! App should be running on your device."

