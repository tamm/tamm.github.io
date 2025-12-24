export interface NavLink {
  label: string;
  href: string;
  external?: boolean;
  icon?: string;
}

export interface NavSection {
  title?: string;
  links: NavLink[];
}

export const mainNavigation: NavLink[] = [
  { label: 'Blog', href: '/blog' },
  { label: 'Newsletter', href: '/to/news', external: true },
  { label: 'About', href: '/about' },
];

export const socialLinks: NavLink[] = [
  { label: 'LinkedIn', href: 'https://www.linkedin.com/in/tigresstamm/', external: true, icon: 'linkedin' },
  { label: 'GitHub', href: 'https://github.com/tamm', external: true, icon: 'github' },
  { label: 'Instagram', href: 'https://instagram.com/tigresstamm', external: true, icon: 'instagram' },
  { label: 'Bluesky', href: 'https://bsky.app/profile/tamm.in', external: true, icon: 'bluesky' },
  { label: 'Spotify', href: 'https://open.spotify.com/user/tamm', external: true, icon: 'spotify' },
];

export const footerSections: NavSection[] = [
  {
    title: 'Pages',
    links: [
      { label: 'Blog', href: '/blog' },
      { label: 'About', href: '/about' },
      { label: 'All Links', href: '/to/', external: true },
    ],
  },
  {
    title: 'Connect',
    links: socialLinks,
  },
];
