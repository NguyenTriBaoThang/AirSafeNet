// @ts-check
const { themes: prismThemes } = require('prism-react-renderer');

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'AirSafeNet',
  tagline: 'AI-powered Air Quality Monitoring & Personalized Early Warning for Ho Chi Minh City',
  favicon: 'img/favicon.ico',

  url: 'https://nguyentribaothang.github.io',
  baseUrl: '/AirSafeNet/',

  organizationName: 'NguyenTriBaoThang',
  projectName: 'AirSafeNet',
  deploymentBranch: 'gh-pages',
  trailingSlash: false,

  onBrokenLinks: 'warn',
  onBrokenMarkdownLinks: 'warn',

  i18n: {
    defaultLocale: 'vi',
    locales: ['vi', 'en'],
    localeConfigs: {
      vi: { label: 'Tiếng Việt', direction: 'ltr' },
      en: { label: 'English',    direction: 'ltr' },
    },
  },

  presets: [
    [
      'classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          sidebarPath: require.resolve('./sidebars.js'),
          editUrl: 'https://github.com/NguyenTriBaoThang/AirSafeNet/edit/main/docs-site/',
        },
        blog: false,
        theme: {
          customCss: require.resolve('./src/css/custom.css'),
        },
      }),
    ],
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      image: 'img/social-card.png',
      colorMode: {
        defaultMode: 'dark',
        disableSwitch: false,
        respectPrefersColorScheme: true,
      },
      navbar: {
        title: 'AirSafeNet',
        logo: {
          alt: 'AirSafeNet Logo',
          src: 'img/logo.svg',
          srcDark: 'img/logo-dark.svg',
        },
        items: [
          {
            type: 'docSidebar',
            sidebarId: 'docsSidebar',
            position: 'left',
            label: 'Documentation',
          },
          { to: '/docs/roadmap',      label: 'Roadmap',    position: 'left' },
          { to: '/docs/api',          label: 'API',        position: 'left' },
          {
            href: 'https://github.com/NguyenTriBaoThang/AirSafeNet/wiki',
            label: 'Wiki',
            position: 'left',
          },
          {
            type: 'localeDropdown',
            position: 'right',
          },
          {
            href: 'https://github.com/NguyenTriBaoThang/AirSafeNet',
            label: 'GitHub',
            position: 'right',
          },
        ],
      },
      footer: {
        style: 'dark',
        links: [
          {
            title: 'Documentation',
            items: [
              { label: 'Getting Started',  to: '/docs/getting-started' },
              { label: 'Architecture',     to: '/docs/architecture' },
              { label: 'AI Model',         to: '/docs/ai-model' },
              { label: 'API Reference',    to: '/docs/api' },
            ],
          },
          {
            title: 'Features',
            items: [
              { label: 'Activity Planner', to: '/docs/features/activity' },
              { label: 'Heatmap',          to: '/docs/features/heatmap' },
              { label: 'AI Assistant',     to: '/docs/features/assistant' },
              { label: 'Notifications',    to: '/docs/features/notifications' },
            ],
          },
          {
            title: 'Community',
            items: [
              { label: 'GitHub Issues',   href: 'https://github.com/NguyenTriBaoThang/AirSafeNet/issues' },
              { label: 'Contributing',    to: '/docs/contributing' },
              { label: 'Security',        to: '/docs/security' },
            ],
          },
          {
            title: 'More',
            items: [
              { label: 'Roadmap',         to: '/docs/roadmap' },
              { label: 'Changelog',       to: '/docs/changelog' },
              { label: 'Docker Guide',    to: '/docs/docker' },
            ],
          },
        ],
        copyright: `Copyright © ${new Date().getFullYear()} AirSafeNet ● KTT Team ● HUTECH`,
      },
      prism: {
        theme: prismThemes.github,
        darkTheme: prismThemes.dracula,
        additionalLanguages: ['bash', 'csharp', 'python', 'yaml', 'json', 'typescript'],
      },
      algolia: undefined,
    }),
};

module.exports = config;