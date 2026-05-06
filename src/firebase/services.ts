import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  writeBatch, 
  query, 
  orderBy, 
  onSnapshot,
  serverTimestamp,
  where
} from 'firebase/firestore';
import { db, auth } from './config';
import { Numero, Pedido, Rifa } from '../types';

// Rifa Services
export const getRifa = async (id: string) => {
  const docRef = doc(db, 'rifas', id);
  const snap = await getDoc(docRef);
  return snap.exists() ? { id: snap.id, ...snap.data() } as Rifa : null;
};

// Pedido Services
export const createPedido = async (pedido: Omit<Pedido, 'id' | 'criadoEm'>) => {
  const pedidoRef = doc(collection(db, 'pedidos'));
  await setDoc(pedidoRef, {
    ...pedido,
    criadoEm: serverTimestamp()
  });
  return pedidoRef.id;
};

// Numero Services
export const reservarNumeros = async (numeros: number[], nome: string, telefone: string) => {
  const batch = writeBatch(db);
  const now = Date.now();

  for (const n of numeros) {
    const docRef = doc(db, 'numeros', n.toString());
    batch.update(docRef, {
      status: 'reservado',
      reservadoPor: nome,
      telefone: telefone,
      timestampReserva: now,
      updatedAt: serverTimestamp()
    });
  }

  await batch.commit();
};

export const resetRifa = async (total: number = 100) => {
  const batch = writeBatch(db);
  
  // Limpar números atuais (opcional se soubermos que 1-100 existem)
  for (let i = 1; i <= total; i++) {
    const docRef = doc(db, 'numeros', i.toString());
    batch.set(docRef, {
      numero: i,
      status: 'disponivel',
      reservadoPor: '',
      timestampReserva: 0,
      updatedAt: serverTimestamp()
    });
  }

  await batch.commit();
};

export const updateNumeroStatus = async (id: string, status: Numero['status']) => {
  const docRef = doc(db, 'numeros', id);
  await updateDoc(docRef, {
    status,
    updatedAt: serverTimestamp()
  });
};

// Admin Services
export const checkAdmin = async (email: string) => {
  const masterAdmins = ['luiz.uehara1@gmail.com', 'lopesvinicius199@gmail.com'];
  if (masterAdmins.includes(email)) return true;
  
  const docRef = doc(db, 'admins', email);
  const snap = await getDoc(docRef);
  return snap.exists() && snap.data().ativo === true;
};
