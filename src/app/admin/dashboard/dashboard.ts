import { Component, OnInit, OnDestroy, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { RecadosService, Recado } from '../../services/recados.service';
import { NoticiasService, Noticia } from '../../services/noticias.service';
import { PatrocinadoresService } from '../../services/patrocinadores.service';

@Component({
  selector: 'app-dashboard',
  imports: [CommonModule],
  templateUrl: './dashboard.html',
})
export class DashboardComponent implements OnInit, OnDestroy {
  private recadosSvc = inject(RecadosService);
  private noticiasSvc = inject(NoticiasService);
  private patSvc = inject(PatrocinadoresService);

  recadosHoje = signal<Recado[]>([]);
  noticias = signal<Noticia[]>([]);
  totalPatrocinadores = signal(0);
  pendentes = signal(0);
  lidos = signal(0);

  private subs: Subscription[] = [];

  ngOnInit() {
    this.subs.push(
      this.recadosSvc.getTodayRecados$().subscribe(r => {
        this.recadosHoje.set(r);
        this.pendentes.set(r.filter(x => x.status === 'pendente').length);
        this.lidos.set(r.filter(x => x.status === 'lido').length);
      }),
      this.noticiasSvc.getAllNoticias$().subscribe(n => this.noticias.set(n)),
      this.patSvc.getAll$().subscribe(p => this.totalPatrocinadores.set(p.length)),
    );
  }

  ngOnDestroy() { this.subs.forEach(s => s.unsubscribe()); }

  formatTime(ts: { toDate(): Date } | null | undefined): string {
    if (!ts?.toDate) return '';
    return ts.toDate().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }
}
