'use strict';

/* ----------------------------------------------------------
   ESTADO GLOBAL
   ---------------------------------------------------------- */
const STATE = {
  mode: 'public',       // 'public' | 'admin'
  season: 1,
  theme: 'dark',
  publicPage: 'palmares',
  adminPage: 'dashboard',
};

/* ----------------------------------------------------------
   BASE DE DATOS (Firestore, ver db.js)
   ---------------------------------------------------------- */
const STORES  = ['seasons','teams','competitions','phases','matches','coins','history','settings','matchHistory','sorteo','sorteoEvents','palmares','palmares-comps','calDayLabels'];
let db;
