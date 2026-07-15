'use strict';

/* Única en todo functions/: Cloud Functions v2 soporta southamerica-west1
   (donde vive el Firestore de este proyecto), pero Cloud Tasks NO tiene esa
   región habilitada (solo southamerica-east1 en Sudamérica). Como la Parte 4a
   necesita Cloud Tasks, se despliega TODO en southamerica-east1 para no tener
   funciones repartidas en dos regiones — el costo es que Firestore queda en
   una región vecina (Santiago vs. São Paulo), sin impacto real para avisos
   push. Decisión no verificada con el usuario/supervisor: si se prefiere otra
   región, cambiar solo esta constante. */
const REGION = 'southamerica-east1';

module.exports = { REGION };
