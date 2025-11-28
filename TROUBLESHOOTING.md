# Résolution des erreurs Network Error

## Problème : Network Error lors du login/register

### Vérifications à faire :

1. **Vérifier que le backend est démarré :**
   ```bash
   cd server/api
   npm run start:dev
   ```
   Tu devrais voir : `🚀 Server running on http://localhost:3000`

2. **Vérifier que PostgreSQL est démarré :**
   ```bash
   cd server
   docker-compose up -d
   ```

3. **Vérifier l'URL de l'API dans le frontend :**
   - Le fichier `.env.local` doit contenir : `VITE_API_URL=http://localhost:3000`
   - Redémarrer le serveur Vite après modification du .env

4. **Vérifier CORS :**
   - Le backend doit accepter les requêtes depuis `http://localhost:5173`
   - Vérifier dans `server/api/src/main.ts` que CORS est configuré

5. **Tester manuellement l'API :**
   ```bash
   # Test de connexion
   curl http://localhost:3000/auth/register \
     -H "Content-Type: application/json" \
     -d '{"email":"test@test.com","password":"test123"}'
   ```

### Solutions :

1. **Redémarrer le backend :**
   ```bash
   cd server/api
   npm run start:dev
   ```

2. **Redémarrer le frontend :**
   ```bash
   npm run dev
   ```

3. **Vérifier les ports :**
   - Backend : port 3000
   - Frontend : port 5173 (Vite par défaut)

4. **Vérifier la console du navigateur :**
   - Ouvrir les DevTools (F12)
   - Onglet Console pour voir les erreurs détaillées
   - Onglet Network pour voir les requêtes échouées

