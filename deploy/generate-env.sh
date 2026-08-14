#!/bin/bash
# generate-env.sh - Genera un archivo .env con credenciales seguras para producción
# Ejecutar desde la EC2 o localmente para generar las credenciales antes del despliegue.
#
# Uso: ./generate-env.sh [ruta-de-salida]
#   ruta-de-salida: ruta donde se creará el archivo .env (default: .env en directorio actual)
#
# Las credenciales se generan usando fuentes criptográficamente seguras (openssl rand).

set -e

# Ruta de salida del archivo .env (default: directorio actual)
OUTPUT_PATH="${1:-.env}"

# Verificar que openssl está disponible
if ! command -v openssl &> /dev/null; then
    echo "Error: openssl no está instalado. Instálelo antes de continuar."
    exit 1
fi

echo "=== Generando credenciales seguras ==="

# Generar DB_PASSWORD: mínimo 16 caracteres con mayúsculas, minúsculas, dígitos y especiales
# Se genera un password de 20 caracteres para mayor seguridad
generate_db_password() {
    local password=""
    local attempts=0
    local max_attempts=100

    while [ $attempts -lt $max_attempts ]; do
        # Generar candidato de 20 caracteres usando openssl
        password=$(openssl rand -base64 32 | tr -d '/+\n' | head -c 20)

        # Agregar caracteres especiales seguros para PostgreSQL (evitar comillas y backslash)
        # Insertar al menos un especial, un dígito, una mayúscula y una minúscula
        local has_upper=$(echo "$password" | grep -c '[A-Z]' || true)
        local has_lower=$(echo "$password" | grep -c '[a-z]' || true)
        local has_digit=$(echo "$password" | grep -c '[0-9]' || true)

        if [ "$has_upper" -ge 1 ] && [ "$has_lower" -ge 1 ] && [ "$has_digit" -ge 1 ]; then
            # Reemplazar un carácter con un carácter especial seguro para PostgreSQL
            local specials='!@#%^&*()-_=[]{}|;:,.<>?'
            local special_char="${specials:$((RANDOM % ${#specials})):1}"
            # Insertar el carácter especial en una posición aleatoria
            local pos=$((RANDOM % (${#password} - 1) + 1))
            password="${password:0:$pos}${special_char}${password:$((pos + 1))}"
            echo "$password"
            return 0
        fi

        attempts=$((attempts + 1))
    done

    # Fallback: construir password manualmente si los intentos se agotaron
    local upper=$(openssl rand -base64 4 | tr -dc 'A-Z' | head -c 4)
    local lower=$(openssl rand -base64 4 | tr -dc 'a-z' | head -c 4)
    local digits=$(openssl rand -base64 4 | tr -dc '0-9' | head -c 4)
    local specials='!@#%^&*()-_=[]{}|;:,.<>?'
    local special="${specials:$((RANDOM % ${#specials})):1}"
    local extra=$(openssl rand -base64 16 | tr -d '/+\n' | head -c 7)
    password="${upper}${lower}${digits}${special}${extra}"
    # Mezclar caracteres
    password=$(echo "$password" | fold -w1 | shuf | tr -d '\n' | head -c 20)
    echo "$password"
}

# Generar JWT_SECRET: mínimo 32 caracteres alfanuméricos criptográficamente seguros
generate_jwt_secret() {
    openssl rand -base64 48 | tr -d '/+\n' | head -c 48
}

DB_PASSWORD=$(generate_db_password)
JWT_SECRET=$(generate_jwt_secret)

# Verificar longitudes mínimas
if [ ${#DB_PASSWORD} -lt 16 ]; then
    echo "Error: No se pudo generar un DB_PASSWORD con la longitud mínima requerida (16 caracteres)."
    exit 1
fi

if [ ${#JWT_SECRET} -lt 32 ]; then
    echo "Error: No se pudo generar un JWT_SECRET con la longitud mínima requerida (32 caracteres)."
    exit 1
fi

echo "=== Escribiendo archivo .env en: ${OUTPUT_PATH} ==="

cat > "$OUTPUT_PATH" << EOF
# =============================================================================
# Variables de Entorno - Producción (Clínica Veterinaria)
# =============================================================================
# Generado automáticamente por generate-env.sh
# IMPORTANTE: No compartir este archivo ni incluirlo en control de versiones.
# =============================================================================

# Database Configuration (RDS PostgreSQL)
DB_HOST=<TU-RDS-ENDPOINT>.us-east-1.rds.amazonaws.com
DB_PORT=5432
DB_NAME=veterinary_clinic
DB_USER=postgres
DB_PASSWORD=${DB_PASSWORD}

# JWT Configuration
JWT_SECRET=${JWT_SECRET}
JWT_EXPIRATION=24h

# Server Configuration
PORT=3000
NODE_ENV=production
EOF

# Establecer permisos 600 (solo lectura/escritura para el propietario)
chmod 600 "$OUTPUT_PATH"

echo "=== Archivo .env generado exitosamente ==="
echo ""
echo "Credenciales generadas:"
echo "  DB_PASSWORD: $(echo "$DB_PASSWORD" | head -c 4)******* (${#DB_PASSWORD} caracteres)"
echo "  JWT_SECRET:  $(echo "$JWT_SECRET" | head -c 4)******* (${#JWT_SECRET} caracteres)"
echo ""
echo "Permisos del archivo: $(stat -c '%a' "$OUTPUT_PATH" 2>/dev/null || stat -f '%Lp' "$OUTPUT_PATH" 2>/dev/null)"
echo ""
echo "⚠️  ACCIÓN REQUERIDA:"
echo "   Edite el archivo ${OUTPUT_PATH} y reemplace el valor de DB_HOST"
echo "   con el endpoint real de su instancia RDS."
echo "   Ejemplo: veterinary-db.abc123xyz.us-east-1.rds.amazonaws.com"
echo ""
