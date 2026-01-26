/**
 * Image Compression Utility for Technical Card Templates
 * 
 * Optimizes images for tablet performance and reduced PDF/email payload:
 * - Max resolution: 800px (largest side)
 * - JPEG quality: 0.7 (70%)
 * - Returns base64 data URI
 */

export interface CompressionOptions {
    maxWidth?: number;
    maxHeight?: number;
    quality?: number;
    format?: 'jpeg' | 'png' | 'webp';
}

const DEFAULT_OPTIONS: CompressionOptions = {
    maxWidth: 800,
    maxHeight: 800,
    quality: 0.7,
    format: 'jpeg'
};

/**
 * Compress an image from a data URI or URL
 */
export async function compressImage(
    imageSource: string,
    options: CompressionOptions = {}
): Promise<string> {
    const opts = { ...DEFAULT_OPTIONS, ...options };

    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';

        img.onload = () => {
            try {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');

                if (!ctx) {
                    reject(new Error('Canvas context not available'));
                    return;
                }

                // Calculate new dimensions maintaining aspect ratio
                let { width, height } = img;
                const maxW = opts.maxWidth!;
                const maxH = opts.maxHeight!;

                if (width > maxW || height > maxH) {
                    const ratio = Math.min(maxW / width, maxH / height);
                    width = Math.round(width * ratio);
                    height = Math.round(height * ratio);
                }

                canvas.width = width;
                canvas.height = height;

                // Use high-quality image smoothing
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';

                // Draw and compress
                ctx.drawImage(img, 0, 0, width, height);

                const mimeType = `image/${opts.format}`;
                const compressedDataUri = canvas.toDataURL(mimeType, opts.quality);

                resolve(compressedDataUri);
            } catch (error) {
                reject(error);
            }
        };

        img.onerror = () => {
            reject(new Error('Failed to load image'));
        };

        img.src = imageSource;
    });
}

/**
 * Compress image from file input
 */
export async function compressImageFromFile(
    file: File,
    options: CompressionOptions = {}
): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = async (e) => {
            if (e.target?.result && typeof e.target.result === 'string') {
                try {
                    const compressed = await compressImage(e.target.result, options);
                    resolve(compressed);
                } catch (error) {
                    reject(error);
                }
            } else {
                reject(new Error('Failed to read file'));
            }
        };

        reader.onerror = () => reject(new Error('FileReader error'));
        reader.readAsDataURL(file);
    });
}

/**
 * Get estimated file size of base64 data URI
 */
export function getBase64Size(dataUri: string): number {
    // Remove data URI prefix
    const base64 = dataUri.split(',')[1] || dataUri;
    // Each Base64 character represents 6 bits = 0.75 bytes
    return Math.round((base64.length * 3) / 4);
}

/**
 * Format file size in human-readable format
 */
export function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Compress photo for part record (optimized for technical cards)
 */
export async function compressPartPhoto(photoDataUri: string): Promise<string> {
    if (!photoDataUri) return '';

    try {
        return await compressImage(photoDataUri, {
            maxWidth: 800,
            maxHeight: 600,
            quality: 0.7,
            format: 'jpeg'
        });
    } catch (error) {
        console.warn('Image compression failed, using original:', error);
        return photoDataUri;
    }
}

/**
 * Compress signature for smaller payload
 */
export async function compressSignature(signatureDataUri: string): Promise<string> {
    if (!signatureDataUri) return '';

    try {
        return await compressImage(signatureDataUri, {
            maxWidth: 400,
            maxHeight: 200,
            quality: 0.8,
            format: 'png' // Keep transparency for signatures
        });
    } catch (error) {
        console.warn('Signature compression failed, using original:', error);
        return signatureDataUri;
    }
}
