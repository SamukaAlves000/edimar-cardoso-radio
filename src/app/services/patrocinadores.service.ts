import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Observable } from 'rxjs';
import {
  collection, query, orderBy, onSnapshot,
  addDoc, updateDoc, deleteDoc, doc,
  where, serverTimestamp, Timestamp,
} from 'firebase/firestore';
import { db } from '../firebase.config';

export interface Patrocinador {
  id: string;
  nome: string;
  categoria: string;
  url: string;
  logoUrl: string;
  createdAt: Timestamp;
  ativo: boolean;
}

@Injectable({ providedIn: 'root' })
export class PatrocinadoresService {
  private platformId = inject(PLATFORM_ID);
  private col = collection(db, 'patrocinadores');

  getAtivos$(): Observable<Patrocinador[]> {
    return new Observable(subscriber => {
      if (!isPlatformBrowser(this.platformId)) { subscriber.next([]); subscriber.complete(); return; }
      const q = query(this.col, where('ativo', '==', true), orderBy('createdAt', 'desc'));
      const unsub = onSnapshot(q,
        snap => subscriber.next(snap.docs.map(d => ({ id: d.id, ...d.data() } as Patrocinador))),
        err => subscriber.error(err),
      );
      return () => unsub();
    });
  }

  getAll$(): Observable<Patrocinador[]> {
    return new Observable(subscriber => {
      if (!isPlatformBrowser(this.platformId)) { subscriber.next([]); subscriber.complete(); return; }
      const q = query(this.col, orderBy('createdAt', 'desc'));
      const unsub = onSnapshot(q,
        snap => subscriber.next(snap.docs.map(d => ({ id: d.id, ...d.data() } as Patrocinador))),
        err => subscriber.error(err),
      );
      return () => unsub();
    });
  }

  add(data: Omit<Patrocinador, 'id' | 'createdAt'>): Promise<void> {
    return addDoc(this.col, { ...data, createdAt: serverTimestamp() }).then(() => {});
  }

  update(id: string, data: Partial<Omit<Patrocinador, 'id' | 'createdAt'>>): Promise<void> {
    return updateDoc(doc(db, 'patrocinadores', id), data as Record<string, unknown>);
  }

  delete(id: string): Promise<void> {
    return deleteDoc(doc(db, 'patrocinadores', id));
  }

  toggleAtivo(id: string, current: boolean): Promise<void> {
    return updateDoc(doc(db, 'patrocinadores', id), { ativo: !current });
  }
}
