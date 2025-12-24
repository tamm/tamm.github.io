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
  { label: 'About', href: '/about' },
  { label: 'Newsletter', href: '/to/news', external: true },
];

export const socialLinks: NavLink[] = [
  { label: 'LinkedIn', href: 'https://www.linkedin.com/in/tigresstamm/', external: true, icon: 'linkedin' },
  { label: 'GitHub', href: 'https://github.com/tamm', external: true, icon: 'github' },
  { label: 'Instagram', href: 'https://www.instagram.com/tigresstamm', external: true, icon: 'instagram' },
  { label: 'Mastodon', href: 'https://corteximplant.com/@tamm', external: true, icon: 'mastodon' },
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
    title: 'Projects',
    links: [
      { label: 'Queer Run Club', href: 'https://queerrunclub.au', external: true },
    ],
  },
  {
    title: 'Connect',
    links: socialLinks,
  },
];
