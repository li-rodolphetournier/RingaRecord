#!/bin/bash
# Script de vérification pré-déploiement Vercel
# Simule le processus de build Vercel en local

set -e  # Arrêter en cas d'erreur

echo "🚀 Simulation du processus de build Vercel"
echo "=========================================="
echo ""

# Couleurs pour la sortie
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Fonction pour afficher les erreurs
error() {
  echo -e "${RED}❌ $1${NC}"
  exit 1
}

# Fonction pour afficher les succès
success() {
  echo -e "${GREEN}✅ $1${NC}"
}

# Fonction pour afficher les warnings
warning() {
  echo -e "${YELLOW}⚠️  $1${NC}"
}

# 1. Vérifier que Node.js est installé
echo "📦 Vérification de Node.js..."
if ! command -v node &> /dev/null; then
  error "Node.js n'est pas installé"
fi
NODE_VERSION=$(node -v)
success "Node.js $NODE_VERSION détecté"
echo ""

# 2. Vérifier que npm est installé
echo "📦 Vérification de npm..."
if ! command -v npm &> /dev/null; then
  error "npm n'est pas installé"
fi
NPM_VERSION=$(npm -v)
success "npm $NPM_VERSION détecté"
echo ""

# 3. Vérifier les variables d'environnement (optionnel)
echo "🔐 Vérification des variables d'environnement..."
if [ ! -f .env ]; then
  warning ".env n'existe pas (normal si les variables sont définies ailleurs)"
else
  if grep -q "VITE_SUPABASE_URL" .env && grep -q "VITE_SUPABASE_ANON_KEY" .env; then
    success "Variables d'environnement détectées dans .env"
  else
    warning "Certaines variables d'environnement peuvent manquer dans .env"
  fi
fi
echo ""

# 4. Installer les dépendances (si node_modules n'existe pas)
if [ ! -d "node_modules" ]; then
  echo "📦 Installation des dépendances..."
  npm install
  success "Dépendances installées"
  echo ""
fi

# 5. Lancer le lint
echo "🔍 Exécution du lint..."
if npm run lint; then
  success "Lint réussi"
else
  error "Lint a échoué"
fi
echo ""

# 6. Lancer les tests
echo "🧪 Exécution des tests..."
if npm run test:run; then
  success "Tests réussis"
else
  error "Tests ont échoué"
fi
echo ""

# 7. Build TypeScript
echo "🔨 Compilation TypeScript..."
if npx tsc -b --noEmit; then
  success "Compilation TypeScript réussie"
else
  error "Compilation TypeScript a échoué"
fi
echo ""

# 8. Build Vite
echo "📦 Build de production..."
if npm run build; then
  success "Build de production réussi"
else
  error "Build de production a échoué"
fi
echo ""

# 9. Vérifier que le dossier dist existe et contient des fichiers
echo "📁 Vérification du dossier dist..."
if [ -d "dist" ] && [ "$(ls -A dist)" ]; then
  DIST_SIZE=$(du -sh dist | cut -f1)
  success "Dossier dist créé avec succès (taille: $DIST_SIZE)"
  
  # Vérifier les fichiers essentiels
  if [ -f "dist/index.html" ]; then
    success "index.html présent"
  else
    warning "index.html manquant dans dist/"
  fi
  
  if [ -d "dist/assets" ] && [ "$(ls -A dist/assets)" ]; then
    ASSET_COUNT=$(ls -1 dist/assets | wc -l)
    success "$ASSET_COUNT fichier(s) dans dist/assets/"
  else
    warning "Aucun asset dans dist/assets/"
  fi
else
  error "Le dossier dist est vide ou n'existe pas"
fi
echo ""

# 10. Résumé
echo "=========================================="
echo -e "${GREEN}🎉 Tous les checks sont passés !${NC}"
echo ""
echo "Le build est prêt pour le déploiement sur Vercel."
echo "Vous pouvez maintenant déployer avec confiance."
echo ""

