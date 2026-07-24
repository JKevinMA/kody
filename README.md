# Catálogo Rápido PWA

Aplicación Angular 20 + Tailwind CSS, pensada para consulta veloz de precios y registro de productos en dispositivos móviles.

## Ejecutar

```bash
corepack enable
pnpm install
pnpm start
```

La persistencia de productos e historial utiliza IndexedDB y los recursos de la aplicación se almacenan mediante Service Worker en producción. El flujo de escáner tiene un punto de integración preparado en `scan()`; conecta `BarcodeDetector` o ZXing según la compatibilidad de los dispositivos objetivo.
