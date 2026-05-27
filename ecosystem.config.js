module.exports = {
  apps: [
    {
      name: 'clawcn-template-backend',
      script: 'php8.4',
      args: 'artisan serve --host=127.0.0.1 --port=8081',
      cwd: '/home/ubuntu/clawcn-template/backend',
      interpreter: 'none',
      autorestart: true,
      watch: false,
      max_memory_restart: '300M',
      env: {
        APP_ENV: 'local',
      },
    },
    {
      name: 'clawcn-template-frontend',
      script: './node_modules/.bin/next',
      args: 'dev -p 3111 -H 127.0.0.1',
      cwd: '/home/ubuntu/clawcn-template/frontend',
      interpreter: 'none',
      autorestart: true,
      watch: false,
      max_memory_restart: '600M',
    },
  ],
};
