import { Component, OnInit, OnDestroy, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { RecadosService, Recado } from '../../services/recados.service';

type FilterPeriod = 'hoje' | 'ontem' | '7dias' | 'mes' | 'todos';

@Component({
  selector: 'app-recados-admin',
  imports: [CommonModule],
  templateUrl: './recados-admin.html',
})
export class RecadosAdminComponent implements OnInit, OnDestroy {
  private svc = inject(RecadosService);

  allRecados = signal<Recado[]>([]);
  filterPeriod = signal<FilterPeriod>('hoje');
  searchTerm = signal('');
  loading = signal(true);
  private sub?: Subscription;

  filteredRecados = computed(() => {
    const term = this.searchTerm().toLowerCase().trim();
    if (!term) return this.allRecados();
    return this.allRecados().filter(r =>
      r.city.toLowerCase().includes(term) ||
      r.requestedSong.toLowerCase().includes(term) ||
      r.name.toLowerCase().includes(term)
    );
  });

  stats = computed(() => {
    const all = this.allRecados();
    const today = new Date(); today.setHours(0, 0, 0, 0);
    return {
      total: all.length,
      hoje: all.filter(r => r.createdAt?.toDate?.() >= today).length,
      pendentes: all.filter(r => r.status === 'pendente').length,
      lidos: all.filter(r => r.status === 'lido').length,
    };
  });

  ngOnInit() {
    this.loadPeriod('hoje');
  }

  loadPeriod(period: string) {
    this.filterPeriod.set(period as FilterPeriod);
    this.loading.set(true);
    this.sub?.unsubscribe();
    const { start, end } = this.getPeriodDates(period);
    this.sub = this.svc.getRecados$(start, end).subscribe(r => {
      this.allRecados.set(r);
      this.loading.set(false);
    });
  }

  private getPeriodDates(period: string): { start?: Date; end?: Date } {
    const now = new Date();
    if (period === 'hoje') {
      const s = new Date(now); s.setHours(0, 0, 0, 0); return { start: s };
    }
    if (period === 'ontem') {
      const s = new Date(now); s.setDate(s.getDate() - 1); s.setHours(0, 0, 0, 0);
      const e = new Date(s); e.setHours(23, 59, 59, 999); return { start: s, end: e };
    }
    if (period === '7dias') {
      const s = new Date(now); s.setDate(s.getDate() - 7); s.setHours(0, 0, 0, 0); return { start: s };
    }
    if (period === 'mes') {
      return { start: new Date(now.getFullYear(), now.getMonth(), 1) };
    }
    return {};
  }

  formatDate(ts: { toDate(): Date } | null | undefined): string {
    if (!ts?.toDate) return '';
    return ts.toDate().toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  }

  async aprovar(r: Recado) { await this.svc.updateStatus(r.id, 'aprovado'); }
  async marcarLido(r: Recado) { await this.svc.updateStatus(r.id, 'lido'); }
  async excluir(r: Recado) { if (confirm('Excluir este recado?')) await this.svc.delete(r.id); }

  ngOnDestroy() { this.sub?.unsubscribe(); }
}
