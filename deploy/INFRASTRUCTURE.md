# Guía de Infraestructura AWS — Clínica Veterinaria

## Introducción

Esta guía documenta paso a paso cómo crear toda la infraestructura necesaria en AWS para desplegar la aplicación web de la clínica veterinaria. Está diseñada para seguirse desde la **Consola de AWS** (AWS Management Console) y es apta para quienes están aprendiendo AWS.

### Arquitectura General

```
Internet → Internet Gateway → VPC (10.0.0.0/16)
                                ├── Subnet Pública (10.0.1.0/24) → EC2 (app + Nginx)
                                ├── Subnet Privada 1 (10.0.2.0/24) → RDS PostgreSQL
                                └── Subnet Privada 2 (10.0.3.0/24) → (requerida por RDS)
```

### Resumen de Recursos a Crear

| # | Recurso | Propósito |
|---|---------|-----------|
| 1 | VPC | Red virtual aislada |
| 2 | Internet Gateway | Acceso a Internet |
| 3 | Subnets (3) | Segmentación de red |
| 4 | Tablas de Rutas (2) | Enrutamiento de tráfico |
| 5 | Security Groups (2) | Firewall virtual |
| 6 | EC2 Instance | Servidor de aplicación |
| 7 | Elastic IP | IP pública fija |
| 8 | RDS PostgreSQL | Base de datos |

---

## Paso 1: Crear la VPC

La VPC (Virtual Private Cloud) es la red virtual donde vivirán todos nuestros recursos.

### 1.1 Crear la VPC

1. Ir a **VPC** en la consola de AWS (buscar "VPC" en la barra superior)
2. En el panel izquierdo, hacer clic en **"Your VPCs"**
3. Hacer clic en **"Create VPC"**
4. Configurar:
   - **Resources to create**: VPC only
   - **Name tag**: `veterinary-vpc`
   - **IPv4 CIDR block**: `10.0.0.0/16`
   - **IPv6 CIDR block**: No IPv6 CIDR block
   - **Tenancy**: Default
5. Hacer clic en **"Create VPC"**

### 1.2 Habilitar DNS en la VPC

1. Seleccionar la VPC recién creada (`veterinary-vpc`)
2. Hacer clic en **"Actions"** → **"Edit VPC settings"**
3. Marcar las casillas:
   - ✅ **Enable DNS resolution**
   - ✅ **Enable DNS hostnames**
4. Hacer clic en **"Save"**

> **¿Por qué?** DNS resolution permite que los recursos dentro de la VPC resuelvan nombres DNS.
> DNS hostnames permite que las instancias EC2 reciban un nombre DNS público.

---

## Paso 2: Crear el Internet Gateway

El Internet Gateway permite que los recursos en la subnet pública se comuniquen con Internet.

### 2.1 Crear el Internet Gateway

1. En el panel izquierdo de VPC, hacer clic en **"Internet gateways"**
2. Hacer clic en **"Create internet gateway"**
3. Configurar:
   - **Name tag**: `veterinary-igw`
4. Hacer clic en **"Create internet gateway"**

### 2.2 Asociar el Internet Gateway a la VPC

1. Seleccionar el Internet Gateway recién creado (`veterinary-igw`)
2. Hacer clic en **"Actions"** → **"Attach to VPC"**
3. Seleccionar `veterinary-vpc`
4. Hacer clic en **"Attach internet gateway"**

> **Nota**: Solo puede haber un Internet Gateway por VPC.

---

## Paso 3: Crear las Subnets

Necesitamos 3 subnets: una pública para la EC2 y dos privadas para RDS (RDS requiere al menos 2 subnets en diferentes zonas de disponibilidad).

### 3.1 Crear Subnet Pública

1. En el panel izquierdo de VPC, hacer clic en **"Subnets"**
2. Hacer clic en **"Create subnet"**
3. Configurar:
   - **VPC ID**: Seleccionar `veterinary-vpc`
   - **Subnet name**: `veterinary-public-subnet`
   - **Availability Zone**: `us-east-1a`
   - **IPv4 subnet CIDR block**: `10.0.1.0/24`
4. Hacer clic en **"Create subnet"**

### 3.2 Habilitar auto-asignación de IP pública en la Subnet Pública

1. Seleccionar `veterinary-public-subnet`
2. Hacer clic en **"Actions"** → **"Edit subnet settings"**
3. Marcar: ✅ **Enable auto-assign public IPv4 address**
4. Hacer clic en **"Save"**

> **¿Por qué?** Esto asegura que las instancias lanzadas en esta subnet reciban automáticamente una IP pública.

### 3.3 Crear Subnet Privada 1

1. Hacer clic en **"Create subnet"**
2. Configurar:
   - **VPC ID**: Seleccionar `veterinary-vpc`
   - **Subnet name**: `veterinary-private-subnet-1`
   - **Availability Zone**: `us-east-1a`
   - **IPv4 subnet CIDR block**: `10.0.2.0/24`
3. Hacer clic en **"Create subnet"**

### 3.4 Crear Subnet Privada 2

1. Hacer clic en **"Create subnet"**
2. Configurar:
   - **VPC ID**: Seleccionar `veterinary-vpc`
   - **Subnet name**: `veterinary-private-subnet-2`
   - **Availability Zone**: `us-east-1b`
   - **IPv4 subnet CIDR block**: `10.0.3.0/24`
3. Hacer clic en **"Create subnet"**

> **¿Por qué dos subnets privadas?** RDS requiere un "DB Subnet Group" con subnets en al menos 2 zonas de disponibilidad diferentes, incluso para despliegues Single-AZ.

---

## Paso 4: Configurar Tablas de Rutas

Las tablas de rutas controlan hacia dónde se dirige el tráfico de red.

### 4.1 Crear Tabla de Rutas Pública

1. En el panel izquierdo de VPC, hacer clic en **"Route tables"**
2. Hacer clic en **"Create route table"**
3. Configurar:
   - **Name**: `veterinary-public-rt`
   - **VPC**: Seleccionar `veterinary-vpc`
4. Hacer clic en **"Create route table"**

### 4.2 Agregar ruta a Internet en la Tabla Pública

1. Seleccionar `veterinary-public-rt`
2. Hacer clic en la pestaña **"Routes"**
3. Hacer clic en **"Edit routes"**
4. Hacer clic en **"Add route"**
5. Configurar:
   - **Destination**: `0.0.0.0/0`
   - **Target**: Seleccionar **"Internet Gateway"** → `veterinary-igw`
6. Hacer clic en **"Save changes"**

### 4.3 Asociar la Subnet Pública a la Tabla de Rutas Pública

1. Con `veterinary-public-rt` seleccionada, ir a la pestaña **"Subnet associations"**
2. Hacer clic en **"Edit subnet associations"**
3. Marcar: ✅ `veterinary-public-subnet` (10.0.1.0/24)
4. Hacer clic en **"Save associations"**

### 4.4 Crear Tabla de Rutas Privada

1. Hacer clic en **"Create route table"**
2. Configurar:
   - **Name**: `veterinary-private-rt`
   - **VPC**: Seleccionar `veterinary-vpc`
3. Hacer clic en **"Create route table"**

> **Nota**: La tabla de rutas privada solo tiene la ruta local (10.0.0.0/16 → local) que se crea automáticamente. **NO agregar ruta hacia Internet Gateway ni NAT Gateway.**

### 4.5 Asociar las Subnets Privadas a la Tabla de Rutas Privada

1. Con `veterinary-private-rt` seleccionada, ir a la pestaña **"Subnet associations"**
2. Hacer clic en **"Edit subnet associations"**
3. Marcar:
   - ✅ `veterinary-private-subnet-1` (10.0.2.0/24)
   - ✅ `veterinary-private-subnet-2` (10.0.3.0/24)
4. Hacer clic en **"Save associations"**

### Resumen de Tablas de Rutas

| Tabla de Rutas | Rutas | Subnets Asociadas |
|----------------|-------|-------------------|
| veterinary-public-rt | 10.0.0.0/16 → local, 0.0.0.0/0 → igw | veterinary-public-subnet |
| veterinary-private-rt | 10.0.0.0/16 → local (solo) | veterinary-private-subnet-1, veterinary-private-subnet-2 |

---

## Paso 5: Crear Security Groups

Los Security Groups actúan como firewalls virtuales que controlan el tráfico de entrada y salida.

### 5.1 Crear Security Group para el Servidor Web (EC2)

1. En el panel izquierdo de VPC, hacer clic en **"Security groups"**
2. Hacer clic en **"Create security group"**
3. Configurar:
   - **Security group name**: `sg-web-server`
   - **Description**: `Permite HTTP, HTTPS y SSH restringido para el servidor web`
   - **VPC**: Seleccionar `veterinary-vpc`

4. **Reglas de entrada (Inbound rules)** — Hacer clic en "Add rule" para cada una:

   | Tipo | Protocolo | Puerto | Origen | Descripción |
   |------|-----------|--------|--------|-------------|
   | HTTP | TCP | 80 | 0.0.0.0/0 | Tráfico HTTP público |
   | HTTPS | TCP | 443 | 0.0.0.0/0 | Tráfico HTTPS público |
   | SSH | TCP | 22 | `TU_IP/32` | SSH solo desde tu IP |

   > **⚠️ IMPORTANTE**: Para la regla SSH, reemplaza `TU_IP/32` con tu dirección IP pública actual.
   > Para conocer tu IP, visita https://checkip.amazonaws.com/
   > Ejemplo: si tu IP es 203.0.113.25, escribe `203.0.113.25/32`

5. **Reglas de salida (Outbound rules)**:
   - Dejar la regla por defecto: Todo el tráfico → 0.0.0.0/0 (permitir toda salida)

6. Hacer clic en **"Create security group"**

### 5.2 Crear Security Group para la Base de Datos (RDS)

1. Hacer clic en **"Create security group"**
2. Configurar:
   - **Security group name**: `sg-database`
   - **Description**: `Permite acceso PostgreSQL solo desde el servidor web`
   - **VPC**: Seleccionar `veterinary-vpc`

3. **Reglas de entrada (Inbound rules)** — Hacer clic en "Add rule":

   | Tipo | Protocolo | Puerto | Origen | Descripción |
   |------|-----------|--------|--------|-------------|
   | PostgreSQL | TCP | 5432 | `sg-web-server` | Solo desde EC2 |

   > **Importante**: En el campo "Source", seleccionar **"Custom"** y empezar a escribir `sg-web-server`. AWS mostrará el security group para seleccionarlo por su ID.
   > **NO usar 0.0.0.0/0** — la base de datos NUNCA debe ser accesible desde Internet.

4. **Reglas de salida (Outbound rules)**:
   - Dejar la regla por defecto: Todo el tráfico → 0.0.0.0/0

5. Hacer clic en **"Create security group"**

### Resumen de Security Groups

```
sg-web-server (para EC2):
  ├── Entrada: TCP 80  ← 0.0.0.0/0 (HTTP)
  ├── Entrada: TCP 443 ← 0.0.0.0/0 (HTTPS)
  ├── Entrada: TCP 22  ← TU_IP/32 (SSH restringido)
  └── Salida:  Todo    → 0.0.0.0/0

sg-database (para RDS):
  ├── Entrada: TCP 5432 ← sg-web-server (PostgreSQL solo desde EC2)
  └── Salida:  Todo     → 0.0.0.0/0
```

> **Principio de mínimo privilegio**: La base de datos solo acepta conexiones desde la EC2. Cualquier intento de conexión directa desde Internet será rechazado silenciosamente.

---

## Paso 6: Crear la Instancia EC2

La instancia EC2 es el servidor virtual donde correrá la aplicación.

### 6.1 Crear un Key Pair (si no tienes uno)

1. Ir a **EC2** en la consola de AWS
2. En el panel izquierdo, bajo "Network & Security", hacer clic en **"Key Pairs"**
3. Hacer clic en **"Create key pair"**
4. Configurar:
   - **Name**: `veterinary-key`
   - **Key pair type**: RSA
   - **Private key file format**: `.pem` (para Linux/Mac) o `.ppk` (para PuTTY en Windows)
5. Hacer clic en **"Create key pair"**
6. **El archivo .pem se descargará automáticamente. ¡Guárdalo en un lugar seguro!**

```bash
# En tu terminal local, asegurar permisos correctos del key pair:
chmod 400 veterinary-key.pem
```

> **⚠️ ADVERTENCIA**: No es posible descargar el archivo .pem nuevamente. Si lo pierdes, tendrás que crear un nuevo Key Pair.

### 6.2 Lanzar la Instancia EC2

1. En el dashboard de EC2, hacer clic en **"Launch instances"**
2. Configurar:

**Nombre:**
- **Name**: `veterinary-server`

**AMI (Amazon Machine Image):**
- Seleccionar **"Amazon Linux 2023 AMI"**
- Architecture: 64-bit (x86)

**Tipo de instancia:**
- Seleccionar **`t2.micro`** (Free Tier eligible)
- Alternativa: `t3.micro` si t2.micro no está disponible

**Key Pair:**
- Seleccionar `veterinary-key` (el que creamos antes)

**Configuración de red (Network settings):**
- Hacer clic en **"Edit"**
- **VPC**: Seleccionar `veterinary-vpc`
- **Subnet**: Seleccionar `veterinary-public-subnet`
- **Auto-assign public IP**: Enable
- **Firewall (security groups)**: Seleccionar **"Select existing security group"**
- Seleccionar: `sg-web-server`

**Almacenamiento (Configure storage):**
- **Size**: `8` GiB
- **Volume type**: `gp3`
- **Delete on termination**: Yes

3. Hacer clic en **"Launch instance"**

### 6.3 Verificar que la Instancia está Corriendo

1. Ir a **EC2** → **"Instances"**
2. Esperar a que el **Instance state** sea `Running`
3. Esperar a que el **Status check** sea `2/2 checks passed`

---

## Paso 7: Asignar Elastic IP a la EC2

Una Elastic IP proporciona una dirección IP pública fija que no cambia al reiniciar la instancia.

### 7.1 Asignar una Elastic IP

1. En el panel izquierdo de EC2, bajo "Network & Security", hacer clic en **"Elastic IPs"**
2. Hacer clic en **"Allocate Elastic IP address"**
3. Configurar:
   - **Network Border Group**: `us-east-1` (por defecto)
4. Hacer clic en **"Allocate"**

### 7.2 Asociar la Elastic IP a la Instancia EC2

1. Seleccionar la Elastic IP recién creada
2. Hacer clic en **"Actions"** → **"Associate Elastic IP address"**
3. Configurar:
   - **Resource type**: Instance
   - **Instance**: Seleccionar `veterinary-server`
4. Hacer clic en **"Associate"**

> **Nota importante**: Una Elastic IP es gratuita mientras esté asociada a una instancia EC2 que esté corriendo. Si la instancia se detiene o la IP no se asocia, se cobra ~$3.60/mes.

### 7.3 Anotar la IP

Anota la dirección IP pública asignada. La usarás para:
- Conectarte por SSH: `ssh -i veterinary-key.pem ec2-user@TU_ELASTIC_IP`
- Acceder a la aplicación: `http://TU_ELASTIC_IP`
- Configurar la regla SSH del security group

---

## Paso 8: Crear la Instancia RDS PostgreSQL

RDS (Relational Database Service) proporciona una base de datos gestionada por AWS con backups automáticos.

### 8.1 Crear el DB Subnet Group

Antes de crear la instancia RDS, necesitamos un Subnet Group que agrupe las subnets privadas.

1. Ir a **RDS** en la consola de AWS (buscar "RDS" en la barra superior)
2. En el panel izquierdo, hacer clic en **"Subnet groups"**
3. Hacer clic en **"Create DB subnet group"**
4. Configurar:
   - **Name**: `veterinary-db-subnet-group`
   - **Description**: `Subnets privadas para la base de datos veterinaria`
   - **VPC**: Seleccionar `veterinary-vpc`
5. **Add subnets:**
   - **Availability Zones**: Seleccionar `us-east-1a` y `us-east-1b`
   - **Subnets**: Seleccionar:
     - ✅ `10.0.2.0/24` (veterinary-private-subnet-1, us-east-1a)
     - ✅ `10.0.3.0/24` (veterinary-private-subnet-2, us-east-1b)
6. Hacer clic en **"Create"**

### 8.2 Crear la Instancia RDS

1. En el panel izquierdo de RDS, hacer clic en **"Databases"**
2. Hacer clic en **"Create database"**
3. Configurar:

**Método de creación:**
- Seleccionar: **"Standard create"**

**Motor de base de datos:**
- **Engine type**: PostgreSQL
- **Engine version**: PostgreSQL 15 o 16 (seleccionar la última disponible del grupo 15.x o 16.x)

**Templates:**
- Seleccionar: **"Free tier"** (si está disponible) o **"Dev/Test"**

**Settings:**
- **DB instance identifier**: `veterinary-db`
- **Master username**: `postgres`
- **Credentials management**: Self managed
- **Master password**: (usar una contraseña segura de al menos 16 caracteres)
  
  > **Sugerencia**: Usa el script `deploy/generate-env.sh` para generar una contraseña segura, o genera una manualmente que incluya: mayúsculas, minúsculas, números y caracteres especiales.
  > Ejemplo de formato: `Vet2024!Clinic#Secure9`

- **Confirm password**: (repetir la contraseña)

**Instance configuration:**
- **DB instance class**: Seleccionar **"Burstable classes"** → `db.t3.micro`

**Storage:**
- **Storage type**: `gp2` (General Purpose SSD)
- **Allocated storage**: `20` GiB
- **Storage autoscaling**: Desmarcar "Enable storage autoscaling" (para controlar costos)

**Availability & durability:**
- **Multi-AZ deployment**: Seleccionar **"Do not create a standby instance"** (Single-AZ)

**Connectivity:**
- **Compute resource**: Don't connect to an EC2 compute resource
- **Network type**: IPv4
- **VPC**: Seleccionar `veterinary-vpc`
- **DB subnet group**: Seleccionar `veterinary-db-subnet-group`
- **Public access**: **No** ⚠️ (MUY IMPORTANTE — la BD no debe ser accesible desde Internet)
- **VPC security group**: Seleccionar **"Choose existing"**
  - Seleccionar: `sg-database`
  - Eliminar el security group "default" si aparece seleccionado
- **Availability Zone**: `us-east-1a`

**Database authentication:**
- Seleccionar: **"Password authentication"**

**Monitoring:**
- Desmarcar "Enable Enhanced monitoring" (para reducir costos en Free Tier)

**Additional configuration (expandir sección):**

- **Initial database name**: `veterinary_clinic`
  
  > **⚠️ IMPORTANTE**: Si no especificas un nombre aquí, RDS no creará ninguna base de datos y tendrás que crearla manualmente después.

- **DB parameter group**: default
- **Option group**: default

- **Backup:**
  - **Enable automated backups**: ✅ Sí
  - **Backup retention period**: `7` days
  - **Backup window**: No preference

- **Encryption:**
  - **Enable encryption**: ✅ Sí
  - **AWS KMS key**: Seleccionar **(default) aws/rds**

- **Maintenance:**
  - **Enable auto minor version upgrade**: ✅ Sí
  - **Maintenance window**: No preference

- **Deletion protection:**
  - **Enable deletion protection**: ✅ Sí

4. Hacer clic en **"Create database"**

> **Nota**: La creación de la instancia RDS puede tardar entre 5 y 15 minutos. Esperar a que el estado sea "Available".

### 8.3 Obtener el Endpoint de RDS

1. Una vez que el estado sea **"Available"**, hacer clic en `veterinary-db`
2. En la sección **"Connectivity & security"**, copiar el **Endpoint**
   - Tendrá un formato similar a: `veterinary-db.xxxxxxxxxxxx.us-east-1.rds.amazonaws.com`
3. Este endpoint es el valor para la variable `DB_HOST` en el archivo `.env`

---

## Paso 9: Verificar la Conectividad

Una vez creados todos los recursos, verificar que todo está correctamente conectado.

### 9.1 Conectarse a la EC2 por SSH

```bash
# Desde tu terminal local:
ssh -i veterinary-key.pem ec2-user@TU_ELASTIC_IP
```

Si la conexión es exitosa, verás el prompt de Amazon Linux.

### 9.2 Verificar conectividad EC2 → RDS

Desde dentro de la EC2:

```bash
# Instalar cliente PostgreSQL (si aún no se ha ejecutado setup-ec2.sh)
sudo dnf install -y postgresql15

# Probar conexión a RDS
psql -h veterinary-db.xxxxxxxxxxxx.us-east-1.rds.amazonaws.com \
     -p 5432 \
     -U postgres \
     -d veterinary_clinic \
     -c "SELECT 1;"
```

Si la conexión es exitosa, verás el resultado de la query. Esto confirma que:
- ✅ El Security Group `sg-database` permite tráfico desde `sg-web-server`
- ✅ El Subnet Group está bien configurado
- ✅ Las credenciales son correctas

### 9.3 Verificar que RDS NO es accesible desde Internet

Desde tu **máquina local** (no desde la EC2):

```bash
# Esto DEBE fallar (timeout) — confirma que RDS no es accesible públicamente
psql -h veterinary-db.xxxxxxxxxxxx.us-east-1.rds.amazonaws.com \
     -p 5432 \
     -U postgres \
     -d veterinary_clinic \
     -c "SELECT 1;"
```

Si obtienes un timeout o "connection refused", eso es **correcto** — significa que la base de datos está protegida.

---

## Paso 10: Configurar la Aplicación

Una vez verificada la infraestructura, seguir estos pasos para desplegar la aplicación.

### 10.1 Configurar el servidor EC2

Conectarse a la EC2 y ejecutar el script de configuración inicial:

```bash
# Desde tu máquina local, copiar el script:
scp -i veterinary-key.pem deploy/setup-ec2.sh ec2-user@TU_ELASTIC_IP:/home/ec2-user/

# Conectarse a la EC2:
ssh -i veterinary-key.pem ec2-user@TU_ELASTIC_IP

# En la EC2, ejecutar:
chmod +x setup-ec2.sh
./setup-ec2.sh
```

### 10.2 Configurar las variables de entorno

Crear el archivo `.env` en la EC2 con los datos de tu infraestructura:

```bash
# En la EC2, dentro de /home/ec2-user/app/
cat > .env << 'EOF'
DB_HOST=veterinary-db.xxxxxxxxxxxx.us-east-1.rds.amazonaws.com
DB_PORT=5432
DB_NAME=veterinary_clinic
DB_USER=postgres
DB_PASSWORD=TU_CONTRASEÑA_SEGURA
JWT_SECRET=TU_JWT_SECRET_GENERADO
JWT_EXPIRATION=24h
PORT=3000
NODE_ENV=production
EOF

# Asegurar permisos restrictivos
chmod 600 .env
```

### 10.3 Desplegar la aplicación

Desde tu máquina local:

```bash
# Ejecutar el script de despliegue
./deploy/deploy.sh TU_ELASTIC_IP ruta/a/veterinary-key.pem
```

### 10.4 Ejecutar migraciones de base de datos

Desde la EC2:

```bash
cd /home/ec2-user/app
./run-migrations.sh
```

### 10.5 Configurar Nginx

Desde la EC2:

```bash
chmod +x /home/ec2-user/setup-nginx.sh
./setup-nginx.sh
```

---

## Resumen de Configuración Final

### Diagrama de Red Completo

```
┌─────────────────────────────────────────────────────────────────────┐
│                        VPC: 10.0.0.0/16                             │
│                     (veterinary-vpc)                                 │
│                                                                     │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │  Internet Gateway (veterinary-igw)                             │ │
│  └──────────────────────────┬─────────────────────────────────────┘ │
│                             │                                       │
│  ┌──────────────────────────▼─────────────────────────────────────┐ │
│  │  Subnet Pública: 10.0.1.0/24 (us-east-1a)                     │ │
│  │  Route Table: 0.0.0.0/0 → IGW                                 │ │
│  │                                                                 │ │
│  │  ┌─────────────────────────────────────────┐                   │ │
│  │  │  EC2: veterinary-server                 │                   │ │
│  │  │  • t2.micro, Amazon Linux 2023          │                   │ │
│  │  │  • 8 GB gp3                             │                   │ │
│  │  │  • Elastic IP asociada                  │                   │ │
│  │  │  • SG: sg-web-server                    │                   │ │
│  │  │    (80, 443: 0.0.0.0/0 | 22: TU_IP/32) │                   │ │
│  │  └─────────────────────┬───────────────────┘                   │ │
│  └────────────────────────┼───────────────────────────────────────┘ │
│                           │ TCP 5432                                 │
│  ┌────────────────────────▼───────────────────────────────────────┐ │
│  │  Subnets Privadas (sin ruta a Internet)                        │ │
│  │                                                                 │ │
│  │  ┌─────────────────────┐  ┌──────────────────────┐            │ │
│  │  │ 10.0.2.0/24         │  │ 10.0.3.0/24          │            │ │
│  │  │ us-east-1a          │  │ us-east-1b           │            │ │
│  │  └─────────┬───────────┘  └──────────────────────┘            │ │
│  │            │                                                    │ │
│  │  ┌────────▼─────────────────────────────────────┐             │ │
│  │  │  RDS: veterinary-db                          │             │ │
│  │  │  • PostgreSQL 15/16, db.t3.micro             │             │ │
│  │  │  • 20 GB gp2, Single-AZ                     │             │ │
│  │  │  • Sin acceso público                        │             │ │
│  │  │  • Backups: 7 días                           │             │ │
│  │  │  • Encriptación: KMS (aws/rds)              │             │ │
│  │  │  • SG: sg-database (5432 ← sg-web-server)   │             │ │
│  │  │  • DB: veterinary_clinic                     │             │ │
│  │  └──────────────────────────────────────────────┘             │ │
│  └────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Costos Estimados

### Con Free Tier (primeros 12 meses de la cuenta AWS)

| Servicio | Costo |
|----------|-------|
| EC2 t2.micro | Gratis (750 hrs/mes) |
| RDS db.t3.micro | Gratis (750 hrs/mes) |
| EBS 8 GB gp3 | Gratis (30 GB incluidos) |
| RDS Storage 20 GB | Gratis (20 GB incluidos) |
| Elastic IP (asociada) | Gratis |
| **Total** | **~$0/mes** |

### Post Free Tier

| Servicio | Costo Aproximado |
|----------|-----------------|
| EC2 t2.micro | ~$8.50/mes |
| RDS db.t3.micro | ~$13/mes |
| EBS 8 GB gp3 | ~$0.64/mes |
| RDS Storage 20 GB gp2 | ~$2.30/mes |
| Elastic IP | Gratis (asociada) |
| **Total** | **~$25-30/mes** |

---

## Troubleshooting (Solución de Problemas)

### No puedo conectarme por SSH a la EC2

- Verificar que la regla SSH del security group `sg-web-server` tiene tu IP actual (puede cambiar)
- Verificar que el archivo .pem tiene permisos 400: `chmod 400 veterinary-key.pem`
- Verificar que usas el usuario correcto: `ec2-user` (no `root` ni `ubuntu`)

### La EC2 no puede conectarse a RDS

- Verificar que `sg-database` permite tráfico en puerto 5432 desde `sg-web-server`
- Verificar que RDS está en las subnets privadas correctas
- Verificar que el endpoint de RDS es correcto en el archivo .env
- Verificar que la contraseña es correcta

### La aplicación no responde en el navegador

- Verificar que `sg-web-server` permite tráfico en puerto 80 desde 0.0.0.0/0
- Verificar que Nginx está corriendo: `sudo systemctl status nginx`
- Verificar que la app está corriendo: `pm2 status`
- Revisar logs: `pm2 logs veterinary-api --lines 50`

### RDS tarda mucho en crearse

- Es normal. RDS puede tardar 5-15 minutos en quedar disponible.
- Esperar a que el estado cambie de "Creating" a "Available".

---

## Limpieza de Recursos (Para Evitar Costos)

Cuando ya no necesites la infraestructura, eliminar en este orden:

1. **RDS**: Deshabilitar "Deletion protection", luego eliminar (sin snapshot final si no lo necesitas)
2. **EC2**: Terminar la instancia
3. **Elastic IP**: Liberar la dirección (si no se libera, cobra)
4. **Security Groups**: Eliminar `sg-database` primero, luego `sg-web-server`
5. **Subnets**: Eliminar las 3 subnets
6. **Route Tables**: Eliminar las tablas de rutas personalizadas
7. **Internet Gateway**: Desasociar de la VPC y luego eliminar
8. **VPC**: Eliminar la VPC (esto eliminará cualquier recurso restante asociado)

> **⚠️ Recuerda**: Una Elastic IP no asociada cobra ~$0.005/hora (~$3.60/mes). Siempre libérala si no la vas a usar.
