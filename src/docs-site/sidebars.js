/** @type {import('@docusaurus/plugin-content-docs').SidebarsConfig} */
const sidebars = {
  docsSidebar: [
    {
      type: 'category',
      label: '🚀 Getting Started',
      collapsed: false,
      items: [
        'getting-started',
        'installation',
        'docker',
        'configuration',
      ],
    },
    {
      type: 'category',
      label: '🏗️ Architecture',
      items: [
        'architecture',
        'ai-model',
        'cache-system',
        'database',
      ],
    },
    {
      type: 'category',
      label: '✨ Features',
      items: [
        'features/dashboard',
        'features/activity',
        'features/heatmap',
        'features/anomaly',
        'features/assistant',
        'features/notifications',
        'features/guide',
      ],
    },
    {
      type: 'category',
      label: '📡 API Reference',
      items: [
        'api',
        'api-ai-server',
        'api-backend',
      ],
    },
    {
      type: 'category',
      label: '🤝 Contributing',
      items: [
        'contributing',
        'security',
        'branching',
      ],
    },
    {
      type: 'category',
      label: '📋 Project',
      items: [
        'roadmap',
        'changelog',
        'backlog',
      ],
    },
  ],
};

module.exports = sidebars;