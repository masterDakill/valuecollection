// Configuration PM2 pour l'Évaluateur de Collection Pro
module.exports = {
  apps: [
    {
      name: 'evaluateur-collection-pro',
      script: 'npx',
      args: 'wrangler pages dev dist --d1=collections-database --local --ip 0.0.0.0 --port 3000',
      env: {
        NODE_ENV: 'development',
        PORT: 3000
      },
      watch: false,
      instances: 1,
      exec_mode: 'fork',
      restart_delay: 3000,
      max_restarts: 10,
      min_uptime: '10s'
    }
  ]
}