#!/bin/bash
# setup-ec2.sh - Ejecutar una vez al crear la instancia EC2
# Conectarse: ssh -i "tu-key.pem" ec2-user@<EC2-PUBLIC-IP>
#
# Este script instala todas las dependencias necesarias para ejecutar
# la aplicación veterinaria en producción: Node.js 20 LTS, PM2, Nginx
# y el cliente PostgreSQL 15.

set -e

echo "=== Actualizando sistema ==="
sudo dnf update -y

echo "=== Instalando Node.js 20 LTS ==="
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo dnf install -y nodejs

echo "=== Instalando PM2 globalmente ==="
sudo npm install -g pm2

echo "=== Instalando Nginx ==="
sudo dnf install -y nginx

echo "=== Instalando PostgreSQL client 15 (para ejecutar migraciones) ==="
sudo dnf install -y postgresql15

echo "=== Creando directorio de la aplicación ==="
mkdir -p /home/ec2-user/app/logs

echo "=== Habilitando Nginx como servicio de systemd para arranque automático ==="
sudo systemctl enable nginx
sudo systemctl start nginx

echo "=== Configuración de PM2 para arranque automático con systemd ==="
pm2 startup systemd -u ec2-user --hp /home/ec2-user

echo "=== Setup completado exitosamente ==="
echo "Node.js version: $(node --version)"
echo "npm version: $(npm --version)"
echo "PM2 version: $(pm2 --version)"
echo "Nginx version: $(nginx -v 2>&1)"

exit 0
