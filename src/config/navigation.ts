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
  { label: 'Music', href: '/music' },
  { label: 'About', href: '/about' },
  { label: 'Newsletter', href: '/to/news', external: true },
];

export const socialLinks: NavLink[] = [
  { label: 'LinkedIn', href: 'https://www.linkedin.com/in/tigresstamm/', external: true, icon: 'linkedin' },
  { label: 'GitHub', href: 'https://github.com/tamm', external: true, icon: 'github' },
  { label: 'Instagram', href: 'https://www.instagram.com/tigresstamm', external: true, icon: 'instagram' },
  { label: 'Mastodon', href: 'https://corteximplant.com/@tamm', external: true, icon: 'mastodon' },
  { label: 'Spotify', href: 'https://open.spotify.com/artist/0EhxCpwkcCXt9UyMqhncve', external: true, icon: 'spotify' },
  { label: 'Ko-fi', href: 'https://ko-fi.com/tigresstamm', external: true, icon: 'kofi' },
];

export const projectLinks: NavLink[] = [
  { label: 'Queer Run Club', href: 'https://queerrunclub.au', external: true },
];

export const footerSections: NavSection[] = [
  {
    title: 'Explore',
    links: [
      { label: 'Blog', href: '/blog' },
      { label: 'Music', href: '/music' },
      { label: 'About', href: '/about' },
      { label: 'Newsletter', href: '/to/news', external: true },
      { label: 'RSS Feed', href: '/rss.xml' },
      { label: 'All Links', href: '/to/', external: true },
    ],
  },
  {
    title: 'Connect',
    links: socialLinks,
  },
];
