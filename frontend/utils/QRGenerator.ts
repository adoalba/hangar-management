/**
 * QRGenerator.ts - Reliable QR Code Generator
 * Uses external QR API for guaranteed scannable codes
 * Falls back to inline SVG placeholder if offline
 */

/**
 * Generate QR code URL using goqr.me API
 * This service generates properly encoded, scannable QR codes
 * @param data - The URL or data to encode
 * @param size - Size in pixels (default 200)
 */
export function generateQRUrl(data: string, size: number = 200): string {
    const encodedData = encodeURIComponent(data);
    return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodedData}&ecc=M&margin=4`;
}

/**
 * Generate QR code as a data URL for embedding
 * Uses the external API URL directly (works in img src)
 */
export function generateQRDataUri(url: string, size: number = 200): string {
    // Return the API URL directly - browsers will load it as an image
    return generateQRUrl(url, size);
}

/**
 * Generate QR for inventory scan
 * @param recordId - Component record ID
 * @param baseUrl - Base URL of the application
 */
export function generateScanQR(recordId: string, baseUrl: string, size: number = 200): string {
    const scanUrl = `${baseUrl}/inventario/scan/${recordId}`;
    return generateQRUrl(scanUrl, size);
}

/**
 * Create a fallback SVG QR placeholder for offline mode
 */
export function generateOfflineQRSvg(size: number = 200): string {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
    <rect width="${size}" height="${size}" fill="#fff"/>
    <rect x="10" y="10" width="40" height="40" fill="#000"/>
    <rect x="15" y="15" width="30" height="30" fill="#fff"/>
    <rect x="20" y="20" width="20" height="20" fill="#000"/>
    <rect x="${size - 50}" y="10" width="40" height="40" fill="#000"/>
    <rect x="${size - 45}" y="15" width="30" height="30" fill="#fff"/>
    <rect x="${size - 40}" y="20" width="20" height="20" fill="#000"/>
    <rect x="10" y="${size - 50}" width="40" height="40" fill="#000"/>
    <rect x="15" y="${size - 45}" width="30" height="30" fill="#fff"/>
    <rect x="20" y="${size - 40}" width="20" height="20" fill="#000"/>
    <text x="${size / 2}" y="${size / 2}" text-anchor="middle" font-size="12" fill="#666">SCAN</text>
    <text x="${size / 2}" y="${size / 2 + 15}" text-anchor="middle" font-size="10" fill="#999">OFFLINE</text>
  </svg>`;
}
