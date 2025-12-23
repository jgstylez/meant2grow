
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
