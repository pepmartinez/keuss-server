module.exports = {
  someSidebar: [
    {
      type: 'category',
      label: 'Intro',
      items: [
        'about',
        'quickstart',
        'concepts'
      ]
    },
    {
      type: 'category',
      label: 'Usage',
      items: [
        'usage/rest',
        'usage/stomp',
        'usage/amqp10',
        'usage/clustering',
        'usage/exchanges',
        'usage/monitoring',
        'usage/gui',
      ]
    },
    {type: 'doc', id: 'examples'},
    {type: 'doc', id: 'changelog'},
  ],
};
