import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Observable } from 'rxjs';
import {
  collection, query, orderBy, onSnapshot,
  addDoc, updateDoc, deleteDoc, doc,
  Timestamp, where, increment, serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase.config';

export interface Recado {
  id: string;
  name: string;
  city: string;
  requestedSong: string;
  message: string;
  likes: number;
  createdAt: Timestamp;
  status: 'pendente' | 'aprovado' | 'lido';
}

@Injectable({ providedIn: 'root' })
export class RecadosService {
  private platformId = inject(PLATFORM_ID);
  private col = collection(db, 'recados');

  getTodayRecados$(): Observable<Recado[]> {
    return new Observable(subscriber => {
      if (!isPlatformBrowser(this.platformId)) { subscriber.next([]); subscriber.complete(); return; }
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const q = query(
        this.col,
        where('createdAt', '>=', Timestamp.fromDate(today)),
        orderBy('createdAt', 'desc'),
      );
      const unsub = onSnapshot(q,
        snap => subscriber.next(snap.docs.map(d => ({ id: d.id, ...d.data() } as Recado))),
        err => subscriber.error(err),
      );
      return () => unsub();
    });
  }

  getRecados$(start?: Date, end?: Date): Observable<Recado[]> {
    return new Observable(subscriber => {
      if (!isPlatformBrowser(this.platformId)) { subscriber.next([]); subscriber.complete(); return; }
      let q = query(this.col, orderBy('createdAt', 'desc'));
      if (start && !end) q = query(this.col, where('createdAt', '>=', Timestamp.fromDate(start)), orderBy('createdAt', 'desc'));
      if (start && end) q = query(this.col, where('createdAt', '>=', Timestamp.fromDate(start)), where('createdAt', '<=', Timestamp.fromDate(end)), orderBy('createdAt', 'desc'));
      const unsub = onSnapshot(q,
        snap => subscriber.next(snap.docs.map(d => ({ id: d.id, ...d.data() } as Recado))),
        err => subscriber.error(err),
      );
      return () => unsub();
    });
  }

  add(data: Pick<Recado, 'name' | 'city' | 'requestedSong' | 'message'>): Promise<void> {
    return addDoc(this.col, { ...data, likes: 0, status: 'pendente', createdAt: serverTimestamp() }).then(() => {});
  }

  like(id: string): Promise<void> {
    return updateDoc(doc(db, 'recados', id), { likes: increment(1) });
  }

  updateStatus(id: string, status: Recado['status']): Promise<void> {
    return updateDoc(doc(db, 'recados', id), { status });
  }

  delete(id: string): Promise<void> {
    return deleteDoc(doc(db, 'recados', id));
  }
}
