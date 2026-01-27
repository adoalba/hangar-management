/**
 * SVG Assets for Technical Card Templates
 * 
 * Vectorized logos, icons, and QR codes for infinite scalability
 * with minimal file weight.
 */

// World Class Aviation Logo - SVG version
export const WCA_LOGO_SVG = `
<svg viewBox="0 0 120 40" xmlns="http://www.w3.org/2000/svg">
  <rect width="120" height="40" fill="#0f172a" rx="4"/>
  <text x="60" y="16" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="8" font-weight="900" letter-spacing="0.5">WORLD CLASS</text>
  <text x="60" y="28" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="10" font-weight="900" letter-spacing="1">AVIATION</text>
  <line x1="20" y1="33" x2="100" y2="33" stroke="#6366f1" stroke-width="2"/>
</svg>
`;

// Block icons as inline SVG strings
export const BLOCK_ICONS = {
    // Administrative icon
    admin: `<svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
        <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>
    </svg>`,

    // Technical identification icon
    tech: `<svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
        <path d="M19 8l-4 4h3c0 3.31-2.69 6-6 6-1.01 0-1.97-.25-2.8-.7l-1.46 1.46C8.97 19.54 10.43 20 12 20c4.42 0 8-3.58 8-8h3l-4-4zM6 12c0-3.31 2.69-6 6-6 1.01 0 1.97.25 2.8.7l1.46-1.46C15.03 4.46 13.57 4 12 4c-4.42 0-8 3.58-8 8H1l4 4 4-4H6z"/>
    </svg>`,

    // Times/Cycles icon
    times: `<svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
        <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/>
    </svg>`,

    // Condition icon
    condition: `<svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
    </svg>`,

    // Remarks icon
    remarks: `<svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
        <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/>
    </svg>`
};

// Card type badges as SVG
export const getCardTypeBadgeSVG = (type: 'YELLOW' | 'GREEN' | 'WHITE' | 'RED'): string => {
    type BadgeConfig = { bg: string; text: string; textColor: string; border?: string; };
    const configs: Record<string, BadgeConfig> = {
        YELLOW: { bg: '#eab308', text: 'SERVICEABLE', textColor: '#0f172a' },
        GREEN: { bg: '#10b981', text: 'REPAIRABLE', textColor: '#ffffff' },
        WHITE: { bg: '#f8fafc', text: 'REMOVED', textColor: '#0f172a', border: '#1e293b' },
        RED: { bg: '#dc2626', text: 'REJECTED', textColor: '#ffffff' }
    };

    const cfg = configs[type];
    const borderAttr = cfg.border ? `stroke="${cfg.border}" stroke-width="2"` : '';

    return `
    <svg viewBox="0 0 100 24" xmlns="http://www.w3.org/2000/svg">
        <rect x="1" y="1" width="98" height="22" rx="4" fill="${cfg.bg}" ${borderAttr}/>
        <text x="50" y="16" text-anchor="middle" fill="${cfg.textColor}" font-family="Arial, sans-serif" font-size="10" font-weight="900" letter-spacing="0.5">${cfg.text}</text>
    </svg>
    `;
};

// Generate QR code SVG placeholder (actual QR rendered via canvas)
export const QR_PLACEHOLDER_SVG = `
<svg viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg">
    <rect width="80" height="80" fill="white" stroke="#1e293b" stroke-width="2"/>
    <text x="40" y="35" text-anchor="middle" font-family="Arial" font-size="8" fill="#94a3b8">SCAN</text>
    <text x="40" y="48" text-anchor="middle" font-family="Arial" font-size="8" fill="#94a3b8">QR CODE</text>
</svg>
`;

// Signature placeholder
export const SIGNATURE_PLACEHOLDER_SVG = `
<svg viewBox="0 0 120 40" xmlns="http://www.w3.org/2000/svg">
    <rect width="120" height="40" fill="none" stroke="#e2e8f0" stroke-width="1" stroke-dasharray="4"/>
    <text x="60" y="24" text-anchor="middle" font-family="Arial" font-size="8" fill="#94a3b8">SIGNATURE</text>
</svg>
`;

// Convert inline SVG to data URI
export function svgToDataUri(svgString: string): string {
    const encoded = encodeURIComponent(svgString.trim());
    return `data:image/svg+xml,${encoded}`;
}

// Create inline SVG element
export function createInlineSVG(svgString: string, className: string = ''): string {
    return svgString.replace('<svg', `<svg class="${className}"`);
}
