# Antenas Abaso

Renovación de antenasabaso.com. Misma marca, teléfono 670 042 626, estrellas decorativas y galería aprobada. 1.624 páginas de localidad en 9 provincias (Bizkaia, Gipuzkoa, Álava, Burgos, Cantabria, Palencia, León, Navarra y Valladolid), portada, 9 directorios provinciales, 6 guías, índice de servicios, 3 páginas legales y 404.

## Construcción y pruebas

Node.js 22. `npm run build` genera y audita `dist/`. Por defecto es **preview**. `npm test` comprueba ambas modalidades, el entorno real de Netlify, las fotos y el aviso de cookies. `npm run build:production` genera una copia de producción local auditada. No se descargan imágenes ni datos durante el build.

La preview devuelve `noindex,nofollow` en el HTML y en cabeceras, permite el rastreo para que Google lea noindex y no publica sitemap ni redirects. Las ramas y deploy previews de Netlify permanecen en preview aunque hereden SITE_MODE=production.

## Conexión del dominio

1. Mantener el comando de Netlify `npm run build:production` y la carpeta publicada `dist`, como indica `netlify.toml`.
2. El comando activa producción explícitamente. Las ramas y deploy previews conservan su protección de indexación por contexto. Comprobar que el deploy termina correctamente antes de cambiar DNS.
3. Mantener `antenasabaso.com` como dominio canónico del proyecto y redirigir la variante `www` al dominio principal. Seguir los registros DNS que indique Netlify para ese sitio. Conservar los registros de correo MX, SPF, DKIM y DMARC; no cancelar el alojamiento de correo al cambiar únicamente la web.
4. Comprobar HTTPS, portada, `/bizkaia/zalla/`, las tres páginas legales, `/favicon.svg`, `/favicon.png`, `/robots.txt` y `/sitemap.xml` en el dominio definitivo. Comprobar una dirección inventada: debe responder 404, no la portada con 200.
5. Enviar el sitemap a Search Console y revisar algunas páginas representativas. Conservar cualquier verificación DNS/HTML previa de Search Console. No se ha verificado el acceso a esa propiedad desde este repositorio.

Producción publica **1.641 URLs indexables repartidas en un índice de sitemaps**: `sitemap.xml` enlaza `sitemaps/principal.xml` y un sitemap por cada una de las 9 provincias; en conjunto incluyen portada + 9 provincias + 1.624 localidades + 6 guías + índice de servicios. Legal y 404 quedan fuera del índice de búsqueda, pero siguen accesibles. Se conserva una canonical propia por página. Se normalizan HTTP/sin www e index.html con redirecciones permanentes, sin reescrituras SPA. Se preservan las anclas principales de la portada antigua y las tres URLs antiguas de fotos utilizadas se redirigen a sus copias locales.

## Navegación y contenido local

`scripts/coverage-navigation.mjs` selecciona los accesos destacados a localidades existentes. La portada y los nueve directorios incorporan un buscador que carga `local-pages-manifest.json` al usarlo; las consultas se resuelven en el navegador y el directorio HTML permanece disponible.

`content/priority-local-content.json` contiene textos y fuentes para quince fichas prioritarias: doce del País Vasco y tres de Cantabria. Sustituye sus bloques genéricos de comprobaciones, preguntas y preparación por una sección editorial propia. `scripts/priority-local-content.mjs` obtiene las cifras técnicas de la misma base de frecuencias utilizada en las tablas.

La portada conserva el título y encabezado generales originales. El refuerzo del País Vasco solicitado se presenta en `scripts/basque-coverage.mjs`, con el mismo espacio para Bizkaia, Gipuzkoa y Álava, junto al directorio completo de las nueve provincias. `scripts/community-provinces.mjs` añade contenido sobre instalación y reparación para comunidades en esos tres directorios.

La sección de comunidades de la portada enlaza a las guías de antenas colectivas y videoporteros. Sus accesos al presupuesto preseleccionan el servicio y «Comunidad de vecinos», sin borrar los datos escritos ni enviar el formulario. Las dos guías detallan instalación, renovación, reparación y alcance del presupuesto comunitario.

Las 1.624 fichas permiten consultar una cadena y obtener su MUX, canal UHF y MHz, o consultar la cobertura cuando no existe una frecuencia confirmada. El selector lee las filas de su tabla local; no mantiene una copia de frecuencias ni consulta servicios externos. `content/regional-television.json` añade ETB, Navarra Televisión, CyLTV y referencias locales por municipio, con fuentes y revisión propias. Las cadenas se identifican por servicio, no solo por el nombre MAUT: se respetan las fronteras autonómicas y las emisiones locales no se extienden a toda la provincia. Las frecuencias de CyLTV procedentes del plan se señalan como planificadas; Popular TV Cantabria, Tele7 y TeleBilbao remiten a consulta cuando no hay un canal actual contrastado. Las tablas y los seis pueblos próximos siguen al final de cada ficha. La revisión del plan nacional procede de `content/local-reception.json` y no cambia por una modificación de diseño.

## Fotografías y privacidad

`assets/gallery/sources.json` registra los originales públicos, sus hashes y sus copias WebP optimizadas; las imágenes TDT, videoportero y electricidad no se han redibujado. Los iconos raster proceden del mismo SVG aprobado.

No se incluyen analítica, píxeles publicitarios ni iframes de terceros. El formulario de presupuesto prepara un mensaje en el navegador y abre WhatsApp para revisarlo y enviarlo; no transmite sus campos al alojamiento de la web. Solo se muestra después de instalar su controlador y ofrece contacto directo cuando JavaScript está desactivado. El aviso “Entendido” recuerda su cierre mediante `antenas-abaso-cookie-info-v1` en localStorage, hasta eliminar los datos del sitio. No constituye consentimiento para rastreadores futuros. Si se añaden herramientas no esenciales deberá revisarse el consentimiento antes de activarlas.

## Pendientes no resueltos por un build verde

- Datos legales: solo se dispone de ANTENAS ABASO, localidad publicada 48010 Bilbao, correo y teléfono. Faltan NIF, identidad fiscal completa y dirección completa. No se inventan ni se certifica cumplimiento jurídico completo.
- La coincidencia textual es un control interno, **no un umbral de Google ni garantía de posicionamiento o ausencia de sanciones**. Las páginas comparten bastante contenido; necesitan revisión editorial y evidencia real de servicio local. No añadir supuestas sedes, trabajos, reseñas ni tiempos de llegada sin respaldo.
- DNS, certificado, correo, estado de indexación y URLs históricas no enlazadas requieren comprobación en el dominio definitivo y Search Console. La auditoría automática del código no acredita por sí sola la migración pública.
