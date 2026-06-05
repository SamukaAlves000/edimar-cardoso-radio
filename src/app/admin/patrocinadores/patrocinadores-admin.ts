import { Component, OnInit, OnDestroy, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, FormControl, Validators, ReactiveFormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { PatrocinadoresService, Patrocinador } from '../../services/patrocinadores.service';
import { StorageService } from '../../services/storage.service';

@Component({
  selector: 'app-patrocinadores-admin',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './patrocinadores-admin.html',
})
export class PatrocinadoresAdminComponent implements OnInit, OnDestroy {
  private svc = inject(PatrocinadoresService);
  private storageSvc = inject(StorageService);

  patrocinadores = signal<Patrocinador[]>([]);
  loading = signal(true);
  saving = signal(false);
  editingId = signal<string | null>(null);
  previewUrl = signal<string | null>(null);
  private sub?: Subscription;

  form = new FormGroup({
    nome: new FormControl('', [Validators.required, Validators.minLength(2)]),
    categoria: new FormControl('', [Validators.required]),
    url: new FormControl('#'),
    logoUrl: new FormControl(''),
    ativo: new FormControl(true),
  });

  ngOnInit() {
    this.sub = this.svc.getAll$().subscribe(p => {
      this.patrocinadores.set(p);
      this.loading.set(false);
    });
  }

  async onFileSelect(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.previewUrl.set(URL.createObjectURL(file));
    this.saving.set(true);
    try {
      const url = await this.storageSvc.uploadImage(file, 'patrocinadores');
      this.form.patchValue({ logoUrl: url });
    } finally {
      this.saving.set(false);
      input.value = '';
    }
  }

  edit(p: Patrocinador) {
    this.editingId.set(p.id);
    this.form.patchValue({ nome: p.nome, categoria: p.categoria, url: p.url, logoUrl: p.logoUrl, ativo: p.ativo });
    this.previewUrl.set(p.logoUrl || null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  cancel() {
    this.editingId.set(null);
    this.form.reset({ nome: '', categoria: '', url: '#', logoUrl: '', ativo: true });
    this.form.markAsPristine();
    this.form.markAsUntouched();
    this.previewUrl.set(null);
  }

  async save() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving.set(true);
    const data = {
      nome: this.form.value.nome!,
      categoria: this.form.value.categoria!,
      url: this.form.value.url ?? '#',
      logoUrl: this.form.value.logoUrl ?? '',
      ativo: this.form.value.ativo ?? true,
    };
    try {
      const id = this.editingId();
      if (id) { await this.svc.update(id, data); } else { await this.svc.add(data); }
      this.cancel();
    } finally { this.saving.set(false); }
  }

  async excluir(id: string) {
    if (confirm('Excluir este patrocinador?')) await this.svc.delete(id);
  }

  async toggleAtivo(p: Patrocinador) { await this.svc.toggleAtivo(p.id, p.ativo); }

  formatDate(ts: { toDate(): Date } | null | undefined): string {
    if (!ts?.toDate) return '';
    return ts.toDate().toLocaleDateString('pt-BR');
  }

  ngOnDestroy() { this.sub?.unsubscribe(); }
}
