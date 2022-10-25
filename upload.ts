import multer from 'multer';

export default class FileMiddleware {
    public static readonly memoryLoader = multer({
        storage: multer.memoryStorage(),
        limits: {
            fileSize: 20 * 1024 * 1024
        },
    });
}