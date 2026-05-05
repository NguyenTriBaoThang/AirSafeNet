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
        {type: 'doc', id: 'dashboard',     label: 'Dashboard'},
        {type: 'doc', id: 'activity',      label: 'Activity Planner'},
        {type: 'doc', id: 'heatmap',       label: 'District Heatmap'},
        {type: 'doc', id: 'anomaly',       label: 'Anomaly Detection'},
        {type: 'doc', id: 'assistant',     label: 'AI Assistant'},
        {type: 'doc', id: 'notifications', label: 'Notifications'},
        {type: 'doc', id: 'guide',         label: 'PM2.5 Guide'},
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