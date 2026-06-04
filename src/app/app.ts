import {
  ChangeDetectionStrategy,
  Component,
  signal,
  computed,
  effect,
  ElementRef,
  ViewChild,
  AfterViewInit,
  OnDestroy,
  OnInit,
  PLATFORM_ID,
  Inject,
  HostListener,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';

export interface Track {
  id: number;
  title: string;
  artist: string;
  url: string;
  isLive: boolean;
}

export interface Program {
  id: number;
  timeRange: string;
  startHour: number;
  endHour: number;
  title: string;
  host: string;
  description: string;
}

export interface Sponsor {
  id: number;
  name: string;
  category: string;
  logoText: string;
  url: string;
  colorClass: string;
}

export interface NewsItem {
  id: number;
  title: string;
  summary: string;
  content: string;
  category: string;
  date: string;
  views: number;
  likes: number;
  image: string;
}

export interface EventItem {
  id: number;
  title: string;
  date: string;
  location: string;
  time: string;
  description: string;
  status: 'breve' | 'aovivo' | 'passado';
  link: string;
}

export interface ListenerMessage {
  id: number;
  name: string;
  city: string;
  requestedSong: string;
  message: string;
  timestamp: string;
  likes: number;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-root',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('visualizerCanvas', { static: false }) visualizerCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('radioPlayer', { static: false }) radioPlayer?: ElementRef<HTMLAudioElement>;

  // Audio elements
  private audio: HTMLAudioElement | null = null;
  private canvasCtx: CanvasRenderingContext2D | null = null;
  private animationId: number | null = null;
  private simulationTime = 0;

  // PWA install signals
  canInstall = signal<boolean>(false);
  deferredPrompt: any = null;

  // App state signals
  isPlaying = signal<boolean>(false);
  currentVolume = signal<number>(0.8);
  isMuted = signal<boolean>(false);
  currentTrackIndex = signal<number>(0);
  playbackTime = signal<string>('00:00');
  trackDuration = signal<string>('Ao Vivo');
  isConnecting = signal<boolean>(false);
  playError = signal<string | null>(null);

  // Lists & Data signals
  tracks = signal<Track[]>([
    {
      id: 0,
      title: 'Rádio Local 87,9 FM — Ao Vivo',
      artist: 'Edmar Cardoso',
      url: 'https://stm11.srvvox.com.br:7080/stream',
      isLive: true,
    },
    {
      id: 1,
      title: 'Demonstração de Áudio HD (Canal Teste)',
      artist: 'Sintonia Digital Pública',
      url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
      isLive: false,
    },
    {
      id: 2,
      title: 'Ambient Chill Lofi Synth',
      artist: 'Digital Echoes',
      url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
      isLive: false,
    },
    {
      id: 3,
      title: 'Corporate Inspiring Theme',
      artist: 'Nordic Soundscapes',
      url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
      isLive: false,
    },
  ]);

  currentTrack = computed(() => this.tracks()[this.currentTrackIndex()]);

  // Program Schedule
  selectedScheduleDay = signal<'seg-sex' | 'sab' | 'dom'>('seg-sex');
  
  scheduleSegSex = signal<Program[]>([
    {
      id: 1,
      timeRange: '06:00 - 08:00',
      startHour: 6,
      endHour: 8,
      title: 'Despertar Digital / Café da Manhã',
      host: 'Edmar Cardoso',
      description: 'As primeiras notícias do dia com jornalismo ágil, previsão do tempo e síntese internacional.',
    },
    {
      id: 2,
      timeRange: '08:00 - 12:00',
      startHour: 8,
      endHour: 12,
      title: 'Conexão Atualidade',
      host: 'Edmar Cardoso',
      description: 'Análise de relevância, economia local, entrevistas com especialistas e interatividade digital ao vivo.',
    },
    {
      id: 3,
      timeRange: '12:00 - 14:00',
      startHour: 12,
      endHour: 14,
      title: 'Sintonia do Meio-Dia',
      host: 'Marcos Locutor',
      description: 'O resumo das principais manchetes e uma playlist selecionada com o melhor da MPB e do Pop contemporâneo.',
    },
    {
      id: 4,
      timeRange: '14:00 - 17:00',
      startHour: 14,
      endHour: 17,
      title: 'Playlist Pop & Mix de Sucessos',
      host: 'Beto Moreno',
      description: 'Os sons consagrados que marcam época. Uma tarde repleta de energia, lançamentos e dinamismo musical.',
    },
    {
      id: 5,
      timeRange: '18:00 - 21:00',
      startHour: 18,
      endHour: 21,
      title: 'Radar de Notícias e Cultura',
      host: 'Aline Souza',
      description: 'Fique por dentro dos principais acontecimentos culturais e novidades do mundo da arte e da sociedade.',
    },
    {
      id: 6,
      timeRange: '22:00 - 00:00',
      startHour: 22,
      endHour: 24,
      title: 'Deep & Lofi Vibes',
      host: 'Aline Souza',
      description: 'Uma atmosfera sonora envolvente e relaxante para acalmar a sua mente no final do dia com alta fidelidade.',
    },
  ]);

  scheduleSab = signal<Program[]>([
    {
      id: 7,
      timeRange: '08:00 - 12:00',
      startHour: 8,
      endHour: 12,
      title: 'Weekend Beats',
      host: 'Edmar Cardoso',
      description: 'Manhã de sábado descontraída, com dicas de eventos regionais, tecnologia, playlists exclusivas e convidados.',
    },
    {
      id: 8,
      timeRange: '13:00 - 17:00',
      startHour: 13,
      endHour: 17,
      title: 'Lounge Acústico',
      host: 'Zé do Pinho',
      description: 'Versões acústicas elegantes de grandes sucessos, sob medida para a sua tarde de descanso.',
    },
    {
      id: 9,
      timeRange: '18:00 - 22:00',
      startHour: 18,
      endHour: 22,
      title: 'Weekend Hits',
      host: 'Marcos Locutor',
      description: 'A energia ideal para a noite de sábado com as músicas mais tocadas nos principais rankings mundiais.',
    },
  ]);

  scheduleDom = signal<Program[]>([
    {
      id: 10,
      timeRange: '08:00 - 12:00',
      startHour: 8,
      endHour: 12,
      title: 'Sintonia de Domingo',
      host: 'Edmar Cardoso',
      description: 'Mensagens de reflexão, trilhas clássicas e entrevistas que inspiram um domingo de paz e conexão familiar.',
    },
    {
      id: 11,
      timeRange: '12:00 - 16:00',
      startHour: 12,
      endHour: 16,
      title: 'Clássicos da Música',
      host: 'Edmar Cardoso',
      description: 'Uma viagem no tempo revivendo os maiores clássicos vocais e instrumentais das últimas décadas.',
    },
  ]);

  // Sponsors
  sponsors = signal<Sponsor[]>([
    {
      id: 1,
      name: 'AgroCampos Consultoria Digital',
      category: 'Inovação & Soluções Rurais',
      logoText: 'AgroCampos',
      url: '#',
      colorClass: 'from-slate-50 to-slate-100/50 border-slate-200 text-slate-800',
    },
    {
      id: 2,
      name: 'Sicoob Planalto Central',
      category: 'Finanças Cooperativas',
      logoText: 'Sicoob Credit',
      url: '#',
      colorClass: 'from-blue-50/50 to-blue-100/30 border-blue-200 text-blue-800',
    },
    {
      id: 3,
      name: 'Santo Antônio Tech / Agência Digital',
      category: 'Marketing & Desenvolvimento',
      logoText: 'Santo Antônio Tech',
      url: '#',
      colorClass: 'from-slate-50 to-slate-100/50 border-slate-200 text-slate-800',
    },
    {
      id: 4,
      name: 'Terra Forte Logística',
      category: 'Distribuição Inteligente',
      logoText: 'Terra Forte',
      url: '#',
      colorClass: 'from-amber-50/50 to-amber-100/30 border-amber-200 text-amber-800',
    },
    {
      id: 5,
      name: 'Posto Alvorada Conveniência',
      category: 'Combustíveis de Confiança',
      logoText: 'Posto Alvorada',
      url: '#',
      colorClass: 'from-slate-50 to-slate-100/50 border-slate-200 text-slate-800',
    },
    {
      id: 6,
      name: 'Boi Gordo Premium Food',
      category: 'Corte Especial & Gastronomia',
      logoText: 'Boi Gordo Premium',
      url: '#',
      colorClass: 'from-rose-50/50 to-rose-100/30 border-rose-200 text-rose-800',
    },
  ]);

  // Events Calendar
  events = signal<EventItem[]>([
    {
      id: 1,
      title: 'Transmissão Ao Vivo do Fórum de Desenvolvimento de Campos Belos',
      date: '12 de Julho de 2026',
      location: 'Auditório Municipal, Centro',
      time: '08:00',
      description: 'Edmar Cardoso e equipe debatem as principais conquistas e perspectivas digitais de toda a nossa microrregião.',
      status: 'breve',
      link: 'https://whatsapp.com',
    },
    {
      id: 2,
      title: 'Painel Regional de Empreendedorismo Digital',
      date: '25 de Junho de 2026',
      location: 'Praça Matriz, Campos Belos - GO',
      time: '19:00',
      description: 'O maior polo de empresas e iniciativas inovadoras se reúne para debater o futuro dos serviços corporativos locais.',
      status: 'breve',
      link: 'https://instagram.com',
    },
    {
      id: 3,
      title: 'Encontro Literário e Cultural - Especial Estúdio VIP',
      date: '09 de Agosto de 2026',
      location: 'Estúdios da Campos Belos Digital',
      time: '11:00',
      description: 'Especial literário com bate-papo, sorteios de livros de autores goianos e espaço aberto aos ouvintes do mural.',
      status: 'breve',
      link: '#',
    },
  ]);

  // News / Blog List
  newsList = signal<NewsItem[]>([
    {
      id: 1,
      title: 'Campos Belos Digital Expande Conectividade e Investe em Nova Plataforma',
      summary: 'A emissora líder em audiência digital expande servidores de streaming e passa a transmitir sinal purificado em 128kbps AAC.',
      content: 'Buscando aperfeiçoar nossos canais de contato e garantir som livre de ruídos, a Campos Belos Digital inaugurou novas instalações neste mês. Sob a gestão inovadora de Edmar Cardoso, o link de áudio foi aprimorado buscando garantir que a rádio seja sintonizada com perfeição em qualquer dispositivo móvel e navegador de internet de alta performance. Além dos canais habituais, agora os ouvintes usufruem do novo mural de recados 100% livre e criptografado para saudações em tempo real. O rádio evoluiu, e nós lideramos essa transição na nossa microrregião.',
      category: 'Novidades da Rádio',
      date: '03 de Junho de 2026',
      views: 342,
      likes: 95,
      image: 'https://picsum.photos/seed/radiohd/800/500',
    },
    {
      id: 2,
      title: 'Comunicação Digital e o seu Impacto no Interior e Áreas Rurais',
      summary: 'Análise aprofundada mostra como as mídias online estão fortalecendo o acesso à informação de qualidade no dia a dia.',
      content: 'A inclusão digital transformou os métodos de consumo de conteúdo no interior do estado de Goiás e Tocantins. Atualmente, canais baseados em navegadores modernos eliminam barreiras físicas, permitindo que produtores, comerciantes e famílias recebam dados econômicos e sociais atualizados em tempo real. Edmar Cardoso comenta a importância da integração de canais de áudio instantâneo com ferramentas de texto: "O rádio moderno uniu a espontaneidade da voz ao dinamismo das plataformas responsivas".',
      category: 'Novidades da Rádio',
      date: '01 de Junho de 2026',
      views: 521,
      likes: 178,
      image: 'https://picsum.photos/seed/comunicacao/800/500',
    },
    {
      id: 3,
      title: 'Parcerias com Foco no Desenvolvimento da Comunidade Regional',
      summary: 'Campos Belos Digital apoia projetos voltados à formação de jovens e engajamento cultural local.',
      content: 'Em nossa nova grade de projetos para o segundo semestre de 2026, estamos estabelecendo acordos significativos com bibliotecas públicas municipais e centros de treinamento em robótica. O intuito é divulgar editais, conceder espaço de fala e amplificar as ótimas iniciativas de nossa comunidade de forma totalmente profissional e acessível.',
      category: 'Novidades da Rádio',
      date: '28 de Maio de 2026',
      views: 298,
      likes: 104,
      image: 'https://picsum.photos/seed/desenvolvimento/800/500',
    },
  ]);

  selectedNews = signal<NewsItem | null>(null);

  // Messages Board (Mural de recados)
  messages = signal<ListenerMessage[]>([
    {
      id: 1,
      name: 'Reginaldo Prado',
      city: 'Arraias - TO',
      requestedSong: 'Playlist Lofi Chill',
      message: 'Excelente projeto, Edmar! Parabéns pelo novo design moderno e limpo. A qualidade do áudio está incrível!',
      timestamp: 'Há 5 minutos',
      likes: 12,
    },
    {
      id: 2,
      name: 'Ana Laura Moreira',
      city: 'Campos Belos - GO',
      requestedSong: 'Acústico MPB Clássico',
      message: 'O melhor portal digital de nossa região. Visual sofisticado, clean, moderno e de altíssimo nível. Parabéns à equipe!',
      timestamp: 'Há 15 minutos',
      likes: 8,
    },
    {
      id: 3,
      name: 'Chico Rezende',
      city: 'Monte Alegre de Goiás',
      requestedSong: 'Pop Instrumental',
      message: 'Sintonizado aqui na empresa ouvindo a melhor transmissão sem interferências. Sucesso total!',
      timestamp: 'Há 32 minutos',
      likes: 15,
    },
    {
      id: 4,
      name: 'Paula e Ricardo',
      city: 'Goiânia - GO',
      requestedSong: 'MPB / Bossa Nova Lounge',
      message: 'Sempre conectados ouvindo a Campos Belos Digital, matando um pouco da saudade da nossa querida cidade. Parabéns pelo portal!',
      timestamp: 'Há 1 hora',
      likes: 6,
    },
  ]);

  // Reactive Forms
  recadoForm = new FormGroup({
    name: new FormControl('', [Validators.required, Validators.minLength(2)]),
    city: new FormControl('', [Validators.required, Validators.minLength(3)]),
    requestedSong: new FormControl('', [Validators.required, Validators.minLength(2)]),
    message: new FormControl('', [Validators.required, Validators.minLength(4)]),
  });

  // Admin Panels
  showAdminPanel = signal<boolean>(false);
  isAdminAuthenticated = signal<boolean>(false);
  adminPassphrase = new FormControl('');
  adminError = signal<string | null>(null);

  adminNewsForm = new FormGroup({
    title: new FormControl('', [Validators.required, Validators.minLength(5)]),
    summary: new FormControl('', [Validators.required, Validators.minLength(10)]),
    content: new FormControl('', [Validators.required, Validators.minLength(15)]),
    category: new FormControl('Cultura & Tradição', [Validators.required]),
    image: new FormControl('', []),
  });

  // Toast Signal
  toastMessage = signal<string | null>(null);

  // UTC / Local digital clock
  braziliaTime = signal<string>('00:00:00');

  // Active Event modal signal
  activeEvent = signal<EventItem | null>(null);

  // Mock live listener count signal
  listenerCount = signal<number>(452);

  // Currently on air computed state
  currentlyOnAir = computed(() => {
    const day = this.selectedScheduleDay();
    const date = new Date();
    const utcHours = date.getUTCHours();
    const brHour = (utcHours - 3 + 24) % 24;

    let targetSchedule: Program[] = [];
    if (day === 'seg-sex') targetSchedule = this.scheduleSegSex();
    else if (day === 'sab') targetSchedule = this.scheduleSab();
    else targetSchedule = this.scheduleDom();

    const active = targetSchedule.find((p) => {
      if (p.startHour <= p.endHour) {
        return brHour >= p.startHour && brHour < p.endHour;
      } else {
        return brHour >= p.startHour || brHour < p.endHour;
      }
    });

    return active || targetSchedule[0];
  });

  // Bind dos métodos para manter o contexto
  private onPlay = () => {
    this.isPlaying.set(true);
    this.isConnecting.set(false);
    this.playError.set(null);
    this.cdr.detectChanges();
  }

  private onPlaying = () => {
    console.log('Audio is playing');
    this.isPlaying.set(true);
    this.isConnecting.set(false);
    this.playError.set(null);
    this.cdr.detectChanges();
  }

  private onPause = () => {
    console.log('Audio paused');
    this.isPlaying.set(false);
    this.isConnecting.set(false);
    this.cdr.detectChanges();
  }

  private onWaiting = () => {
    console.log('Audio waiting (buffering)');
    if (!this.isPlaying()) {
      this.isConnecting.set(true);
    }
    this.cdr.detectChanges();
  }

  private onCanPlay = () => {
    console.log('Audio can play');
    this.isConnecting.set(false);
    this.cdr.detectChanges();
  }

  private onError = (e: Event) => {
    console.error('Audio error:', e);
    this.isConnecting.set(false);
    this.isPlaying.set(false);
    this.playError.set('Erro na transmissão. Verifique sua conexão.');
    this.cdr.detectChanges();
  }

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private cdr: ChangeDetectorRef
  ) {
    effect(() => {
      const vol = this.currentVolume();
      const mute = this.isMuted();
      const radio = this.radioPlayer?.nativeElement;
      if (radio) radio.volume = mute ? 0 : vol;
    });
  }

  ngOnInit() {
    this.updateClock();
    setInterval(() => {
      this.updateClock();
      const diff = Math.floor(Math.random() * 5) - 2;
      this.listenerCount.update((c: number) => Math.max(380, Math.min(550, c + diff)));
    }, 1000);

    setInterval(() => {
      this.simulateListenerInteraction();
    }, 50000);

    this.loadPersistedData();

    if (isPlatformBrowser(this.platformId)) {
      const isStandalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone ||
        document.referrer.includes('android-app://');
      this.canInstall.set(!isStandalone);

      window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        this.deferredPrompt = e;
        this.canInstall.set(true);
      });
    }
  }

  @HostListener('window:beforeinstallprompt', ['$event'])
  onBeforeInstallPrompt(e: any) {
    e.preventDefault();
    this.deferredPrompt = e;
    this.canInstall.set(true);
  }

  @HostListener('window:appinstalled')
  onAppInstalled() {
    this.deferredPrompt = null;
    this.canInstall.set(false);
    this.showToast('Aplicativo instalado! Acesse direto da sua tela inicial.');
  }

  async installPwa() {
    if (this.deferredPrompt) {
      this.deferredPrompt.prompt();
      const { outcome } = await this.deferredPrompt.userChoice;
      if (outcome === 'accepted') this.canInstall.set(false);
      this.deferredPrompt = null;
    } else {
      this.showToast(
        'Chrome/Android: menu (⋮) → "Instalar App". iOS/Safari: Compartilhar (↑) → "Adicionar à Tela de Início".',
      );
    }
  }

  ngAfterViewInit() {
    if (!isPlatformBrowser(this.platformId)) return;

    const canvas = this.visualizerCanvas?.nativeElement;
    if (canvas) {
      this.canvasCtx = canvas.getContext('2d');
      this.resizeCanvas();
      window.addEventListener('resize', () => this.resizeCanvas());
      this.startVisualizationLoop();
    }

    const radio = this.radioPlayer?.nativeElement;
    if (!radio) return;

    this.setupAudioEventListeners(radio);
    
    radio.preload = 'auto';
    radio.volume = this.isMuted() ? 0 : this.currentVolume();
    radio.load();
    
    this.attemptAutoplay(radio);
  }

  private setupAudioEventListeners(radio: HTMLAudioElement) {
    radio.removeEventListener('play', this.onPlay);
    radio.removeEventListener('playing', this.onPlaying);
    radio.removeEventListener('pause', this.onPause);
    radio.removeEventListener('waiting', this.onWaiting);
    radio.removeEventListener('canplay', this.onCanPlay);
    radio.removeEventListener('error', this.onError);
    
    radio.addEventListener('play', this.onPlay);
    radio.addEventListener('playing', this.onPlaying);
    radio.addEventListener('pause', this.onPause);
    radio.addEventListener('waiting', this.onWaiting);
    radio.addEventListener('canplay', this.onCanPlay);
    radio.addEventListener('error', this.onError);
  }

  private attemptAutoplay(radio: HTMLAudioElement) {
    const playPromise = radio.play();
    
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          console.log('Autoplay successful');
          this.isPlaying.set(true);
          this.isConnecting.set(false);
          this.cdr.detectChanges();
        })
        .catch((error) => {
          console.log('Autoplay prevented by browser:', error);
          this.isPlaying.set(false);
          this.isConnecting.set(false);
          this.playError.set(null);
          this.cdr.detectChanges();
        });
    }
  }

  private setupMediaSession() {
    if (!('mediaSession' in navigator)) return;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: 'Rádio Local 87,9 FM',
      artist: 'Edmar Cardoso',
      album: 'Programação Ao Vivo · 87,9 FM',
      artwork: [
        { src: '/edimar.png', sizes: '192x192', type: 'image/png' },
        { src: '/edimar.png', sizes: '512x512', type: 'image/png' },
      ],
    });
    navigator.mediaSession.setActionHandler('play', () => { this.radioPlayer?.nativeElement?.play(); });
    navigator.mediaSession.setActionHandler('pause', () => { this.radioPlayer?.nativeElement?.pause(); });
    navigator.mediaSession.setActionHandler('stop', () => { this.radioPlayer?.nativeElement?.pause(); });
  }

  ngOnDestroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    
    const radio = this.radioPlayer?.nativeElement;
    if (radio) {
      radio.removeEventListener('play', this.onPlay);
      radio.removeEventListener('playing', this.onPlaying);
      radio.removeEventListener('pause', this.onPause);
      radio.removeEventListener('waiting', this.onWaiting);
      radio.removeEventListener('canplay', this.onCanPlay);
      radio.removeEventListener('error', this.onError);
    }
  }

  togglePlay() {
    if (!isPlatformBrowser(this.platformId)) return;
    const radio = this.radioPlayer?.nativeElement;
    if (!radio) return;
    
    this.playError.set(null);

    if (this.isPlaying()) {
      radio.pause();
    } else {
      this.isConnecting.set(true);
      radio.volume = this.isMuted() ? 0 : this.currentVolume();
      this.cdr.detectChanges();
      
      const playPromise = radio.play();
      
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            console.log('Play succeeded');
          })
          .catch((err) => {
            console.error('Play error:', err);
            this.isConnecting.set(false);
            this.isPlaying.set(false);
            this.playError.set('Não foi possível iniciar. Clique novamente para tentar.');
            this.cdr.detectChanges();
          });
      }
    }
  }

  selectTrack(index: number) {
    this.playError.set(null);
    this.isPlaying.set(false);
    this.currentTrackIndex.set(index);

    if (this.audio) {
      this.audio.pause();
      this.audio.src = this.tracks()[index].url;
      this.audio.load();
    } else {
      return;
    }

    this.isConnecting.set(true);
    this.audio.play()
      .then(() => {
        this.isPlaying.set(true);
        this.isConnecting.set(false);
      })
      .catch((e) => {
        console.error('Track play failure:', e);
        this.isConnecting.set(false);
        this.isPlaying.set(false);
        this.playError.set('Clique no botão Play para escutar esta faixa.');
      });
  }

  setVolume(event: Event) {
    const value = +(event.target as HTMLInputElement).value;
    this.currentVolume.set(value);
    if (value > 0 && this.isMuted()) {
      this.isMuted.set(false);
    }
  }

  toggleMute() {
    this.isMuted.update((m) => !m);
  }

  private updateClock() {
    const d = new Date();
    const utcHours = d.getUTCHours();
    const utcMinutes = d.getUTCMinutes();
    const utcSeconds = d.getUTCSeconds();

    const brHours = (utcHours - 3 + 24) % 24;
    const h = brHours.toString().padStart(2, '0');
    const m = utcMinutes.toString().padStart(2, '0');
    const s = utcSeconds.toString().padStart(2, '0');

    this.braziliaTime.set(`${h}:${m}:${s}`);

    const dayOfWeek = d.getDay();
    if (this.selectedScheduleDay() === 'seg-sex' && (dayOfWeek === 0 || dayOfWeek === 6)) {
      if (dayOfWeek === 0) this.selectedScheduleDay.set('dom');
      else this.selectedScheduleDay.set('sab');
    }
  }

  private formatTime(secs: number): string {
    if (isNaN(secs) || !isFinite(secs)) return '00:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }

  private resizeCanvas() {
    if (this.visualizerCanvas && this.visualizerCanvas.nativeElement) {
      const c = this.visualizerCanvas.nativeElement;
      const rect = c.parentElement?.getBoundingClientRect();
      c.width = rect?.width || 400;
      c.height = rect?.height || 60;
    }
  }

  private startVisualizationLoop() {
    const paint = () => {
      this.simulationTime += this.isPlaying() ? (this.isConnecting() ? 0.3 : 1) : 0.08;
      const ctx = this.canvasCtx;
      const canvas = this.visualizerCanvas?.nativeElement;

      if (ctx && canvas) {
        const w = canvas.width;
        const h = canvas.height;
        ctx.clearRect(0, 0, w, h);

        const playing = this.isPlaying();
        const connecting = this.isConnecting();

        const waveCount = 5;
        const colors = [
          'rgba(79, 70, 229, 0.12)',
          'rgba(124, 58, 237, 0.22)',
          'rgba(236, 72, 153, 0.32)',
          'rgba(0, 229, 171, 0.52)',
          'rgba(124, 58, 237, 0.82)',
        ];

        for (let i = 0; i < waveCount; i++) {
          ctx.beginPath();
          ctx.lineWidth = i === waveCount - 1 ? 2.5 : 1.2;
          ctx.strokeStyle = colors[i];

          const frequency = 0.006 + (i * 0.002);
          let baseAmplitude = playing ? 16 - i * 2 : 2.5;
          if (connecting) {
            baseAmplitude = 6 + Math.sin(this.simulationTime * 0.15) * 4;
          }

          ctx.moveTo(0, h / 2);

          for (let x = 0; x <= w; x += 3) {
            const speedMod = this.simulationTime * (0.015 + i * 0.005);
            const edgeTaper = Math.sin((x / w) * Math.PI);
            const formula = Math.sin(x * frequency + speedMod) * Math.cos(x * 0.002 - speedMod * 0.5);
            const y = h / 2 + formula * baseAmplitude * edgeTaper;
            ctx.lineTo(x, y);
          }

          ctx.stroke();
        }
      }

      this.animationId = requestAnimationFrame(paint);
    };

    paint();
  }

  sendRecado() {
    if (this.recadoForm.invalid) {
      this.recadoForm.markAllAsTouched();
      this.showToast('Por favor, preencha todos os campos do seu recado de coração.');
      return;
    }

    const { name, city, requestedSong, message } = this.recadoForm.value;

    const newMessage: ListenerMessage = {
      id: Date.now(),
      name: name || 'Ouvinte Anônimo',
      city: city || 'Nordeste Goiano',
      requestedSong: requestedSong || 'Preferida do Edmar',
      message: message || '',
      timestamp: 'Agora mesmo',
      likes: 0,
    };

    this.messages.update((m) => [newMessage, ...m]);
    this.recadoForm.reset({
      name: '',
      city: '',
      requestedSong: '',
      message: '',
    });

    this.persistMessages();
    this.showToast('Recado enviado com sucesso! Edmar Cardoso vai ler o seu abraço no ar.');
  }

  likeMessage(msgId: number, event: Event) {
    event.stopPropagation();
    this.messages.update((msgs) =>
      msgs.map((m) => (m.id === msgId ? { ...m, likes: m.likes + 1 } : m))
    );
    this.persistMessages();
    this.showToast('Agradecemos a sua curtida pelo recado do companheiro!');
  }

  deleteMessage(msgId: number) {
    this.messages.update((msgs) => msgs.filter((m) => m.id !== msgId));
    this.persistMessages();
    this.showToast('Recado removido do mural com sucesso.');
  }

  likeNewsDirect(newsId: number) {
    this.newsList.update((list) =>
      list.map((n) => (n.id === newsId ? { ...n, likes: n.likes + 1 } : n))
    );
    this.persistNews();
    this.showToast('Você curtiu esta notícia!');
  }

  likeNews(newsId: number, event: Event) {
    event.stopPropagation();
    this.newsList.update((list) =>
      list.map((n) => (n.id === newsId ? { ...n, likes: n.likes + 1 } : n))
    );
    this.persistNews();
    this.showToast('Obrigado pelo seu voto de carinho na nossa notícia!');
  }

  incrementNewsViews(news: NewsItem) {
    this.selectedNews.set(news);
    this.newsList.update((list) =>
      list.map((n) => (n.id === news.id ? { ...n, views: n.views + 1 } : n))
    );
    this.persistNews();
  }

  private simulateListenerInteraction() {
    const dummyNames = [
      'Geraldo Rosa',
      'Fátima de Souza',
      'Sandro Rezende',
      'Marcos Peixoto',
      'Mariana Oliveira',
      'Adair da Silva',
    ];
    const dummyCities = [
      'Formosa - GO',
      'Taguatinga - TO',
      'Teresina de Goiás',
      'Dianópolis - TO',
      'Arraias - TO',
      'Planaltina - GO',
    ];
    const dummySongs = [
      'Jazz Instrumental',
      'Ambient Chillout',
      'Acoustic Pop',
      'Sinfonia Moderna',
      'Bossa Nova Classica',
      'Guitar Solo Mix',
    ];
    const dummyMessages = [
      'Parabéns pela qualidade sonora Edmar! Sintonizados o dia todo.',
      'Rádio espetacular, limpa, sem anúncios. Muito bom!',
      'Mando abraços para toda a equipe do estúdio Campos Belos Digital.',
      'Que estética moderna linda, parabéns pelo novo portal!',
      'Peço a faixa instrumental para acompanhar nosso trabalho da tarde.',
      'Excelente curadoria Edmar Cardoso! Sempre em alta definição.',
    ];

    const pickIdx = Math.floor(Math.random() * dummyNames.length);

    const generatedMsg: ListenerMessage = {
      id: Date.now(),
      name: dummyNames[pickIdx],
      city: dummyCities[Math.floor(Math.random() * dummyCities.length)],
      requestedSong: dummySongs[Math.floor(Math.random() * dummySongs.length)],
      message: dummyMessages[pickIdx],
      timestamp: 'Agora mesmo',
      likes: Math.floor(Math.random() * 3),
    };

    this.messages.update((m) => [generatedMsg, ...m.slice(0, 15)]);
    this.showToast(`Novo recado adicionado ao vivo de ${generatedMsg.name} (${generatedMsg.city})!`);
  }

  showToast(text: string) {
    this.toastMessage.set(text);
    setTimeout(() => {
      if (this.toastMessage() === text) {
        this.toastMessage.set(null);
      }
    }, 4000);
  }

  openEventDetails(evt: EventItem) {
    this.activeEvent.set(evt);
  }

  closeEventModal() {
    this.activeEvent.set(null);
  }

  authenticateAdmin() {
    const val = this.adminPassphrase.value;
    if (val === 'edmar10' || val === 'admin') {
      this.isAdminAuthenticated.set(true);
      this.adminError.set(null);
      this.showToast('Acesso concedido, Edmar Cardoso! Agora você pode criar e publicar notícias.');
    } else {
      this.adminError.set('Senha incorreta. Dica do Edmar: use a senha "admin" para testar o sistema.');
    }
  }

  logoutAdmin() {
    this.isAdminAuthenticated.set(false);
    this.adminPassphrase.setValue('');
    this.showAdminPanel.set(false);
    this.showToast('Sessão administrativa encerrada.');
  }

  submitNews() {
    if (this.adminNewsForm.invalid) {
      this.adminNewsForm.markAllAsTouched();
      this.showToast('Preencha os campos obrigatórios da nova notícia.');
      return;
    }

    const { title, summary, content, category, image } = this.adminNewsForm.value;

    const newPost: NewsItem = {
      id: Date.now(),
      title: title || 'Sem Título',
      summary: summary || 'Resumo rápido.',
      content: content || 'Conteúdo completo escriturado.',
      category: category || 'Geral',
      date: 'Hoje mesmo',
      views: 1,
      likes: 0,
      image: image || `https://picsum.photos/seed/${Date.now()}/800/500`,
    };

    this.newsList.update((list) => [newPost, ...list]);
    this.adminNewsForm.reset({
      title: '',
      summary: '',
      content: '',
      category: 'Cultura & Tradição',
      image: '',
    });

    this.persistNews();
    this.showToast('Grandiosa notícia publicada com sucesso e já está disponível no feed principal!');
  }

  private persistMessages() {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('camposbelos_messages', JSON.stringify(this.messages()));
      } catch (e) {
        console.error('Failed storing messages locally', e);
      }
    }
  }

  private persistNews() {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('camposbelos_news', JSON.stringify(this.newsList()));
      } catch (e) {
        console.error('Failed storing news locally', e);
      }
    }
  }

  private loadPersistedData() {
    if (typeof window !== 'undefined') {
      try {
        const localMsgs = localStorage.getItem('camposbelos_messages');
        if (localMsgs) {
          const parsed = JSON.parse(localMsgs);
          if (Array.isArray(parsed) && parsed.length > 0) {
            this.messages.set(parsed);
          }
        }

        const localNews = localStorage.getItem('camposbelos_news');
        if (localNews) {
          const parsed = JSON.parse(localNews);
          if (Array.isArray(parsed) && parsed.length > 0) {
            this.newsList.set(parsed);
          }
        }
      } catch (e) {
        console.error('Failed reading localStorage', e);
      }
    }
  }
}