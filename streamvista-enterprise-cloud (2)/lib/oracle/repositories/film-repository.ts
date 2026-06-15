/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { getConnection } from '../pool';
import oracledb from '../client';
import { Film, FilmAsset } from '../../../src/types';

export class FilmRepository {
  /**
   * Commits a draft metadata registry packet for a newly compiled film structure.
   */
  async createFilm(film: Film): Promise<number> {
    const conn = await getConnection();
    try {
      const languagesStr = film.languages.join(',');
      const subtitlesStr = film.subtitles ? film.subtitles.join(',') : '';
      const rightsStr = film.rights.join(',');

      // For Oracle, we convert lists to CSV strings for robust text index matching
      const result = await conn.execute(
        `INSERT INTO films (title, synopsis, genre, release_year, duration_minutes, languages, subtitles, rights, uploaded_by, status) 
         VALUES (:title, :synopsis, :genre, :year, :duration_minutes, :languages, :subtitles, :rights, :uploaded_by, :status)
         RETURN film_id INTO :inserted_id`,
        {
          title: film.title,
          synopsis: film.synopsis,
          genre: film.genre,
          year: film.year,
          duration_minutes: parseInt(film.duration) || 120,
          languages: languagesStr,
          subtitles: subtitlesStr,
          rights: rightsStr,
          uploaded_by: film.uploadedBy,
          status: film.status,
          inserted_id: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT }
        }
      );

      const outBinds = result.outBinds as any;
      const filmId = outBinds.inserted_id[0];

      // Insert any associated asset attachments in the assets table
      if (film.assets && film.assets.length > 0) {
        for (const asset of film.assets) {
          await this.createAsset(conn, filmId, asset, film.uploadedBy);
        }
      }

      return filmId;
    } finally {
      await conn.close();
    }
  }

  /**
   * Helper to commit OCI object assets mapping tied to film IDs.
   */
  private async createAsset(conn: oracledb.Connection, filmId: number, asset: FilmAsset, uploader: string): Promise<void> {
    const assetSize = parseInt(asset.size) || 0;
    const categoryMap: Record<string, string> = {
      'video': 'Videos',
      'audio': 'Audio',
      'artwork': 'Images',
      'metadata': 'Documents',
      'subtitle': 'Documents'
    };
    const category = categoryMap[asset.type] || 'Documents';

    await conn.execute(
      `INSERT INTO assets (film_id, category, file_name, oci_object_name, mime_type, file_size_bytes, uploaded_by, md5_checksum)
       VALUES (:filmId, :category, :fileName, :ociObjectName, :mimeType, :fileSizeBytes, :uploadedBy, :md5)`,
      {
        filmId,
        category,
        fileName: asset.name,
        ociObjectName: `vault/films/${filmId}/${asset.name}`,
        mimeType: asset.type === 'video' ? 'video/mp4' : 'application/octet-stream',
        fileSizeBytes: assetSize,
        uploadedBy: uploader,
        md5: asset.hash || 'MOCK_MD5_OCE_INDEX'
      }
    );
  }

  /**
   * Hydrates all catalog listings securely.
   */
  async findAll(): Promise<Film[]> {
    const conn = await getConnection();
    try {
      const result = await conn.execute(
        `SELECT f.film_id, f.title, f.synopsis, f.genre, f.release_year, f.duration_minutes, f.languages, f.subtitles, f.rights, f.uploaded_by, f.status, f.review_notes, f.created_at
         FROM films f
         ORDER BY f.created_at DESC`
      );

      const rows = result.rows as any[];
      if (!rows) return [];

      const hydratedFilms: Film[] = [];
      
      for (const row of rows) {
        // Fetch asset sub-arrays mapped to film
        const assetResult = await conn.execute(
          `SELECT file_name, file_size_bytes, category, md5_checksum, created_at FROM assets WHERE film_id = :filmId`,
          { filmId: row.FILM_ID }
        );
        
        const assetRows = assetResult.rows as any[];
        const assets: FilmAsset[] = (assetRows || []).map(ar => {
          let typeStr: 'video' | 'audio' | 'subtitle' | 'metadata' | 'artwork' = 'metadata';
          if (ar.CATEGORY === 'Videos') typeStr = 'video';
          else if (ar.CATEGORY === 'Audio') typeStr = 'audio';
          else if (ar.CATEGORY === 'Images') typeStr = 'artwork';

          return {
            name: ar.FILE_NAME,
            size: `${(ar.FILE_SIZE_BYTES / (1024 * 1024)).toFixed(1)} MB`,
            type: typeStr,
            status: 'COMPLETED',
            hash: ar.MD5_CHECKSUM,
            uploadedAt: ar.CREATED_AT
          };
        });

        hydratedFilms.push({
          id: String(row.FILM_ID),
          title: row.TITLE,
          genre: row.GENRE,
          synopsis: row.SYNOPSIS,
          year: row.RELEASE_YEAR,
          duration: `${row.DURATION_MINUTES} mins`,
          languages: row.LANGUAGES ? row.LANGUAGES.split(',') : [],
          subtitles: row.SUBTITLES ? row.SUBTITLES.split(',') : [],
          rights: row.RIGHTS ? row.RIGHTS.split(',') : [],
          territories: ['North America', 'Europe', 'Asia Pacific', 'Latin America', 'Worldwide'], // default boundaries
          status: row.STATUS as any,
          assets,
          oracleBucket: process.env.OCI_BUCKET_NAME || 'sv-secure-screeners',
          uploadedBy: row.UPLOADED_BY,
          createdAt: row.CREATED_AT,
          reviewNotes: row.REVIEW_NOTES
        });
      }

      return hydratedFilms;
    } finally {
      await conn.close();
    }
  }

  /**
   * Commits an administrative review status decision and appraisal trace.
   */
  async updateStatus(filmId: number, status: 'APPROVED' | 'REJECTED', notes?: string): Promise<void> {
    const conn = await getConnection();
    try {
      await conn.execute(
        `UPDATE films 
         SET status = :status, review_notes = :notes, updated_at = CURRENT_TIMESTAMP 
         WHERE film_id = :filmId`,
        { status, notes: notes || null, filmId }
      );
    } finally {
      await conn.close();
    }
  }

  /**
   * Purges a cinematic entry bundle from index mappings.
   */
  async deleteFilm(filmId: number): Promise<void> {
    const conn = await getConnection();
    try {
      await conn.execute(`DELETE FROM films WHERE film_id = :filmId`, { filmId });
    } finally {
      await conn.close();
    }
  }
}
