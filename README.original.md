# Zona Zero

PWA estàtica per crear simulacions de supervivència de 2 a 50 participants. No té backend,
comptes, analítica ni serveis externs: les partides i les fotografies es processen i es desen
exclusivament al navegador.

## Desenvolupament

```bash
npm install
npm run dev
```

## Validació

```bash
npm test
npm run build
npm run test:e2e
npm run audit:prod
```

La prova E2E utilitza Google Chrome instal·lat a `/usr/bin/google-chrome`.

## Desplegament

El resultat de `npm run build` es publica a `/srv/apps/zona-zero/dist` i Caddy el serveix
directament a `war.pedrico.cat`. El DNS ha d'incloure `CNAME war -> pedrico.cat.`.

Les capçaleres de producció bloquegen recursos remots, iframes, objectes, formularis externs,
càmera, micròfon, ubicació i pagaments.
