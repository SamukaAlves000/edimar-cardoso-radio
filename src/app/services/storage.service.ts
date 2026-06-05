import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase.config';

@Injectable({ providedIn: 'root' })
export class StorageService {
  private platformId = inject(PLATFORM_ID);

  async uploadImage(file: File, folder: 'noticias' | 'patrocinadores'): Promise<string> {
    if (!isPlatformBrowser(this.platformId)) throw new Error('SSR not supported');
    const unique = crypto.randomUUID ? crypto.randomUUID() : `${file.name}-${file.size}`;
    const path = `${folder}/${unique}_${file.name}`;
    const storageRef = ref(storage, path);
    await uploadBytes(storageRef, file);
    return getDownloadURL(storageRef);
  }
}
