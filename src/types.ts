import { Timestamp } from 'firebase/firestore';

export interface Rifa {
  id: string;
  premio: string;
  quantidadeNumeros: number;
  valorUnico: number;
  combos: {
    quantidade: number;
    valor: number;
  }[];
  ativa: boolean;
}

export interface Numero {
  id: string;
  numero: number;
  status: 'disponivel' | 'reservado' | 'pago' | 'bloqueado';
  reservadoPor: string;
  telefone?: string;
  timestampReserva: number;
  updatedAt?: any;
}

export interface Pedido {
  id: string;
  paymentId: string;
  numeros: number[];
  valor: number;
  telefone: string;
  nome: string;
  status: 'pendente' | 'pago' | 'expirado';
  criadoEm: any;
}

export interface Admin {
  email: string;
  ativo: boolean;
}
