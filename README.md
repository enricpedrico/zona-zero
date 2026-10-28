# Zona Zero

PWA de simulación de supervivencia que funciona en el navegador.

- Simulaciones reproducibles de supervivencia para entre 2 y 50 participantes.
- Partidas, fotografías, historial y exportaciones ZIP guardados en el navegador.
- PWA sin backend, cuentas ni analítica externa.

## Estado del repositorio

Repositorio **público con código y recursos necesarios para reconstruir la aplicación. La base se ha contrastado con los archivos del servidor el 28 de octubre de 2026. No incluye el historial de despliegues ni datos persistentes.

## Desarrollo

Node.js 20.20 o superior y npm; las versiones exactas se fijan en `package-lock.json`.

```bash
npm ci
npm run dev
```

## Configuración

No requiere cuentas, claves API ni credenciales para ejecutarse. El almacenamiento de las partidas, cuando existe, es local al navegador.

## Estructura

`src/`: interfaz de usuario; `public/`: recursos estáticos; `tests/`: pruebas.

## Verificación

```bash
npm test
npm run build
```

## Despliegue y datos

`npm run build` genera `dist/`, que se publica como web estática por HTTPS. No publiques el servidor de desarrollo. No se han incluido `.env`, tokens, contraseñas, sesiones, bases de datos, archivos subidos, biblioteca multimedia, cachés o copias de seguridad. Las copias de datos se gestionan aparte; subir el código no sustituye un respaldo. Antes de actualizar una instalación conserva sus datos y configuración. No uses `docker compose down -v` para una actualización normal.

## Cambios de publicación

Se han actualizado dependencias vulnerables y se han añadido límites de tamaño descomprimido, número de entradas y nombres admitidos para importar ZIP. Las correcciones de este repositorio no despliegan automáticamente cambios en la web doméstica. Consulta [SECURITY.md](SECURITY.md).

## Documentación original

[README original](README.original.md), conservado con los detalles de funcionamiento y las instrucciones específicas del proyecto. Se conservan los avisos de terceros incluidos; no se ha añadido una licencia nueva.
