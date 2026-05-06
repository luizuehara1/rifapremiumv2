import { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, limit } from 'firebase/firestore';
import { db } from '../firebase/config';
import { Pedido } from '../types';

export function usePedidosRealtime(max: number = 20) {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, 'pedidos'), 
      orderBy('criadoEm', 'desc'),
      limit(max)
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Pedido[];
      
      setPedidos(data);
      setLoading(false);
    }, (error) => {
      console.error('Firestore Error (Pedidos):', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [max]);

  return { pedidos, loading };
}
