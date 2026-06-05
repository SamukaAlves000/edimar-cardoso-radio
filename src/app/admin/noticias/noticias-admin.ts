import { Component, OnInit, OnDestroy, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, FormControl, Validators, ReactiveFormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { NoticiasService, Noticia } from '../../services/noticias.service';
import { StorageService } from '../../services/storage.service';

@Component({
  selector: 'app-noticias-admin',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './noticias-admin.html',
})
export class NoticiasAdminComponent implements OnInit, OnDestroy {
  private svc = inject(NoticiasService);
  private storageSvc = inject(StorageService);

  noticias = signal<Noticia[]>([]);
  loading = signal(true);
  saving = signal(false);
  editingId = signal<string | null>(null);
  previewUrl = signal<string | null>(null);
  private sub?: Subscription;

  form = new FormGroup({
    titulo: new FormControl('', [Validators.required, Validators.minLength(5)]),
    descricao: new FormControl('', [Validators.required, Validators.minLength(10)]),
    imagemUrl: new FormControl(''),
    ativo: new FormControl(true),
  });

  ngOnInit() {
    this.sub = this.svc.getAllNoticias$().subscribe(n => {
      this.noticias.set(n);
      this.loading.set(false);
    });
  }

  async onFileSelect(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.previewUrl.set(URL.createObjectURL(file));
    this.saving.set(true);
    try {
      const url = await this.storageSvc.uploadImage(file, 'noticias');
      this.form.patchValue({ imagemUrl: url });
    } finally { this.saving.set(false); }
  }

  editNoticia(n: Noticia) {
    this.editingId.set(n.id);
    this.form.patchValue({ titulo: n.titulo, descricao: n.descricao, imagemUrl: n.imagemUrl, ativo: n.ativo });
    this.previewUrl.set(n.imagemUrl || null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  cancelEdit() {
    this.editingId.set(null);
    this.form.reset({ ativo: true, imagemUrl: '' });
    this.previewUrl.set(null);
  }

  async save() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving.set(true);
    const data = {
      titulo: this.form.value.titulo!,
      descricao: this.form.value.descricao!,
      imagemUrl: this.form.value.imagemUrl ?? '',
      ativo: this.form.value.ativo ?? true,
    };
    try {
      const id = this.editingId();
      if (id) { await this.svc.update(id, data); } else { await this.svc.add(data); }
      this.cancelEdit();
    } finally { this.saving.set(false); }
  }

  async excluir(id: string) {
    if (confirm('Excluir esta notícia permanentemente?')) await this.svc.delete(id);
  }

  async toggleAtivo(n: Noticia) { await this.svc.toggleAtivo(n.id, n.ativo); }

  formatDate(ts: { toDate(): Date } | null | undefined): string {
    if (!ts?.toDate) return '';
    return ts.toDate().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  ngOnDestroy() { this.sub?.unsubscribe(); }
}
