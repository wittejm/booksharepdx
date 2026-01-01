/**
 * Converts a File object to a base64-encoded string.
 * @param file - File object to convert
 * @returns Promise resolving to base64 string (data URL)
 * @throws Error if file reading fails
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const result = reader.result;
      if (typeof result === 'string') {
        resolve(result);
      } else {
        reject(new Error('Failed to convert file to base64: unexpected result type'));
      }
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    try {
      reader.readAsDataURL(file);
    } catch (error) {
      reject(new Error(`Failed to read file: ${error instanceof Error ? error.message : 'Unknown error'}`));
    }
  });
}

/**
 * Creates a preview URL for an image file that can be used as a blob URL.
 * This is useful for showing immediate previews before upload.
 * The returned URL must be revoked with URL.revokeObjectURL() when no longer needed.
 * @param file - File object to create preview for
 * @returns Promise resolving to blob URL string
 * @throws Error if file is not a valid image type
 */
export async function createImagePreview(file: File): Promise<string> {
  // Validate that the file is an image
  if (!file.type.startsWith('image/')) {
    throw new Error(`Invalid file type: ${file.type}. Expected an image file.`);
  }

  try {
    const url = URL.createObjectURL(file);
    return url;
  } catch (error) {
    throw new Error(
      `Failed to create image preview: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}
