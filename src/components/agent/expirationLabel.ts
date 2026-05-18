const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Translate an `expiresAt` timestamp into the short label used in the list
 * card and the chat header. Returns null if the agent is pinned (we render
 * a star instead) or has no expiration.
 */
export function expirationLabel(expiresAt: string | null, pinned: boolean): string | null {
    if (pinned || !expiresAt) return null;
    const now = Date.now();
    const target = new Date(expiresAt).getTime();
    const diffDays = Math.ceil((target - now) / DAY_MS);
    if (diffDays > 1) return `expires in ${diffDays} days`;
    if (diffDays === 1) return 'expires tomorrow';
    return 'expires today';
}
