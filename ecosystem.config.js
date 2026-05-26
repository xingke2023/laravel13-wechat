module.exports = {
  apps: [
    {
      name: 'hengtai-backend',
      script: 'php8.4',
      args: 'artisan serve --host=127.0.0.1 --port=8081 --no-reload',
      cwd: '/home/ubuntu/laravel13-wechat-hengtai-ai/backend',
      interpreter: 'none',
      autorestart: true,
      watch: false,
      max_memory_restart: '300M',
      env: {
        APP_ENV: 'production',
        PHP_CLI_SERVER_WORKERS: '8',
      },
    },
    {
      name: 'hengtai-frontend',
      script: './node_modules/.bin/next',
      args: 'start -p 3111 -H 127.0.0.1',
      cwd: '/home/ubuntu/laravel13-wechat-hengtai-ai/frontend',
      interpreter: 'none',
      autorestart: true,
      watch: false,
      max_memory_restart: '600M',
    },
  ],
};
