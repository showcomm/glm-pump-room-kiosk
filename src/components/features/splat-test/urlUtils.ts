/**
 * Transform cloud storage URLs to direct download format
 * Required because splat viewers need direct file access, not sharing pages
 */
export function getDirectDownloadUrl(url: string): string {
  // Dropbox sharing links need transformation
  if (url.includes('dropbox.com')) {
    // Change dl=0 or dl=1 to raw=1 for direct file access
    let directUrl = url.replace(/dl=[01]/, 'raw=1');
    // Also change www.dropbox.com to dl.dropboxusercontent.com for better compatibility
    directUrl = directUrl.replace('www.dropbox.com', 'dl.dropboxusercontent.com');
    console.log('Transformed Dropbox URL:', directUrl);
    return directUrl;
  }
  
  // GitHub raw URLs are already direct - no change needed
  if (url.includes('raw.githubusercontent.com')) {
    return url;
  }
  
  // Google Drive sharing links (if you ever use them)
  if (url.includes('drive.google.com/file/d/')) {
    const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (match) {
      const fileId = match[1];
      return `https://drive.google.com/uc?export=download&id=${fileId}`;
    }
  }
  
  return url;
}
