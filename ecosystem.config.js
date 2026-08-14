// ecosystem.config.js - Configuración de PM2 para producción
// Logs se escriben en: /home/ec2-user/app/logs/
//   - error_file: /home/ec2-user/app/logs/error.log
//   - out_file:   /home/ec2-user/app/logs/output.log
// La rotación de logs se configura con pm2-logrotate (ver deploy/setup-pm2-logrotate.sh)

module.exports = {
  apps: [{
    name: 'veterinary-api',
    script: './dist/server.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '256M',

    // Límites de reinicio para prevenir bucles infinitos
    // max_restarts: máximo de reintentos antes de detenerse
    // min_uptime: tiempo mínimo (ms) que el proceso debe estar arriba para considerarse un inicio válido
    max_restarts: 15,
    min_uptime: '15000',

    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },

    // Logs en /home/ec2-user/app/logs/
    error_file: '/home/ec2-user/app/logs/error.log',
    out_file: '/home/ec2-user/app/logs/output.log',
    merge_logs: true,
    time: true
  }]
};
