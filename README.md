# Catálogo Rápido PWA

Aplicación Angular 20 + Tailwind CSS, pensada para consulta veloz de precios y registro de productos en dispositivos móviles.

## Ejecutar

```bash
corepack enable
pnpm install
pnpm start
```

## Probar desde un iPhone

Safari solo permite usar la cámara desde un origen seguro. Por eso `http://IP-DE-TU-MAC:4200` no puede abrirla, aunque el servidor esté en la misma red. Usa la versión publicada por GitHub Pages o expón el servidor local mediante un túnel HTTPS (por ejemplo, Cloudflare Tunnel o ngrok) y abre la URL `https://` que este proporcione.

La persistencia de productos e historial utiliza IndexedDB y los recursos de la aplicación se almacenan mediante Service Worker en producción. El flujo de escáner tiene un punto de integración preparado en `scan()`; conecta `BarcodeDetector` o ZXing según la compatibilidad de los dispositivos objetivo.
