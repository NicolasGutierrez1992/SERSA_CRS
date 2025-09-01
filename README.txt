# SERSA Certificados - Deploy

## Requisitos

- Node.js 18+
- npm
- Certificado digital en formato `.pfx` y contraseña
- Archivo `Root_RTI.txt` en la carpeta `certs`
- Acceso a los servicios web de AFIP

## Instalación

1. Clona el repositorio:

   ```sh
   git clone https://github.com/tuusuario/SERSA_CRS.git
   cd SERSA_CRS
   ```

2. Instala las dependencias:

   ```sh
   npm install
   ```

3. Configura los parámetros en `server/config.js`:

   - `certPath`: ruta al archivo `.pfx`
   - `keyPath`: contraseña del certificado
   - Otros datos según tu empresa y entorno

4. Coloca el archivo `Root_RTI.txt` en la carpeta `certs`.

## Ejecución

```sh
npm start
```

El servidor estará disponible en [http://localhost:3000](http://localhost:3000) (o el puerto configurado).

## Acceso

- Abre `public/index.html` en tu navegador.
- Ingresa usuario y contraseña.
- Selecciona marca, modelo y número de serie.
- Haz clic en "Obtener Certificado".

## Notas

- Para producción, asegúrate de usar el certificado y endpoints de AFIP correspondientes.
- Revisa los logs en consola para seguimiento de errores y procesos.

---

**¿Necesitas instrucciones para Docker, PM2 o algún entorno específico?**