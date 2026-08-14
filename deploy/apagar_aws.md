Checklist antes de cerrar el portátil

 La web carga en http://TU_IP_PUBLICA desde el navegador
 Puedes hacer una acción que toque la base de datos (crear/ver algo) y funciona
 Has anotado en un sitio seguro: la IP pública (o Elastic IP), el endpoint de RDS, la contraseña de la BD y dónde está el .pem
 Si usaste Elastic IP, sigue asociada a la instancia (no liberada)

¿Hay que apagar algo para no gastar de más?
Como es de prueba y nadie más la va a ver, sí, te conviene apagar la EC2 cuando no la estés usando. Aquí la clave está en la diferencia entre Stop y Terminate:
Lo que SÍ deberías hacer: Stop (no Terminate)

EC2 → Instances → selecciona veterinary-server
Instance state → Stop instance

Esto apaga la instancia (deja de cobrarte por las horas de cómputo) pero conserva todo: el disco, la configuración, la app instalada. Cuando quieras probarla otra vez, le das a "Start instance" y en unos segundos está lista.
⚠️ Importante si NO tienes Elastic IP: al hacer Stop/Start, la IP pública cambia. Tendrás que volver a mirarla en la consola cada vez. Si te resulta pesado, ahí sí merece la pena asignar una Elastic IP (gratis mientras esté asociada a una instancia corriendo — pero si la instancia está parada, la Elastic IP sí empieza a cobrar ~$3.60/mes, así que en ese caso libérala también al apagar, o no la uses).
¿Y el RDS?
Aquí pincha un poco más: RDS también se puede parar (Stop), y mientras está parado no cobra por horas de cómputo, pero:

El almacenamiento (los 20 GB) sigue cobrando algo mínimo aunque esté parado
AWS reinicia automáticamente una instancia RDS parada después de 7 días (por si se te olvida)
Si estás dentro del Free Tier (primeros 12 meses de la cuenta), esto da igual: tanto EC2 como RDS son gratis dentro de las 750 horas/mes incluidas, así que no necesitas parar nada por dinero — aunque parar la EC2 cuando no la usas siempre es buena costumbre.

Para parar el RDS: RDS → Databases → selecciona veterinary-db → Actions → Stop temporarily
Resumen rápido
Recurso¿Qué hacer al terminar de probar?EC2Stop instance (no Terminate, o perderás todo)RDSStop temporarily (opcional si estás en Free Tier)Elastic IPSi no la usas, liberarla; si la usas, déjala asociada y no pares la EC2 mucho tiempoAl volver a probarStart ambos, espera 1-2 min, mira la IP pública otra vez si cambió