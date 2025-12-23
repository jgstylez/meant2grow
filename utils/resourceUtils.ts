
/**
 * Utility to download content as an HTML file.
 */
export const downloadAsHtml = (content: string, filename: string): void => {
    const blob = new Blob([content], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename.endsWith('.html') ? filename : `${filename}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};

/**
 * Validates if a file is a Word document.
 */
export const isWordDocument = (file: File): boolean => {
    return file.name.endsWith('.docx') ||
        file.name.endsWith('.doc') ||
        file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        file.type === 'application/msword';
};
