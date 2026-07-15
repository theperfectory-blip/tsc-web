'use strict';

/* El Firestore de este proyecto vive en southamerica-west1 (confirmado con
   `firebase firestore:databases:get "(default)"`). Cloud Tasks NO soporta
   esa región — en Sudamérica solo tiene southamerica-east1. Como la Parte 4a
   (arranque del stream) necesita Cloud Tasks, ESA función (y las que
   comparten el llamado callable/task, que no son triggers de Firestore) van
   en TASKS_REGION. El trigger de Firestore (onMatchWentLive) no depende de
   Cloud Tasks, así que va en FIRESTORE_REGION: la doc de Firebase no exige
   que un trigger de Firestore comparta región con la base, pero recomienda
   ponerlo cerca, y desplegar un trigger en una región no soportada por esa
   instancia de Firestore es un modo de falla conocido en producción
   (firebase-functions#1408, "unsupported Cloud Firestore region"). Como el
   deploy lo corre el usuario a mano (no hay forma de probarlo desde acá), no
   se puede dejar ese riesgo sin cubrir con una sola región para todo. */
const TASKS_REGION = 'southamerica-east1';
const FIRESTORE_REGION = 'southamerica-west1';

module.exports = { TASKS_REGION, FIRESTORE_REGION };
