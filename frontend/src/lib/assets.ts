/**
 * Get the full path for a public asset
 * Handles basePath automatically
 */
export function getAssetPath(path: string): string {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
  
  // Remove leading slash if exists
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  
  // Return full path with basePath
  return basePath ? `${basePath}/${cleanPath}` : `/${cleanPath}`;
}

/**
 * Common asset paths
 */
export const ASSETS = {
  LOGO: getAssetPath('3_logo_p-1-fit.png'),
  BackgroundLogo: getAssetPath('tappic.png'),
} as const;

