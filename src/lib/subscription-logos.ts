import {
  siAirbnb,
  siApplemusic,
  siAppletv,
  siDiscord,
  siDoordash,
  siDropbox,
  siFigma,
  siGithub,
  siGoogledrive,
  siHbomax,
  siNetflix,
  siNotion,
  siPatreon,
  siPaypal,
  siSpotify,
  siUber,
  siUbereats,
  siYoutube,
  siYoutubemusic,
  siZoom,
} from 'simple-icons';

export interface SubscriptionLogoDef {
  key: string;
  label: string;
  hex: string;
  path: string;
  keywords: string[];
}

export const POPULAR_SUBSCRIPTION_LOGOS: SubscriptionLogoDef[] = [
  { key: 'netflix', label: 'Netflix', hex: siNetflix.hex, path: siNetflix.path, keywords: ['netflix'] },
  { key: 'spotify', label: 'Spotify', hex: siSpotify.hex, path: siSpotify.path, keywords: ['spotify'] },
  { key: 'youtube', label: 'YouTube', hex: siYoutube.hex, path: siYoutube.path, keywords: ['youtube'] },
  { key: 'youtube-music', label: 'YouTube Music', hex: siYoutubemusic.hex, path: siYoutubemusic.path, keywords: ['youtube music', 'yt music'] },
  { key: 'apple-music', label: 'Apple Music', hex: siApplemusic.hex, path: siApplemusic.path, keywords: ['apple music'] },
  { key: 'apple-tv', label: 'Apple TV', hex: siAppletv.hex, path: siAppletv.path, keywords: ['apple tv'] },
  { key: 'hbo-max', label: 'HBO Max', hex: siHbomax.hex, path: siHbomax.path, keywords: ['hbo max', 'max'] },
  { key: 'zoom', label: 'Zoom', hex: siZoom.hex, path: siZoom.path, keywords: ['zoom'] },
  { key: 'discord', label: 'Discord', hex: siDiscord.hex, path: siDiscord.path, keywords: ['discord'] },
  { key: 'notion', label: 'Notion', hex: siNotion.hex, path: siNotion.path, keywords: ['notion'] },
  { key: 'figma', label: 'Figma', hex: siFigma.hex, path: siFigma.path, keywords: ['figma'] },
  { key: 'github', label: 'GitHub', hex: siGithub.hex, path: siGithub.path, keywords: ['github'] },
  { key: 'dropbox', label: 'Dropbox', hex: siDropbox.hex, path: siDropbox.path, keywords: ['dropbox'] },
  { key: 'google-drive', label: 'Google Drive', hex: siGoogledrive.hex, path: siGoogledrive.path, keywords: ['google drive', 'drive'] },
  { key: 'uber', label: 'Uber', hex: siUber.hex, path: siUber.path, keywords: ['uber'] },
  { key: 'uber-eats', label: 'Uber Eats', hex: siUbereats.hex, path: siUbereats.path, keywords: ['uber eats'] },
  { key: 'doordash', label: 'DoorDash', hex: siDoordash.hex, path: siDoordash.path, keywords: ['doordash', 'door dash'] },
  { key: 'airbnb', label: 'Airbnb', hex: siAirbnb.hex, path: siAirbnb.path, keywords: ['airbnb'] },
  { key: 'paypal', label: 'PayPal', hex: siPaypal.hex, path: siPaypal.path, keywords: ['paypal'] },
  { key: 'patreon', label: 'Patreon', hex: siPatreon.hex, path: siPatreon.path, keywords: ['patreon'] },
];

const logoMap = new Map(POPULAR_SUBSCRIPTION_LOGOS.map((item) => [item.key, item]));

function normalizeText(value: string) {
  return value.trim().toLowerCase();
}

export function getSubscriptionLogo(key?: string | null) {
  if (!key) return null;
  return logoMap.get(normalizeText(key)) || null;
}

export function inferSubscriptionLogoKey(name?: string | null) {
  if (!name) return null;
  const normalizedName = normalizeText(name);
  if (!normalizedName) return null;

  for (const logo of POPULAR_SUBSCRIPTION_LOGOS) {
    if (logo.keywords.some((keyword) => normalizedName.includes(keyword))) {
      return logo.key;
    }
  }

  return null;
}

export function resolveSubscriptionLogoKey(logoKey?: string | null, name?: string | null) {
  const explicit = getSubscriptionLogo(logoKey);
  if (explicit) return explicit.key;
  return inferSubscriptionLogoKey(name);
}
