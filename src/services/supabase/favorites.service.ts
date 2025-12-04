import { supabase } from './client';

export interface FavoriteFolder {
  id: string;
  userId: string;
  name: string;
  position: number;
  createdAt: string;
  updatedAt: string;
}

export interface Favorite {
  id: string;
  userId: string;
  ringtoneId: string;
  folderId: string | null;
  position: number;
  createdAt: string;
}

export interface CreateFavoriteFolderDto {
  name: string;
  position?: number;
}

export interface UpdateFavoriteFolderDto {
  name?: string;
  position?: number;
}

export interface CreateFavoriteDto {
  ringtoneId: string;
  folderId?: string | null;
  position?: number;
}

export interface UpdateFavoriteDto {
  folderId?: string | null;
  position?: number;
}

/**
 * Service Supabase pour gérer les favoris et dossiers de favoris.
 */
export const supabaseFavoritesService = {
  /**
   * Récupère tous les dossiers de favoris de l'utilisateur connecté.
   */
  async getAllFolders(): Promise<FavoriteFolder[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    const { data, error } = await supabase
      .from('favorite_folders')
      .select('*')
      .eq('user_id', user.id)
      .order('position', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch favorite folders: ${error.message}`);
    }

    return (data || []).map((folder) => ({
      id: folder.id,
      userId: folder.user_id,
      name: folder.name,
      position: folder.position,
      createdAt: folder.created_at,
      updatedAt: folder.updated_at,
    }));
  },

  /**
   * Crée un nouveau dossier de favoris.
   */
  async createFolder(dto: CreateFavoriteFolderDto): Promise<FavoriteFolder> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Vérifier si un dossier avec ce nom existe déjà
    const { data: existing } = await supabase
      .from('favorite_folders')
      .select('id')
      .eq('user_id', user.id)
      .eq('name', dto.name.trim())
      .single();

    if (existing) {
      throw new Error('Un dossier avec ce nom existe déjà');
    }

    // Récupérer la position maximale
    const { data: maxPositionData } = await supabase
      .from('favorite_folders')
      .select('position')
      .eq('user_id', user.id)
      .order('position', { ascending: false })
      .limit(1);

    const maxPosition = maxPositionData && maxPositionData.length > 0 ? maxPositionData[0].position : -1;
    const position = dto.position ?? (maxPosition + 1);

    const { data, error } = await supabase
      .from('favorite_folders')
      .insert({
        user_id: user.id,
        name: dto.name.trim(),
        position,
      })
      .select()
      .single();

    if (error || !data) {
      throw new Error(`Failed to create folder: ${error?.message || 'Unknown error'}`);
    }

    return {
      id: data.id,
      userId: data.user_id,
      name: data.name,
      position: data.position,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  },

  /**
   * Met à jour un dossier de favoris.
   */
  async updateFolder(folderId: string, dto: UpdateFavoriteFolderDto): Promise<FavoriteFolder> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    const updateData: Record<string, unknown> = {};
    if (dto.name !== undefined) {
      updateData.name = dto.name.trim();
    }
    if (dto.position !== undefined) {
      updateData.position = dto.position;
    }

    if (Object.keys(updateData).length === 0) {
      throw new Error('No fields to update');
    }

    const { data, error } = await supabase
      .from('favorite_folders')
      .update(updateData)
      .eq('id', folderId)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error || !data) {
      throw new Error(`Failed to update folder: ${error?.message || 'Unknown error'}`);
    }

    return {
      id: data.id,
      userId: data.user_id,
      name: data.name,
      position: data.position,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  },

  /**
   * Supprime un dossier de favoris.
   * Les favoris du dossier seront déplacés à la racine.
   */
  async deleteFolder(folderId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Déplacer tous les favoris du dossier à la racine (folder_id = null)
    await supabase
      .from('favorites')
      .update({ folder_id: null })
      .eq('folder_id', folderId)
      .eq('user_id', user.id);

    // Supprimer le dossier
    const { error } = await supabase
      .from('favorite_folders')
      .delete()
      .eq('id', folderId)
      .eq('user_id', user.id);

    if (error) {
      throw new Error(`Failed to delete folder: ${error.message}`);
    }
  },

  /**
   * Récupère tous les favoris de l'utilisateur connecté.
   */
  async getAllFavorites(): Promise<Favorite[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    const { data, error } = await supabase
      .from('favorites')
      .select('*')
      .eq('user_id', user.id)
      .order('folder_id', { ascending: true, nullsFirst: true })
      .order('position', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch favorites: ${error.message}`);
    }

    return (data || []).map((favorite) => ({
      id: favorite.id,
      userId: favorite.user_id,
      ringtoneId: favorite.ringtone_id,
      folderId: favorite.folder_id,
      position: favorite.position,
      createdAt: favorite.created_at,
    }));
  },

  /**
   * Crée ou met à jour un favori.
   */
  async upsertFavorite(dto: CreateFavoriteDto): Promise<Favorite> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Vérifier si le favori existe déjà
    const { data: existing } = await supabase
      .from('favorites')
      .select('*')
      .eq('user_id', user.id)
      .eq('ringtone_id', dto.ringtoneId)
      .single();

    if (existing) {
      // Mettre à jour le favori existant
      const updateData: Record<string, unknown> = {};
      if (dto.folderId !== undefined) {
        updateData.folder_id = dto.folderId;
      }
      if (dto.position !== undefined) {
        updateData.position = dto.position;
      }

      if (Object.keys(updateData).length === 0) {
        return {
          id: existing.id,
          userId: existing.user_id,
          ringtoneId: existing.ringtone_id,
          folderId: existing.folder_id,
          position: existing.position,
          createdAt: existing.created_at,
        };
      }

      const { data, error } = await supabase
        .from('favorites')
        .update(updateData)
        .eq('id', existing.id)
        .select()
        .single();

      if (error || !data) {
        throw new Error(`Failed to update favorite: ${error?.message || 'Unknown error'}`);
      }

      return {
        id: data.id,
        userId: data.user_id,
        ringtoneId: data.ringtone_id,
        folderId: data.folder_id,
        position: data.position,
        createdAt: data.created_at,
      };
    }

    // Créer un nouveau favori
    let query = supabase
      .from('favorites')
      .select('position')
      .eq('user_id', user.id);

    if (dto.folderId === null) {
      query = query.is('folder_id', null);
    } else {
      query = query.eq('folder_id', dto.folderId);
    }

    const { data: maxPositionData } = await query
      .order('position', { ascending: false })
      .limit(1);

    const maxPosition = maxPositionData && maxPositionData.length > 0 ? maxPositionData[0].position : -1;
    const position = dto.position ?? (maxPosition + 1);

    const { data, error } = await supabase
      .from('favorites')
      .insert({
        user_id: user.id,
        ringtone_id: dto.ringtoneId,
        folder_id: dto.folderId ?? null,
        position,
      })
      .select()
      .single();

    if (error || !data) {
      throw new Error(`Failed to create favorite: ${error?.message || 'Unknown error'}`);
    }

    return {
      id: data.id,
      userId: data.user_id,
      ringtoneId: data.ringtone_id,
      folderId: data.folder_id,
      position: data.position,
      createdAt: data.created_at,
    };
  },

  /**
   * Supprime un favori.
   */
  async deleteFavorite(ringtoneId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    const { error } = await supabase
      .from('favorites')
      .delete()
      .eq('user_id', user.id)
      .eq('ringtone_id', ringtoneId);

    if (error) {
      throw new Error(`Failed to delete favorite: ${error.message}`);
    }
  },

  /**
   * Met à jour la position d'un favori.
   */
  async updateFavoritePosition(ringtoneId: string, folderId: string | null, position: number): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    const { error } = await supabase
      .from('favorites')
      .update({ position, folder_id: folderId })
      .eq('user_id', user.id)
      .eq('ringtone_id', ringtoneId);

    if (error) {
      throw new Error(`Failed to update favorite position: ${error.message}`);
    }
  },

  /**
   * Met à jour les positions de plusieurs favoris en batch.
   */
  async updateFavoritePositions(updates: Array<{ ringtoneId: string; folderId: string | null; position: number }>): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Exécuter les mises à jour une par une (Supabase ne supporte pas bien les mises à jour batch)
    const promises = updates.map((update) =>
      supabase
        .from('favorites')
        .update({ position: update.position, folder_id: update.folderId })
        .eq('user_id', user.id)
        .eq('ringtone_id', update.ringtoneId),
    );

    const results = await Promise.all(promises);
    const errors = results.filter((r) => r.error);

    if (errors.length > 0) {
      throw new Error(`Failed to update favorite positions: ${errors[0].error?.message || 'Unknown error'}`);
    }
  },
};

