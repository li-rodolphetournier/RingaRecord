#!/bin/bash
# Script pour générer un keystore Android (Unix)
# Utilise keytool (inclus avec JDK)

set -e

echo "🔐 Génération du keystore Android"
echo "================================="
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

# 1. Vérifier que keytool est disponible
echo "🔍 Vérification de keytool..."
if ! command -v keytool &> /dev/null; then
  show_error "keytool n'est pas disponible. Assurez-vous que le JDK est installé et dans le PATH"
fi
show_success "keytool détecté"
echo ""

# 2. Demander les informations pour le keystore
echo "📝 Informations requises pour le keystore:"
echo ""

read -p "Chemin du keystore (ex: android/ringarecord-release.jks): " keystore_path
read -sp "Mot de passe du keystore: " keystore_password
echo ""
read -p "Alias de la clé (ex: ringarecord-key): " key_alias
read -sp "Mot de passe de la clé: " key_password
echo ""
read -p "Validité en années (ex: 25): " validity
read -p "Prénom: " first_name
read -p "Nom: " last_name
read -p "Unité organisationnelle (ex: Development): " org_unit
read -p "Organisation (ex: RingaRecord): " organization
read -p "Ville: " city
read -p "État/Province: " state
read -p "Code pays (2 lettres, ex: FR): " country

echo ""
echo "🔨 Génération du keystore..."

# Créer le dossier parent si nécessaire
keystore_dir=$(dirname "$keystore_path")
if [ -n "$keystore_dir" ] && [ ! -d "$keystore_dir" ]; then
  mkdir -p "$keystore_dir"
fi

# Générer le keystore
validity_days=$((validity * 365))
dname="CN=$first_name $last_name, OU=$org_unit, O=$organization, L=$city, ST=$state, C=$country"

keytool -genkeypair \
  -v \
  -storetype PKCS12 \
  -keystore "$keystore_path" \
  -alias "$key_alias" \
  -keyalg RSA \
  -keysize 2048 \
  -validity "$validity_days" \
  -storepass "$keystore_password" \
  -keypass "$key_password" \
  -dname "$dname" || show_error "La génération du keystore a échoué"

show_success "Keystore généré avec succès"
echo ""

# 3. Créer le fichier keystore.properties
echo "📝 Création de keystore.properties..."

keystore_properties_path="android/keystore.properties"
keystore_relative_path=$(realpath --relative-to="android" "$keystore_path" 2>/dev/null || echo "$keystore_path")

# Créer le dossier android s'il n'existe pas
if [ ! -d "android" ]; then
  mkdir -p android
fi

cat > "$keystore_properties_path" << EOF
storeFile=$keystore_relative_path
storePassword=$keystore_password
keyAlias=$key_alias
keyPassword=$key_password
EOF

show_success "keystore.properties créé"
echo ""

# 4. Avertissements de sécurité
echo "⚠️  IMPORTANT - Sécurité:"
echo "1. Ne partagez JAMAIS le keystore ou ses mots de passe"
echo "2. Faites une sauvegarde sécurisée du keystore"
echo "3. Si vous perdez le keystore, vous ne pourrez plus mettre à jour l'application sur Google Play"
echo "4. Ajoutez keystore.properties et *.jks au .gitignore"
echo ""

echo "✅ Keystore prêt pour la production!"

