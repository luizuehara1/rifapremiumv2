import { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, doc, writeBatch, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import { Numero } from '../types';

export function useNumerosRealtime() {
  const [numeros, setNumeros] = useState<Numero[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'numeros'), orderBy('numero', 'asc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Numero[];
      
      setNumeros(data);
      setLoading(false);
      
      // Auto-expiration logic: verify reserved numbers
      const now = Date.now();
      const expiredBatch = writeBatch(db);
      let hasExpired = false;

      data.forEach(n => {
        if (n.status === 'reservado' && n.timestampReserva > 0) {
          const diffMinutes = (now - n.timestampReserva) / (1000 * 60);
          if (diffMinutes >= 10) {
            const docRef = doc(db, 'numeros', n.id);
            expiredBatch.update(docRef, {
              status: 'disponivel',
              reservadoPor: '',
              timestampReserva: 0,
              updatedAt: serverTimestamp()
            });
            hasExpired = true;
          }
        }
      });

      if (hasExpired) {
        expiredBatch.commit().catch(err => console.error('Error expiring numbers:', err));
      }
    }, (error) => {
      console.error('Firestore Error (Realtime):', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return { numeros, loading };
}
