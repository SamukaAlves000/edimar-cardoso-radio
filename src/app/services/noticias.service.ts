import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Observable } from 'rxjs';
import {
  collection, query, orderBy, onSnapshot,
  addDoc, updateDoc, deleteDoc, doc,
  Timestamp, where, serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase.config';

export interface Noticia {
  id: string;
  titulo: string;
  descricao: string;
  imagemUrl: string;
  createdAt: Timestamp;
  ativo: boolean;
}

@Injectable({ providedIn: 'root' })
export class NoticiasService {
  private platformId = inject(PLATFORM_ID);
  private col = collection(db, 'noticias');

  getNoticias$(): Observable<Noticia[]> {
    return new Observable(subscriber => {
      if (!isPlatformBrowser(this.platformId)) { subscriber.next([]); subscriber.complete(); return; }
      const q = query(this.col, where('ativo', '==', true), orderBy('createdAt', 'desc'));
      const unsub = onSnapshot(q,
        snap => subscriber.next(snap.docs.map(d => ({ id: d.id, ...d.data() } as Noticia))),
        err => subscriber.error(err),
      );
      return () => unsub();
    });
  }

  getAllNoticias$(): Observable<Noticia[]> {
    return new Observable(subscriber => {
      if (!isPlatformBrowser(this.platformId)) { subscriber.next([]); subscriber.complete(); return; }
      const q = query(this.col, orderBy('createdAt', 'desc'));
      const unsub = onSnapshot(q,
        snap => subscriber.next(snap.docs.map(d => ({ id: d.id, ...d.data() } as Noticia))),
        err => subscriber.error(err),
      );
      return () => unsub();
    });
  }

  add(data: Omit<Noticia, 'id' | 'createdAt'>): Promise<void> {
    return addDoc(this.col, { ...data, createdAt: serverTimestamp() }).then(() => {});
  }

  update(id: string, data: Partial<Omit<Noticia, 'id' | 'createdAt'>>): Promise<void> {
    return updateDoc(doc(db, 'noticias', id), data as Record<string, unknown>);
  }

  delete(id: string): Promise<void> {
    return deleteDoc(doc(db, 'noticias', id));
  }

  toggleAtivo(id: string, current: boolean): Promise<void> {
    return updateDoc(doc(db, 'noticias', id), { ativo: !current });
  }
}
