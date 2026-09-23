# Antenas Abaso

Renovación SEO y visual de antenasabaso.com, centrada en Euskadi y en búsquedas locales por municipio.

## Estado

- Preview protegida con `noindex,nofollow`.
- 252 páginas locales: 113 Bizkaia, 88 Gipuzkoa y 51 Álava.
- 3 directorios provinciales con índice alfabético.
- Contexto territorial y comarca por municipio.
- Canonical, metadatos sociales, favicon SVG y datos estructurados auditados.
- La publicación indexable todavía no está activada.

## Desarrollo

- `npm run build`: genera `dist/` y ejecuta la auditoría completa.
- `npm run audit`: audita el contenido ya generado.
- Node.js 22 o superior.

Netlify usa `npm run build` y publica exclusivamente `dist`, según `netlify.toml`.

## Producción

No cambiar a `index,follow`, abrir `robots.txt` ni sustituir el dominio actual hasta completar la migración de URLs antiguas y la auditoría de producción.
