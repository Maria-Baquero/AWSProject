#!/bin/bash
# setup-nginx.sh - Configurar Nginx como proxy reverso para la aplicación veterinaria
# Ejecutar en la EC2 después del setup inicial (setup-ec2.sh)
# Uso: sudo bash setup-nginx.sh

set -e

echo "=== Configurando Nginx como proxy reverso ==="

# Crear archivo de configuración del proxy reverso
sudo tee /etc/nginx/conf.d/veterinary-app.conf > /dev/null << 'NGINX_CONF'
server {
    listen 80;
    server_name _;

    access_log /var/log/nginx/veterinary-access.log;
    error_log /var/log/nginx/veterinary-error.log;

    # Proxy para toda la aplicación (API + frontend estático)
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # Timeouts de 60 segundos (genera HTTP 504 si el backend no responde)
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Cache para archivos estáticos del frontend (7 días = 604800 segundos)
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        expires 7d;
        add_header Cache-Control "public, max-age=604800";
    }

    # Limitar tamaño de body a 10MB (rechaza con HTTP 413 si excede)
    client_max_body_size 10M;
}
NGINX_CONF

echo "Archivo de configuración creado: /etc/nginx/conf.d/veterinary-app.conf"

# Eliminar configuración default de Nginx si existe
if [ -f /etc/nginx/conf.d/default.conf ]; then
    sudo rm -f /etc/nginx/conf.d/default.conf
    echo "Configuración default de Nginx eliminada"
fi

# Verificar configuración antes de reiniciar
echo "Verificando configuración de Nginx..."
if sudo nginx -t; then
    echo "Configuración válida. Reiniciando Nginx..."
    sudo systemctl restart nginx
    echo "=== Nginx configurado exitosamente ==="
    echo "Proxy reverso: puerto 80 → puerto 3000"
else
    echo "ERROR: La configuración de Nginx es inválida."
    echo "No se reinició Nginx. Revise el archivo /etc/nginx/conf.d/veterinary-app.conf"
    exit 1
fi
