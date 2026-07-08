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
   BASE DE DATOS (IndexedDB)
   ---------------------------------------------------------- */
const DB_NAME = 'TSC_v4';
const DB_VER  = 7;
const STORES  = ['seasons','teams','competitions','phases','matches','coins','history','settings','matchHistory','sorteo','sorteoEvents','palmares','palmares-comps','calDayLabels'];
let db;
