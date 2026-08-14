#!/bin/bash
# setup-pm2-logrotate.sh - Instala y configura pm2-logrotate para rotación automática de logs
# Ejecutar en la EC2 después de que PM2 esté instalado
#
# Configura:
#   - max_size: 10M (rotar cuando un archivo de log alcance 10 MB)
#   - retain: 10 (conservar un máximo de 10 archivos rotados)

set -e

echo "=== Instalando pm2-logrotate ==="
pm2 install pm2-logrotate

echo "=== Configurando pm2-logrotate ==="

# Rotar cuando el archivo alcance 10 MB
pm2 set pm2-logrotate:max_size 10M

# Conservar máximo 10 archivos rotados
pm2 set pm2-logrotate:retain 10

echo ""
echo "=== Configuración de pm2-logrotate completada ==="
echo ""
echo "Configuración actual:"
pm2 conf pm2-logrotate

echo ""
echo "Los logs se rotan automáticamente al alcanzar 10 MB."
echo "Se conservan un máximo de 10 archivos rotados por log."
