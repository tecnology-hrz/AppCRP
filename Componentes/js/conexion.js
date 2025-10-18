// Importar Firebase (SDK modular v9)
import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js';
import { getFirestore, collection, getDocs, addDoc, updateDoc, doc, Timestamp, query, where, getDoc } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js';

// Configuración de Firebase
const firebaseConfig = {
    apiKey: "AIzaSyAFBczTxejh6srQrts6DURoIXAU4xxJmtM",
    authDomain: "apparc-77f9a.firebaseapp.com",
    projectId: "apparc-77f9a",
    storageBucket: "apparc-77f9a.firebasestorage.app",
    messagingSenderId: "411883174345",
    appId: "1:411883174345:web:1638960d4b67c23c605018",
    measurementId: "G-TFRVXYTH7F"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Referencias a colecciones
const productosRef = collection(db, 'productos');
const negociosRef = collection(db, 'negocios');
const pedidosRef = collection(db, 'pedidos');
const comprasRef = collection(db, 'compras');
const repartosRef = collection(db, 'repartos');

// Exportar referencias para usar en otros archivos
window.productosRef = productosRef;
window.negociosRef = negociosRef;
window.pedidosRef = pedidosRef;
window.comprasRef = comprasRef;
window.repartosRef = repartosRef;
window.db = db;
window.firebase = { getDocs, addDoc, updateDoc, doc, Timestamp, query, where, getDoc };
