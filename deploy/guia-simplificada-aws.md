# Guía Simplificada AWS — Clínica Veterinaria (web de prueba)

Esta es una versión reducida de la guía de Kiro, usando la **VPC default** que ya tiene tu cuenta de AWS, pensada para una web de prueba con base de datos funcional, sin todo el montaje de red desde cero.

## Resumen de lo que vamos a crear

| # | Recurso | Notas |
|---|---------|-------|
| 1 | Security Group `sg-web-server` | Para la EC2 |
| 2 | Security Group `sg-database` | Para el RDS |
| 3 | EC2 (t2.micro) | En la VPC default, subnet pública |
| 4 | Elastic IP (opcional) | Solo si no quieres que cambie la IP |
| 5 | DB Subnet Group | Usando subnets de la VPC default |
| 6 | RDS PostgreSQL (db.t3.micro) | Sin acceso público, en VPC default |

Nos saltamos: crear VPC, Internet Gateway, Subnets y Route Tables manuales — la VPC default ya los tiene listos y funcionando.

---

## Paso 1: Comprobar tu VPC default

1. Ir a **VPC** en la consola de AWS
2. En "Your VPCs", busca la que tiene la columna **Default VPC** = Yes
3. Anota su VPC ID (lo usarás en los pasos siguientes)
4. En "Subnets", verás varias subnets de esa VPC, una por cada zona de disponibilidad (us-east-1a, us-east-1b, etc.) — **todas son públicas y ya tienen ruta a Internet**

No hace falta tocar nada aquí, solo identificar la VPC y un par de subnets.

---

## Paso 2: Crear los Security Groups

### 2.1 `sg-web-server` (para la EC2)

1. VPC → **Security groups** → **Create security group**
2. Configurar:
   - **Name**: `sg-web-server`
   - **Description**: `Permite HTTP, HTTPS y SSH restringido`
   - **VPC**: tu VPC default
3. **Inbound rules**:

   | Tipo | Puerto | Origen |
   |------|--------|--------|
   | HTTP | 80 | 0.0.0.0/0 |
   | HTTPS | 443 | 0.0.0.0/0 |
   | SSH | 22 | TU_IP/32 (mira tu IP en https://checkip.amazonaws.com/) |

4. Crear

### 2.2 `sg-database` (para el RDS)

1. **Create security group**
2. Configurar:
   - **Name**: `sg-database`
   - **Description**: `Permite PostgreSQL solo desde el servidor web`
   - **VPC**: tu VPC default
3. **Inbound rules**:

   | Tipo | Puerto | Origen |
   |------|--------|--------|
   | PostgreSQL | 5432 | `sg-web-server` (selecciona el SG por nombre, no pongas 0.0.0.0/0) |

4. Crear

---

## Paso 3: Lanzar la instancia EC2

1. EC2 → **Launch instances**
2. Configurar:
   - **Name**: `veterinary-server`
   - **AMI**: Amazon Linux 2023
   - **Instance type**: `t2.micro`
   - **Key pair**: crea uno nuevo si no tienes (`veterinary-key`, tipo RSA, `.pem`)
   - **Network settings** → Edit:
     - **VPC**: tu VPC default
     - **Subnet**: cualquiera de las disponibles (ej. us-east-1a)
     - **Auto-assign public IP**: Enable
     - **Security group**: seleccionar existente → `sg-web-server`
   - **Storage**: 8 GiB gp3 está bien
3. Launch instance

No olvides: `chmod 400 veterinary-key.pem` en tu terminal local.

---

## Paso 4: Elastic IP (opcional)

Solo hazlo si vas a parar/arrancar la instancia y no quieres que la IP pública cambie cada vez. Si la vas a dejar encendida todo el rato durante las pruebas, puedes saltarte este paso y usar la IP pública normal que te asigna la EC2.

Si decides hacerlo:
1. EC2 → **Elastic IPs** → **Allocate Elastic IP address**
2. Asociarla a `veterinary-server`

⚠️ Recuerda: si la liberas o la dejas sin asociar, cobra ~$3.60/mes.

---

## Paso 5: Crear el RDS PostgreSQL

### 5.1 DB Subnet Group

1. RDS → **Subnet groups** → **Create DB subnet group**
2. Configurar:
   - **Name**: `veterinary-db-subnet-group`
   - **VPC**: tu VPC default
   - **Availability Zones**: selecciona al menos 2 (ej. us-east-1a y us-east-1b)
   - **Subnets**: selecciona una subnet de cada AZ elegida (son las subnets default, ya públicas)
3. Crear

### 5.2 Crear la base de datos

1. RDS → **Databases** → **Create database**
2. Configurar:
   - **Method**: Standard create
   - **Engine**: PostgreSQL (versión 15.x o 16.x más reciente)
   - **Template**: Free tier
   - **DB instance identifier**: `veterinary-db`
   - **Master username**: `postgres`
   - **Master password**: una segura (16+ caracteres)
   - **Instance class**: `db.t3.micro`
   - **Storage**: gp2, 20 GiB, sin autoscaling
   - **Multi-AZ**: Do not create a standby instance
   - **VPC**: tu VPC default
   - **DB subnet group**: `veterinary-db-subnet-group`
   - **Public access**: **No** ⚠️ (importante, aunque esté en VPC default)
   - **VPC security group**: Choose existing → `sg-database` (quita el "default" si aparece marcado)
   - **Additional configuration**:
     - **Initial database name**: `veterinary_clinic`
     - **Backup retention**: 1 día está bien para pruebas
     - **Enable deletion protection**: déjalo desmarcado (así puedes borrarla fácil al terminar)
     - Resto: valores por defecto
3. Create database

Tarda entre 5-15 minutos en estar "Available".

---

## Paso 6: Conectar y desplegar

Esto es exactamente igual que en la guía original de Kiro:

```bash
# Conectarte a la EC2
ssh -i veterinary-key.pem ec2-user@TU_IP_PUBLICA

# Copiar y ejecutar el script de setup
scp -i veterinary-key.pem deploy/setup-ec2.sh ec2-user@TU_IP_PUBLICA:/home/ec2-user/
ssh -i veterinary-key.pem ec2-user@TU_IP_PUBLICA
chmod +x setup-ec2.sh
./setup-ec2.sh
```

Configura el `.env` con el endpoint del RDS (lo ves en RDS → tu base de datos → Connectivity & security):

```bash
DB_HOST=veterinary-db.xxxxxxxxxxxx.us-east-1.rds.amazonaws.com
DB_PORT=5432
DB_NAME=veterinary_clinic
DB_USER=postgres
DB_PASSWORD=TU_CONTRASEÑA
JWT_SECRET=TU_JWT_SECRET
JWT_EXPIRATION=24h
PORT=3000
NODE_ENV=production
```

Luego despliega, migra y configura nginx igual que indica la guía original (Pasos 10.3 a 10.5).

---

## Limpieza al terminar

1. RDS: eliminar (sin snapshot final)
2. EC2: terminar instancia
3. Elastic IP: liberar si la creaste
4. Security groups: eliminar `sg-database` primero, luego `sg-web-server`

No tienes que tocar la VPC default ni sus subnets — son de tu cuenta y se quedan ahí para futuros proyectos.
