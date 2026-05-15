import cloudinaryPkg from 'cloudinary';
const cloudinary = cloudinaryPkg.v2;

const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();

// Loud fail-fast warning at boot so misconfiguration shows up in logs
// immediately instead of only when a user tries to upload.
const placeholders = new Set(['', 'example', 'changeme', 'your_cloud_name', 'your_api_key', 'your_api_secret']);
const missing = !cloudName || !apiKey || !apiSecret;
const placeholder =
  placeholders.has((cloudName ?? '').toLowerCase()) ||
  placeholders.has((apiKey ?? '').toLowerCase()) ||
  placeholders.has((apiSecret ?? '').toLowerCase());

if (missing || placeholder) {
  // Use console here because the shared logger may not be initialised yet at module load.
  console.warn(
    '[cloudinary] ⚠️  CLOUDINARY_CLOUD_NAME / CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET are missing or set to placeholder values. ' +
    'Image uploads will fail with HTTP 503 until real credentials are provided.',
  );
}

cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret });

/**
 * Upload a buffer to Cloudinary
 */
export async function uploadToCloudinary(
  buffer: Buffer,
  folder: string,
  resourceType: 'image' | 'raw' | 'auto' = 'image'
): Promise<{ url: string; publicId: string }> {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: resourceType,
        transformation: resourceType === 'image'
          ? [{ quality: 'auto', fetch_format: 'auto' }]
          : undefined,
      },
      (error, result) => {
        if (error || !result) {
          return reject(error || new Error('Cloudinary upload failed'));
        }
        resolve({ url: result.secure_url, publicId: result.public_id });
      }
    );
    stream.end(buffer);
  });
}

/**
 * Delete a file from Cloudinary by public_id
 */
export async function deleteFromCloudinary(
  publicId: string,
  resourceType: 'image' | 'raw' | 'auto' = 'image'
): Promise<void> {
  await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
}

/**
 * Extract public_id from a Cloudinary URL
 * e.g. https://res.cloudinary.com/xxx/image/upload/v123/folder/filename.jpg → folder/filename
 */
export function extractPublicId(url: string): string | null {
  if (!url || !url.includes('cloudinary.com')) return null;
  const match = url.match(/\/upload\/(?:v\d+\/)?(.+)\.\w+$/);
  return match ? match[1] : null;
}

export default cloudinary;
