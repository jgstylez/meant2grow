
/**
 * Optimizes external image URLs where possible
 * @param url The original image URL
 * @param width Desired width
 * @returns Optimized URL string
 */
export const optimizeImage = (url: string | null | undefined, width = 800): string => {
    if (!url) return '';

    // Unsplash Optimization
    if (url.includes('unsplash.com')) {
        const baseUrl = url.split('?')[0];
        return `${baseUrl}?auto=format&fit=crop&q=80&w=${width}`;
    }

    // Potential for other CDN optimizations here (Cloudinary, etc.)

    return url;
};

/**
 * Validates if a URL is an image
 */
export const isImageUrl = (url: string): boolean => {
    return /\.(jpg|jpeg|png|webp|avif|gif|svg)$/i.test(url) || url.startsWith('data:image/');
};

/**
 * Parses a duration string (e.g., "1h", "30m", "1.5h", "2.5m", "2h 30m") to hours
 * @param duration Duration string like "1h", "30m", "1.5h", "2.5m", "2h 30m"
 * @returns Number of hours (as decimal, e.g., 0.5 for 30 minutes, 0.0417 for 2.5 minutes)
 */
export const parseDurationToHours = (duration: string): number => {
    if (!duration) return 0;
    
    const normalized = duration.trim().toLowerCase();
    let totalHours = 0;
    
    // Match hours: "1h", "1.5h", "2h"
    const hourMatch = normalized.match(/(\d+\.?\d*)\s*h/);
    if (hourMatch) {
        totalHours += parseFloat(hourMatch[1]);
    }
    
    // Match minutes: "30m", "45m", "2.5m"
    const minuteMatch = normalized.match(/(\d+\.?\d*)\s*m/);
    if (minuteMatch) {
        totalHours += parseFloat(minuteMatch[1]) / 60;
    }
    
    // If no units found but it's a number, assume hours
    if (totalHours === 0 && /^\d+\.?\d*$/.test(normalized)) {
        totalHours = parseFloat(normalized);
    }
    
    return totalHours;
};
