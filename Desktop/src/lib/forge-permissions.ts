// lib/forge-permissions.ts

export type ForgeRole = 'owner' | 'contributor' | 'viewer'

/**
 * Single source of truth for what each role can do on a forge.
 * Use this on both the client (to show/hide controls) AND on the server
 * inside the API routes (to actually enforce it) — client-side checks
 * alone can always be bypassed by calling the API directly.
 */

// Can add, edit, or delete files
export function canEditFiles(role: ForgeRole | null | undefined): boolean {
  return role === 'owner' || role === 'contributor'
}

// Can invite/remove contributors, change their roles
export function canManageTeam(role: ForgeRole | null | undefined): boolean {
  return role === 'owner'
}

// Can publish the forge / toggle public preview
export function canPublish(role: ForgeRole | null | undefined): boolean {
  return role === 'owner'
}

// Can upload a replacement ZIP
export function canUpload(role: ForgeRole | null | undefined): boolean {
  return role === 'owner' || role === 'contributor'
}

// Can post comments — viewers included, since commenting isn't editing
export function canComment(role: ForgeRole | null | undefined): boolean {
  return role === 'owner' || role === 'contributor' || role === 'viewer'
}

// Can delete the whole forge
export function canDeleteForge(role: ForgeRole | null | undefined): boolean {
  return role === 'owner'
}
