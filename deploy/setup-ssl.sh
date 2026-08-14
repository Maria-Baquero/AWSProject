#!/bin/bash
# setup-ssl.sh - Configurar HTTPS con Let's Encrypt (requiere dominio apuntando a la EC2)
# Ejecutar en la EC2 cuando tengas un dominio configurado
# Uso: sudo bash setup-ssl.sh tu-dominio.com

set -e

DOMAIN=$1

# Validar parámetro de dominio
if [ -z "$DOMAIN" ]; then
    echo "Error: Se requiere un nombre de dominio como parámetro."
    echo ""
    echo "Uso: ./setup-ssl.sh tu-dominio.com"
    echo ""
    echo "Requisitos previos:"
    echo "  - El dominio debe apuntar a la IP pública de esta EC2 (registro DNS tipo A)"
    echo "  - Nginx debe estar configurado y corriendo (ejecutar setup-nginx.sh primero)"
    echo "  - Los puertos 80 y 443 deben estar abiertos en el Security Group"
    exit 1
fi

echo "=== Configuración SSL/HTTPS para: ${DOMAIN} ==="

# Paso 1: Instalar Certbot y el plugin de Nginx
echo ""
echo "=== Instalando Certbot y plugin de Nginx ==="
sudo dnf install -y certbot python3-certbot-nginx

echo "Certbot instalado: $(certbot --version 2>&1)"

# Paso 2: Obtener certificado SSL con Let's Encrypt
# --nginx: usa el plugin de Nginx para configurar automáticamente el servidor
#          (incluye redirección HTTP 301 a HTTPS - Req 11.2)
# --non-interactive: no solicita entrada del usuario
# --agree-tos: acepta los términos de servicio de Let's Encrypt
# --redirect: fuerza la redirección HTTP → HTTPS
echo ""
echo "=== Obteniendo certificado SSL de Let's Encrypt ==="
sudo certbot --nginx \
    -d "$DOMAIN" \
    --non-interactive \
    --agree-tos \
    --redirect \
    --register-unsafely-without-email

# Paso 3: Configurar renovación automática con timer de systemd
# El timer de certbot ejecuta la renovación 2 veces al día (Req 11.3)
# Si la renovación falla, systemd registra el error en logs sin detener Nginx (Req 11.4)
echo ""
echo "=== Configurando renovación automática del certificado ==="

# Crear override del timer para asegurar que se ejecuta 2 veces al día
sudo mkdir -p /etc/systemd/system/certbot-renew.timer.d
sudo tee /etc/systemd/system/certbot-renew.timer.d/override.conf > /dev/null << 'TIMER_CONF'
[Timer]
OnCalendar=
OnCalendar=*-*-* 00:00:00
OnCalendar=*-*-* 12:00:00
RandomizedDelaySec=3600
TIMER_CONF

# Crear override del servicio para que no detenga Nginx si falla la renovación
sudo mkdir -p /etc/systemd/system/certbot-renew.service.d
sudo tee /etc/systemd/system/certbot-renew.service.d/override.conf > /dev/null << 'SERVICE_CONF'
[Service]
# No detener otros servicios si la renovación falla
Type=oneshot
ExecStart=
ExecStart=/usr/bin/certbot renew --quiet --deploy-hook "systemctl reload nginx"
SERVICE_CONF

# Recargar configuración de systemd
sudo systemctl daemon-reload

# Habilitar y arrancar el timer de renovación
sudo systemctl enable certbot-renew.timer
sudo systemctl start certbot-renew.timer

echo "Timer de renovación configurado (se ejecuta 2 veces al día)"
echo "Estado del timer:"
sudo systemctl status certbot-renew.timer --no-pager || true

# Paso 4: Verificar que todo funciona correctamente
echo ""
echo "=== Verificando configuración SSL ==="
sudo nginx -t && echo "Configuración de Nginx válida"

echo ""
echo "=== SSL configurado exitosamente ==="
echo "La aplicación está disponible en: https://${DOMAIN}"
echo ""
echo "Notas:"
echo "  - HTTP (puerto 80) redirige automáticamente a HTTPS (puerto 443)"
echo "  - El certificado se renueva automáticamente cuando falten menos de 30 días"
echo "  - Para verificar el timer: sudo systemctl list-timers certbot-renew.timer"
echo "  - Para renovar manualmente: sudo certbot renew --dry-run"
