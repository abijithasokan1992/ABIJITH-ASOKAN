import { getConnection } from '../db';
import { v4 as uuidv4 } from 'uuid';

export const createFileMetadata = async (file: any) => {
    const connection = await getConnection();
    try {
        await connection.execute(
            `INSERT INTO files (id, folder_id, name, path, size) VALUES (:id, :folderId, :name, :path, :size)`,
            { id: uuidv4(), folderId: file.folderId, name: file.name, path: file.path, size: file.size },
            { autoCommit: true }
        );
    } finally {
        await connection.close();
    }
};
