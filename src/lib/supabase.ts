import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL || '';
const supabaseAnonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null;

/**
 * Uploads a physical file to a specified Supabase storage bucket.
 * Automatically tries to create/ensure the bucket exists if possible, and uploads the asset.
 */
export async function uploadFile(
  bucketName: string,
  filePath: string,
  file: File
): Promise<string> {
  if (!supabase) {
    throw new Error('Supabase is not configured. Please define VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment variables.');
  }

  // Attempt to upload the file to Supabase Storage
  const { data, error } = await supabase.storage
    .from(bucketName)
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: true,
    });

  if (error) {
    // If the error says bucket not found, let's explain it clearly in the error
    if (error.message.includes('bucket') || error.message.includes('not found')) {
      throw new Error(`Storage bucket "${bucketName}" not found. Please create a public bucket named "${bucketName}" in your Supabase storage dashboard.`);
    }
    if (error.message.includes('row-level security') || error.message.includes('row_level_security') || error.message.includes('security policy')) {
      throw new Error(
        `Row Level Security (RLS) block: Your Supabase storage bucket "${bucketName}" does not allow uploads yet. ` +
        `To fix this: \n\n` +
        `1. Go to your Supabase Dashboard -> "Storage" -> select "${bucketName}".\n` +
        `2. Click "Policies" -> "New Policy" under Object policies.\n` +
        `3. Choose "For full customization (ALL operations)" -> Select "INSERT" and "SELECT" -> Set Target Roles to "public/anon" -> Set the expression to "true".\n\n` +
        `Or execute this in your Supabase SQL Editor:\n` +
        `CREATE POLICY "Allow public uploads" ON storage.objects FOR INSERT TO public WITH CHECK (bucket_id = '${bucketName}');\n` +
        `CREATE POLICY "Allow public select" ON storage.objects FOR SELECT TO public USING (bucket_id = '${bucketName}');`
      );
    }
    throw error;
  }

  // Get the public URL of the uploaded asset
  const { data: publicUrlData } = supabase.storage
    .from(bucketName)
    .getPublicUrl(filePath);

  if (!publicUrlData || !publicUrlData.publicUrl) {
    throw new Error('Failed to retrieve the public URL of the uploaded image.');
  }

  return publicUrlData.publicUrl;
}

/**
 * Helper to download an image from an external URL (e.g., University Logo) 
 * and save/mirror it inside the Supabase Storage bucket.
 */
export async function uploadLogoFromUrl(
  bucketName: string,
  logoUrl: string
): Promise<string> {
  if (!supabase) {
    throw new Error('Supabase is not configured. Cannot mirror the logo.');
  }

  try {
    // Fetch the external logo image as a blob
    const response = await fetch(logoUrl, { referrerPolicy: 'no-referrer' });
    if (!response.ok) {
      throw new Error(`Failed to fetch logo from external URL: ${response.statusText}`);
    }
    const blob = await response.blob();
    const extension = blob.type.split('/')[1] || 'png';
    const file = new File([blob], `university_logo.${extension}`, { type: blob.type });

    // Upload to 'logos/university_logo'
    const fileName = `logos/university_logo_${Date.now()}.${extension}`;
    const uploadedUrl = await uploadFile(bucketName, fileName, file);
    return uploadedUrl;
  } catch (err: any) {
    console.error('Error in uploadLogoFromUrl:', err);
    throw new Error(err?.message || 'Failed to download and upload university logo to Supabase Storage.');
  }
}
