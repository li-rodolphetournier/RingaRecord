# Résolution des erreurs Supabase / Network Error

## Problème : Network Error lors du login/register

### Checklist Supabase

1. **Variables d'environnement**
   - Vérifier le fichier `.env` à la racine :
     ```env
     VITE_SUPABASE_URL=...
     VITE_SUPABASE_ANON_KEY=...
     ```
   - Redémarrer `npm run dev` après modification.

2. **Projet Supabase actif**
   - Dashboard Supabase → **Settings → API**
   - Vérifier que l'URL et l'anon key copiées correspondent au projet actuel.

3. **Table `ringtones`**
   - Dashboard → **Table Editor**
   - Vérifier que la table existe et que les policies RLS sont en place (`user_id = auth.uid()`).

4. **Bucket Storage**
   - Dashboard → **Storage**
   - Bucket `ringtones` présent et configuré en public.

5. **Auth**
   - Dashboard → **Authentication → Users**
   - Vérifier si la création de compte apparaît.
   - Section **Redirect URLs** : ajouter `http://localhost:5173` si nécessaire.

### Diagnostic côté frontend

1. **Console navigateur**
   - DevTools (F12) → onglet Console pour les erreurs Supabase détaillées.
   - Vérifier l'onglet Network pour voir la requête Supabase en erreur.

2. **Logs applicatifs**
   - Les services `src/services/supabase/*.ts` loggent les erreurs. Vérifier la console (terminal + navigateur).

3. **Horloge système**
   - Supabase rejette les requêtes si l'horloge locale est trop décalée. Vérifier la date/heure de la machine.

### Solutions rapides

1. Relancer le serveur Vite :
   ```bash
   npm run dev
   ```
2. Regénérer les clés Supabase (Settings → API) si elles ont été révoquées.
3. Vérifier que le bucket Storage accepte le type MIME du fichier audio.
4. S'assurer que l'utilisateur est connecté (`authStore`) avant d'appeler les services RLS.

