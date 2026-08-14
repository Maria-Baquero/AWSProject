#!/bin/bash
# deploy.sh - Ejecutar desde tu máquina LOCAL para desplegar
# Uso: ./deploy.sh <EC2-PUBLIC-IP> <PATH-TO-KEY.pem>

set -e

EC2_IP=$1
KEY_PATH=$2
REMOTE_USER="ec2-user"
REMOTE_DIR="/home/ec2-user/app"

if [ -z "$EC2_IP" ] || [ -z "$KEY_PATH" ]; then
    echo "Uso: ./deploy.sh <EC2-PUBLIC-IP> <PATH-TO-KEY.pem>"
    exit 1
fi

echo "=== Paso 1: Compilando backend ==="
npm run build

echo "=== Paso 2: Compilando frontend ==="
cd frontend
npm run build
cd ..

echo "=== Paso 3: Empaquetando y transfiriendo archivos al servidor ==="
tar -czf deploy.tar.gz \
    dist/ \
    frontend/dist/ \
    package.json \
    package-lock.json \
    migrations/ \
    ecosystem.config.js \
    --exclude='node_modules'

scp -i "$KEY_PATH" deploy.tar.gz "${REMOTE_USER}@${EC2_IP}:${REMOTE_DIR}/"

echo "=== Paso 4: Instalando en servidor remoto ==="
ssh -i "$KEY_PATH" "${REMOTE_USER}@${EC2_IP}" << 'EOF'
    cd /home/ec2-user/app

    # Descomprimir
    tar -xzf deploy.tar.gz
    rm deploy.tar.gz

    # Instalar dependencias de producción
    npm install --production

    # Reiniciar aplicación con PM2
    pm2 restart ecosystem.config.js --env production || pm2 start ecosystem.config.js --env production
    pm2 save

    echo "=== Deploy completado ==="
    pm2 status
EOF

# Limpiar archivo tar local
rm -f deploy.tar.gz

echo "=== ¡Despliegue exitoso! ==="
echo "La aplicación está disponible en: http://${EC2_IP}"
