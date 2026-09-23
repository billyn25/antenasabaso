# Antenas Abaso

Renovación de antenasabaso.com. Misma marca, teléfono 670 042 626, estrellas decorativas y galería aprobada. 252 páginas de localidad (113 Bizkaia, 88 Gipuzkoa, 51 Álava), 3 provincias, portada, 3 páginas legales y 404.

## Construcción y pruebas

Node.js 22. `npm run build` genera y audita `dist/`. Por defecto es **preview**. `npm test` comprueba ambas modalidades, el entorno real de Netlify, las fotos y el aviso de cookies. `npm run build:production` genera una copia de producción local auditada. No se descargan imágenes ni datos durante el build.

La preview devuelve `noindex,nofollow` en el HTML y en cabeceras, permite el rastreo para que Google lea noindex y no publica sitemap ni redirects. Las ramas y deploy previews de Netlify permanecen en preview aunque hereden SITE_MODE=production.

## Conexión del dominio

1. Mantener el comando de Netlify `npm run build` y la carpeta publicada `dist`.
2. En las variables de entorno de Netlify, ámbito Builds y contexto Production, crear **nombre `SITE_MODE` / valor `production`**. No poner comillas como parte del valor. Hacer un nuevo deploy y comprobar que termina correctamente antes de cambiar DNS.
3. Configurar `www.antenasabaso.com` como dominio principal, junto con el dominio raíz `antenasabaso.com`. Seguir los registros DNS que indique Netlify para ese sitio. Conservar los registros de correo MX, SPF, DKIM y DMARC; no cancelar el alojamiento de correo al cambiar únicamente la web.
4. Comprobar HTTPS, portada, `/bizkaia/zalla/`, las tres páginas legales, `/favicon.svg`, `/favicon.png`, `/robots.txt` y `/sitemap.xml` en el dominio definitivo. Comprobar una dirección inventada: debe responder 404, no la portada con 200.
5. Enviar el sitemap a Search Console y revisar algunas páginas representativas. Conservar cualquier verificación DNS/HTML previa de Search Console. No se ha verificado el acceso a esa propiedad desde este repositorio.

Producción genera **256 URLs en el sitemap**: portada + 3 provincias + 252 localidades. Legal y 404 quedan fuera del índice de búsqueda, pero siguen accesibles. Se conserva una canonical propia por página. Se normalizan HTTP/sin www e index.html con redirecciones permanentes, sin reescrituras SPA. Se preservan las anclas principales de la portada antigua y las tres URLs antiguas de fotos utilizadas se redirigen a sus copias locales.

## Fotografías y privacidad

`assets/gallery/sources.json` registra los originales públicos, sus hashes y sus copias WebP optimizadas; las imágenes TDT, videoportero y electricidad no se han redibujado. Los iconos raster proceden del mismo SVG aprobado.

No se incluyen analítica, píxeles publicitarios, formularios ni iframes de terceros. El aviso “Entendido” recuerda su cierre mediante `antenas-abaso-cookie-info-v1` en localStorage, hasta eliminar los datos del sitio. No constituye consentimiento para rastreadores futuros. Si se añaden herramientas no esenciales deberá revisarse el consentimiento antes de activarlas.

## Pendientes no resueltos por un build verde

- Datos legales: solo se dispone de ANTENAS ABASO, localidad publicada 48010 Bilbao, correo y teléfono. Faltan NIF, identidad fiscal completa y dirección completa. No se inventan ni se certifica cumplimiento jurídico completo.
- La coincidencia textual es un control interno, **no un umbral de Google ni garantía de posicionamiento o ausencia de sanciones**. Las páginas comparten bastante contenido; necesitan revisión editorial y evidencia real de servicio local. No añadir supuestas sedes, trabajos, reseñas ni tiempos de llegada sin respaldo.
- DNS, certificado, correo, estado de indexación y URLs históricas no enlazadas requieren comprobación en el dominio definitivo y Search Console. La auditoría automática del código no acredita por sí sola la migración pública.
