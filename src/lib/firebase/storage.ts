import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from './config';

// ============================================
// Client-side Image Compression
// ============================================

async function compressImage(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      // Resize to max 800px width (keeps aspect ratio)
      const maxWidth = 800;
      let { width, height } = img;

      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }

      canvas.width = width;
      canvas.height = height;
      ctx?.drawImage(img, 0, 0, width, height);

      // Convert to WebP/JPEG at 0.7 quality (target <100KB)
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to compress image'));
          }
        },
        'image/webp',
        0.7
      );
    };

    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
}

// ============================================
// Upload Receipt/Photo
// ============================================

export async function uploadReceipt(
  uid: string,
  transactionId: string,
  file: File
): Promise<string> {
  // Compress image client-side before upload
  const compressedBlob = await compressImage(file);

  // Upload to /users/{uid}/receipts/{transactionId}
  const storageRef = ref(storage, `users/${uid}/receipts/${transactionId}.webp`);
  await uploadBytes(storageRef, compressedBlob, {
    contentType: 'image/webp',
  });

  // Return download URL
  const url = await getDownloadURL(storageRef);
  return url;
}

// ============================================
// Upload Profile Photo
// ============================================

export async function uploadProfilePhoto(uid: string, file: File): Promise<string> {
  const compressedBlob = await compressImage(file);

  const storageRef = ref(storage, `users/${uid}/profile/avatar.webp`);
  await uploadBytes(storageRef, compressedBlob, {
    contentType: 'image/webp',
  });

  const url = await getDownloadURL(storageRef);
  return url;
}
