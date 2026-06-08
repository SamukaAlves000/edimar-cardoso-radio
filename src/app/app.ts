import {
    ChangeDetectionStrategy,
    ChangeDetectorRef,
    Component,
    signal,
    computed,
    effect,
    inject,
    ElementRef,
    ViewChild,
    AfterViewInit,
    OnDestroy,
    OnInit,
    PLATFORM_ID,
    HostListener,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router, RouterLink, RouterOutlet, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { RecadosService } from './services/recados.service';
import { NoticiasService } from './services/noticias.service';
import { PatrocinadoresService } from './services/patrocinadores.service';

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
    id: number | string;
    name: string;
    category: string;
    logoText: string;
    logoUrl?: string;
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


export interface ListenerMessage {
    id: string;
    name: string;
    city: string;
    requestedSong: string;
    message: string;
    timestamp: string;
    likes: number;
    status?: 'pendente' | 'aprovado' | 'lido';
}

interface BeforeInstallPromptEvent extends Event {
    prompt(): Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-root',
    imports: [CommonModule, RouterLink, RouterOutlet, ReactiveFormsModule],
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
    deferredPrompt: BeforeInstallPromptEvent | null = null;

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
            title: 'Rádio Campos Belos Digital — Ao Vivo',
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
        { id: 1, timeRange: '00:00 - 04:00', startHour: 0,  endHour: 4,  title: 'Madrugada Web',                               host: 'Edimar Cardoso', description: 'As melhores músicas sertanejas para quem está acordado de madrugada.' },
        { id: 2, timeRange: '04:00 - 08:00', startHour: 4,  endHour: 8,  title: 'Super Manhã Sertaneja Web / Programa Baú Sertanejo', host: 'Edimar Cardoso', description: 'O melhor do sertanejo raiz e do Baú para começar o dia com muita animação.' },
        { id: 3, timeRange: '08:00 - 12:00', startHour: 8,  endHour: 12, title: 'Show da Manhã Web',                            host: 'Edimar Cardoso', description: 'Sucessos e lançamentos sertanejos para animar a sua manhã.' },
        { id: 4, timeRange: '12:00 - 16:00', startHour: 12, endHour: 16, title: 'Show da Tarde na Web',                         host: 'Edimar Cardoso', description: 'Tarde animada com pedidos, recados e muito sertanejo para todos os ouvintes.' },
        { id: 5, timeRange: '17:00 - 20:00', startHour: 17, endHour: 20, title: 'Boteco Sertanejo',                              host: 'Edimar Cardoso', description: 'O melhor do sertanejo para embalar o fim da tarde com estilo e alegria.' },
        { id: 6, timeRange: '20:00 - 00:00', startHour: 20, endHour: 24, title: 'Love Nejo Web',                                 host: 'Edimar Cardoso', description: 'Músicas românticas e especiais para encerrar o dia com emoção e saudade.' },
    ]);

    scheduleSab = signal<Program[]>([
        { id: 1, timeRange: '00:00 - 04:00', startHour: 0,  endHour: 4,  title: 'Madrugada Web',                               host: 'Edimar Cardoso', description: 'As melhores músicas sertanejas para quem está acordado de madrugada.' },
        { id: 2, timeRange: '04:00 - 08:00', startHour: 4,  endHour: 8,  title: 'Super Manhã Sertaneja Web / Programa Baú Sertanejo', host: 'Edimar Cardoso', description: 'O melhor do sertanejo raiz e do Baú para começar o dia com muita animação.' },
        { id: 3, timeRange: '08:00 - 12:00', startHour: 8,  endHour: 12, title: 'Show da Manhã Web',                            host: 'Edimar Cardoso', description: 'Sucessos e lançamentos sertanejos para animar a sua manhã.' },
        { id: 4, timeRange: '12:00 - 16:00', startHour: 12, endHour: 16, title: 'Show da Tarde na Web',                         host: 'Edimar Cardoso', description: 'Tarde animada com pedidos, recados e muito sertanejo para todos os ouvintes.' },
        { id: 5, timeRange: '17:00 - 20:00', startHour: 17, endHour: 20, title: 'Boteco Sertanejo',                              host: 'Edimar Cardoso', description: 'O melhor do sertanejo para embalar o fim da tarde com estilo e alegria.' },
        { id: 6, timeRange: '20:00 - 00:00', startHour: 20, endHour: 24, title: 'Love Nejo Web',                                 host: 'Edimar Cardoso', description: 'Músicas românticas e especiais para encerrar o dia com emoção e saudade.' },
    ]);

    scheduleDom = signal<Program[]>([
        { id: 1, timeRange: '00:00 - 04:00', startHour: 0,  endHour: 4,  title: 'Madrugada Web',                               host: 'Edimar Cardoso', description: 'As melhores músicas sertanejas para quem está acordado de madrugada.' },
        { id: 2, timeRange: '04:00 - 08:00', startHour: 4,  endHour: 8,  title: 'Super Manhã Sertaneja Web / Programa Baú Sertanejo', host: 'Edimar Cardoso', description: 'O melhor do sertanejo raiz e do Baú para começar o dia com muita animação.' },
        { id: 3, timeRange: '08:00 - 12:00', startHour: 8,  endHour: 12, title: 'Show da Manhã Web',                            host: 'Edimar Cardoso', description: 'Sucessos e lançamentos sertanejos para animar a sua manhã.' },
        { id: 4, timeRange: '12:00 - 16:00', startHour: 12, endHour: 16, title: 'Show da Tarde na Web',                         host: 'Edimar Cardoso', description: 'Tarde animada com pedidos, recados e muito sertanejo para todos os ouvintes.' },
        { id: 5, timeRange: '17:00 - 20:00', startHour: 17, endHour: 20, title: 'Boteco Sertanejo',                              host: 'Edimar Cardoso', description: 'O melhor do sertanejo para embalar o fim da tarde com estilo e alegria.' },
        { id: 6, timeRange: '20:00 - 00:00', startHour: 20, endHour: 24, title: 'Love Nejo Web',                                 host: 'Edimar Cardoso', description: 'Músicas românticas e especiais para encerrar o dia com emoção e saudade.' },
    ]);


    // Sponsors — populated from Firebase
    sponsors = signal<Sponsor[]>([]);

    // News — populated from Firebase
    newsList = signal<NewsItem[]>([]);

    selectedNews = signal<NewsItem | null>(null);

    // Messages Board (Mural de recados)
    messages = signal<ListenerMessage[]>([
        {
            id: '1',
            name: 'Reginaldo Prado',
            city: 'Arraias - TO',
            requestedSong: 'Playlist Lofi Chill',
            message: 'Excelente projeto, Edmar! Parabéns pelo novo design moderno e limpo. A qualidade do áudio está incrível!',
            timestamp: 'Há 5 minutos',
            likes: 12,
        },
        {
            id: '2',
            name: 'Ana Laura Moreira',
            city: 'Campos Belos - GO',
            requestedSong: 'Acústico MPB Clássico',
            message: 'O melhor portal digital de nossa região. Visual sofisticado, clean, moderno e de altíssimo nível. Parabéns à equipe!',
            timestamp: 'Há 15 minutos',
            likes: 8,
        },
        {
            id: '3',
            name: 'Chico Rezende',
            city: 'Monte Alegre de Goiás',
            requestedSong: 'Pop Instrumental',
            message: 'Sintonizado aqui na empresa ouvindo a melhor transmissão sem interferências. Sucesso total!',
            timestamp: 'Há 32 minutos',
            likes: 15,
        },
        {
            id: '4',
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

    private platformId = inject(PLATFORM_ID);
    private cdr = inject(ChangeDetectorRef);
    private router = inject(Router);
    private recadosSvc = inject(RecadosService);
    private noticiasSvc = inject(NoticiasService);
    private patSvc = inject(PatrocinadoresService);

    isAdminRoute = signal(false);

    constructor() {
        effect(() => {
            const vol = this.currentVolume();
            const mute = this.isMuted();
            const radio = this.radioPlayer?.nativeElement;
            if (radio) radio.volume = mute ? 0 : vol;
        });
    }

    ngOnInit() {
        this.isAdminRoute.set(this.router.url.startsWith('/admin'));
        this.router.events.pipe(filter(e => e instanceof NavigationEnd)).subscribe(e => {
            this.isAdminRoute.set((e as NavigationEnd).urlAfterRedirects.startsWith('/admin'));
            this.cdr.detectChanges();
        });

        this.updateClock();
        setInterval(() => {
            this.updateClock();
            const diff = Math.floor(Math.random() * 5) - 2;
            this.listenerCount.update((c: number) => Math.max(380, Math.min(550, c + diff)));
        }, 1000);

        this.loadPersistedData();

        // Firebase real-time subscriptions
        if (isPlatformBrowser(this.platformId)) {
            this.recadosSvc.getTodayRecados$().subscribe(recados => {
                this.messages.set(recados.map(r => ({
                    id: r.id,
                    name: r.name,
                    city: r.city,
                    requestedSong: r.requestedSong,
                    message: r.message,
                    likes: r.likes,
                    status: r.status,
                    timestamp: r.createdAt?.toDate?.().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) ?? '',
                })));
                this.cdr.detectChanges();
            });

            this.noticiasSvc.getNoticias$().subscribe(noticias => {
                this.newsList.set(noticias.map((n, i) => ({
                    id: i + 1,
                    title: n.titulo,
                    summary: n.descricao,
                    content: n.descricao,
                    category: 'Notícias',
                    date: n.createdAt?.toDate?.().toLocaleDateString('pt-BR') ?? '',
                    views: 0,
                    likes: 0,
                    image: n.imagemUrl,
                })));
                this.cdr.detectChanges();
            });

            this.patSvc.getAtivos$().subscribe(pats => {
                this.sponsors.set(pats.map(p => ({
                    id: p.id,
                    name: p.nome,
                    category: p.categoria,
                    logoText: p.nome.substring(0, 2),
                    url: p.url,
                    colorClass: 'from-[#7C3AED]/10 to-[#7C3AED]/5',
                    logoUrl: p.logoUrl,
                })));
                this.cdr.detectChanges();
            });
        }

        if (isPlatformBrowser(this.platformId)) {
            const isStandalone =
                window.matchMedia('(display-mode: standalone)').matches ||
                (window.navigator as Navigator & { standalone?: boolean }).standalone ||
                document.referrer.includes('android-app://');
            this.canInstall.set(!isStandalone);

            window.addEventListener('beforeinstallprompt', (e) => {
                e.preventDefault();
                this.deferredPrompt = e as BeforeInstallPromptEvent;
                this.canInstall.set(true);
            });
        }
    }


    @HostListener('window:beforeinstallprompt', ['$event'])
    onBeforeInstallPrompt(e: Event) {
        e.preventDefault();
        this.deferredPrompt = e as BeforeInstallPromptEvent;
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
            title: 'Rádio Campos Belos Digital WEB',
            artist: 'Edmar Cardoso',
            album: 'Programação Ao Vivo · WEB',
            artwork: [
                { src: '/edimar2.png', sizes: '192x192', type: 'image/png' },
                { src: '/edimar2.png', sizes: '512x512', type: 'image/png' },
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

        this.recadosSvc.add({
            name: name || 'Ouvinte Anônimo',
            city: city || 'Nordeste Goiano',
            requestedSong: requestedSong || 'Preferida do Edmar',
            message: message || '',
        }).then(() => {
            this.recadoForm.reset({ name: '', city: '', requestedSong: '', message: '' });
            this.showToast('Recado enviado! Edmar Cardoso vai ler o seu abraço no ar.');
        }).catch(() => {
            this.showToast('Erro ao enviar recado. Verifique sua conexão e tente novamente.');
        });
    }

    likeMessage(msgId: string, event: Event) {
        event.stopPropagation();
        this.recadosSvc.like(msgId);
        this.showToast('Agradecemos a sua curtida pelo recado do companheiro!');
    }

    deleteMessage(msgId: string) {
        this.recadosSvc.delete(msgId);
        this.showToast('Recado removido do mural com sucesso.');
    }

    likeNewsDirect(newsId: number) {
        this.newsList.update((list) =>
            list.map((n) => (n.id === newsId ? { ...n, likes: n.likes + 1 } : n))
        );

        this.showToast('Você curtiu esta notícia!');
    }

    likeNews(newsId: number, event: Event) {
        event.stopPropagation();
        this.newsList.update((list) =>
            list.map((n) => (n.id === newsId ? { ...n, likes: n.likes + 1 } : n))
        );

        this.showToast('Obrigado pelo seu voto de carinho na nossa notícia!');
    }

    incrementNewsViews(news: NewsItem) {
        this.selectedNews.set(news);
        this.newsList.update((list) =>
            list.map((n) => (n.id === news.id ? { ...n, views: n.views + 1 } : n))
        );

    }

    showToast(text: string) {
        this.toastMessage.set(text);
        setTimeout(() => {
            if (this.toastMessage() === text) {
                this.toastMessage.set(null);
            }
        }, 4000);
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

        this.showToast('Grandiosa notícia publicada com sucesso e já está disponível no feed principal!');
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
            } catch (e) {
                console.error('Failed reading localStorage', e);
            }
        }
    }
}