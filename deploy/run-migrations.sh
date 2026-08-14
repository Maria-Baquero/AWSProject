#!/bin/bash
# run-migrations.sh - Ejecutar DESDE la EC2 (que tiene acceso a RDS)
# Uso: ./run-migrations.sh

set -e

# Cargar variables de entorno
source /home/ec2-user/app/.env

echo "=== Ejecutando migraciones en RDS ==="
echo "Host: $DB_HOST"
echo "Database: $DB_NAME"

# Execute all migration files in order
for migration in /home/ec2-user/app/migrations/*.sql; do
    if [ -f "$migration" ]; then
        echo "Ejecutando: $(basename $migration)"
        PGPASSWORD=$DB_PASSWORD psql \
            -h $DB_HOST \
            -p $DB_PORT \
            -U $DB_USER \
            -d $DB_NAME \
            -f "$migration"
    fi
done

echo "=== Migraciones completadas exitosamente ==="
