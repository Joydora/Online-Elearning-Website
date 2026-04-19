import { Request, Response } from 'express';
import { uploadFileToCloudinary } from '../services/upload.service';

type UploadedFile = {
    buffer: Buffer;
    originalname?: string;
    mimetype?: string;
};

export async function uploadFileController(req: Request, res: Response): Promise<Response> {
    try {
        const { file } = req as Request & { file?: UploadedFile };

        if (!file) {
            return res.status(400).json({ error: 'No file provided' });
        }

        const secureUrl = await uploadFileToCloudinary(file);

        return res.status(201).json({ secure_url: secureUrl });
    } catch (error) {
        return res.status(500).json({
            error: 'Failed to upload file',
        });
    }
}
