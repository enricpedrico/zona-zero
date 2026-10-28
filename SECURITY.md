# Seguridad

Revisión de publicación del 28 de octubre de 2026: rutas de entrada de archivos ZIP e imágenes, almacenamiento local y renderizado, service worker y dependencias. No hay backend ni cuentas. Se corrigió una descompresión sin límite previo de tamaño: ahora se rechazan entradas no esperadas, tamaños descomprimidos superiores a 2 MiB por entrada, totales superiores a 50 MiB y más de 51 entradas. La descompresión valida esos límites antes de reservar memoria para cada entrada. Se actualizaron Vite, Vitest y dependencias transitivas para resolver los cinco avisos iniciales de npm audit. Resultado final: cero avisos en npm audit; 23 pruebas pasan, incluidas importación válida, entradas comprimidas grandes, nombres no admitidos y exceso de entradas; la compilación de producción pasa. Estos cambios no despliegan automáticamente el código en el servidor doméstico.

Los archivos de publicación se han examinado con Gitleaks 8.30.1 con salida redactada: no se detectaron credenciales en este proyecto. Se excluyen datos personales, archivos de usuarios, configuraciones privadas y el historial de despliegues. El código del repositorio parte de una copia limpia de fuentes y no arrastra historiales Git antiguos.

## Comunicar un problema

Usa la opción **Security → Report a vulnerability** del repositorio si está disponible. Evita incluir claves, datos de usuarios o un exploit contra la instalación doméstica en un issue público.

## Alcance

Esta es una revisión concreta para publicar el código, basada en inspección y las herramientas y pruebas indicadas. No certifica ausencia de vulnerabilidades, no sustituye mantenimiento futuro y no valida la configuración completa del sistema operativo o del router de una instalación.
