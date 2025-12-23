
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from './firebase';

/**
 * Uploads a file to Firebase Storage and returns the download URL.
 * @param file The file to upload
 * @param path The path in storage (e.g., 'resources/templates/image.png')
 * @returns The download URL of the uploaded file
 */
export const uploadFile = async (file: File | Blob, path: string): Promise<string> => {
  const fileRef = ref(storage, path);
  await uploadBytes(fileRef, file);
  return getDownloadURL(fileRef);
};

/**
 * Generates a unique filename while preserving extension
 */
export const generateUniquePath = (filename: string, folder: string): string => {
  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).substring(2, 8);
  const extension = filename.split('.').pop();
  return `${folder}/${timestamp}_${randomStr}.${extension}`;
};
