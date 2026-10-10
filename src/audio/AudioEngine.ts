import { type Camera, Vector3 } from "three";
import { MUSIC_TRACKS, type MusicTrack } from "../story/keyframes";
import {
	audioUrl,
	fallbackUrl,
	LOOPS,
	type LoopId,
	musicFile,
	SFX,
	type SfxId,
} from "./sounds";

export interface AudioMix {
	music: Record<MusicTrack, number>;
	/** 0 — день, 1 — ночь */
	night: number;
	/** Сила ветра 0..1 */
	wind: number;
	/** Позиция избушки (источник скрипа) */
	hut: Vector3;
}

interface MusicChannel {
	element: HTMLAudioElement;
	gain: GainNode;
}

interface PlayOptions {
	volume?: number;
	refDistance?: number;
	rolloff?: number;
}

/** Постоянная времени сглаживания громкости, секунды. */
const FADE = 0.8;
const MASTER = 0.9;
const CRACKS: SfxId[] = [
	"sfx-crack-1",
	"sfx-crack-2",
	"sfx-crack-3",
	"sfx-crack-4",
];

function random(min: number, max: number) {
	return min + Math.random() * (max - min);
}

function pick<T>(items: T[]): T {
	return items[Math.floor(Math.random() * items.length)];
}

/**
 * Звук сцены на Web Audio: музыка (потоково, через <audio>), эмбиент-петли
 * (буферы) и разовые позиционные звуки — треск деревьев, скрип избы, сова.
 * AudioContext создаётся только из обработчика клика (политика автозапуска).
 */
export class AudioEngine {
	private ctx: AudioContext | null = null;
	private master: GainNode | null = null;
	private music = new Map<MusicTrack, MusicChannel>();
	private loops = new Map<LoopId, GainNode>();
	private buffers = new Map<SfxId, AudioBuffer>();
	private running = false;
	private loaded = false;
	private next = { crack: 0, hut: 0, owl: 0 };
	private forward = new Vector3();

	get isRunning() {
		return this.running;
	}

	/** Вызывать синхронно из обработчика клика. */
	start() {
		if (!this.ctx) {
			this.ctx = new AudioContext();
			this.master = this.ctx.createGain();
			this.master.gain.value = 0;
			this.master.connect(this.ctx.destination);
			this.createMusic();
			document.addEventListener("visibilitychange", this.onVisibility);
		}
		const { ctx, master } = this;
		if (!master) return;
		void ctx.resume();
		// разблокируем <audio> в рамках жеста (iOS Safari)
		for (const { element } of this.music.values()) {
			element.play().then(
				() => {
					if (!this.running) element.pause();
				},
				() => {},
			);
		}
		master.gain.setTargetAtTime(MASTER, ctx.currentTime, 0.5);
		this.running = true;
		const now = ctx.currentTime;
		this.next = {
			crack: now + random(3, 8),
			hut: now + random(2, 5),
			owl: now + random(10, 20),
		};
		if (!this.loaded) {
			this.loaded = true;
			void this.loadBuffers();
		}
	}

	stop() {
		const { ctx, master } = this;
		this.running = false;
		if (!ctx || !master) return;
		master.gain.setTargetAtTime(0, ctx.currentTime, 0.2);
		window.setTimeout(() => {
			if (this.running) return;
			for (const { element } of this.music.values()) element.pause();
			void ctx.suspend();
		}, 800);
	}

	/** Раз в кадр: громкости по таймлайну, слушатель = камера, случайные звуки. */
	update(mix: AudioMix, camera: Camera) {
		const { ctx } = this;
		if (!ctx || !this.running || ctx.state !== "running") return;
		const now = ctx.currentTime;

		for (const track of MUSIC_TRACKS) {
			const channel = this.music.get(track);
			if (!channel) continue;
			const target = mix.music[track];
			channel.gain.gain.setTargetAtTime(target, now, FADE);
			if (target > 0.01 && channel.element.paused) {
				channel.element.play().catch(() => {});
			} else if (
				target <= 0.01 &&
				!channel.element.paused &&
				channel.gain.gain.value < 0.005
			) {
				channel.element.pause();
			}
		}

		const loopTargets: Record<LoopId, number> = {
			"amb-forest-day": (1 - mix.night) * 0.55,
			"amb-crickets": mix.night * 0.4,
			"amb-wind": 0.08 + mix.wind * 0.35,
		};
		for (const [id, gain] of this.loops) {
			gain.gain.setTargetAtTime(loopTargets[id], now, FADE);
		}

		this.updateListener(camera, now);
		this.scheduleOneShots(mix, camera.position, now);
	}

	private createMusic() {
		const { ctx, master } = this;
		if (!ctx || !master) return;
		for (const track of MUSIC_TRACKS) {
			const element = new Audio();
			element.src = audioUrl(musicFile(track));
			element.loop = true;
			element.preload = "none";
			element.onerror = () => {
				// браузер не осилил Opus — пробуем MP3
				const mp3 = fallbackUrl(musicFile(track));
				if (!element.src.endsWith(".mp3")) element.src = mp3;
			};
			const gain = ctx.createGain();
			gain.gain.value = 0;
			ctx.createMediaElementSource(element).connect(gain).connect(master);
			this.music.set(track, { element, gain });
		}
	}

	private async loadBuffer(name: string): Promise<AudioBuffer> {
		const ctx = this.ctx as AudioContext;
		for (const url of [audioUrl(name), fallbackUrl(name)]) {
			try {
				const response = await fetch(url);
				return await ctx.decodeAudioData(await response.arrayBuffer());
			} catch {
				// пробуем следующий формат
			}
		}
		throw new Error(`Не удалось загрузить звук ${name}`);
	}

	private async loadBuffers() {
		const { ctx, master } = this;
		if (!ctx || !master) return;
		await Promise.all([
			...LOOPS.map(async (id) => {
				const buffer = await this.loadBuffer(id);
				const source = ctx.createBufferSource();
				source.buffer = buffer;
				source.loop = true;
				const gain = ctx.createGain();
				gain.gain.value = 0;
				source.connect(gain).connect(master);
				// петли стартуют со случайного места — повтор менее заметен
				source.start(0, Math.random() * buffer.duration);
				this.loops.set(id, gain);
			}),
			...SFX.map(async (id) => {
				this.buffers.set(id, await this.loadBuffer(id));
			}),
		]).catch((error: unknown) => console.warn("[audio]", error));
	}

	private updateListener(camera: Camera, now: number) {
		const listener = (this.ctx as AudioContext).listener;
		camera.getWorldDirection(this.forward);
		const { x, y, z } = camera.position;
		const f = this.forward;
		if (listener.positionX) {
			listener.positionX.setTargetAtTime(x, now, 0.05);
			listener.positionY.setTargetAtTime(y, now, 0.05);
			listener.positionZ.setTargetAtTime(z, now, 0.05);
			listener.forwardX.setTargetAtTime(f.x, now, 0.05);
			listener.forwardY.setTargetAtTime(f.y, now, 0.05);
			listener.forwardZ.setTargetAtTime(f.z, now, 0.05);
			listener.upX.value = 0;
			listener.upY.value = 1;
			listener.upZ.value = 0;
		} else {
			// старые Safari / Firefox
			listener.setPosition(x, y, z);
			listener.setOrientation(f.x, f.y, f.z, 0, 1, 0);
		}
	}

	private scheduleOneShots(mix: AudioMix, listener: Vector3, now: number) {
		// треск и скрип стволов в лесу вокруг слушателя: чаще при сильном ветре
		if (now >= this.next.crack) {
			const angle = Math.random() * Math.PI * 2;
			const distance = random(12, 30);
			const id = Math.random() < 0.35 ? "sfx-tree-creak" : pick(CRACKS);
			this.playAt(
				id,
				new Vector3(
					listener.x + Math.cos(angle) * distance,
					random(3, 9),
					listener.z + Math.sin(angle) * distance,
				),
				{ volume: random(0.5, 1), refDistance: 8 },
			);
			this.next.crack = now + random(5, 14) / (0.4 + mix.wind);
		}
		// изба поскрипывает на своих ногах — слышно, только когда камера рядом
		if (now >= this.next.hut) {
			this.playAt(
				pick<SfxId>(["sfx-hut-creak-1", "sfx-hut-creak-2"]),
				mix.hut,
				{
					volume: random(0.6, 1),
					refDistance: 4,
					rolloff: 1.6,
				},
			);
			this.next.hut = now + random(4, 10);
		}
		// сова — только ночью, далеко в чаще
		if (now >= this.next.owl) {
			if (mix.night > 0.6) {
				const angle = Math.random() * Math.PI * 2;
				this.playAt(
					"sfx-owl",
					new Vector3(Math.cos(angle) * 40, 14, Math.sin(angle) * 40),
					{ volume: 0.7, refDistance: 15 },
				);
			}
			this.next.owl = now + random(18, 40);
		}
	}

	private playAt(
		id: SfxId,
		position: Vector3,
		{ volume = 1, refDistance = 6, rolloff = 1 }: PlayOptions,
	) {
		const { ctx, master } = this;
		const buffer = this.buffers.get(id);
		if (!ctx || !master || !buffer) return;
		const source = ctx.createBufferSource();
		source.buffer = buffer;
		source.playbackRate.value = random(0.85, 1.1);
		const gain = ctx.createGain();
		gain.gain.value = volume;
		const panner = new PannerNode(ctx, {
			panningModel: "HRTF",
			distanceModel: "inverse",
			refDistance,
			rolloffFactor: rolloff,
			maxDistance: 120,
			positionX: position.x,
			positionY: position.y,
			positionZ: position.z,
		});
		source.connect(gain).connect(panner).connect(master);
		source.start();
	}

	private onVisibility = () => {
		if (!this.ctx || !this.running) return;
		if (document.hidden) void this.ctx.suspend();
		else void this.ctx.resume();
	};
}

export const audioEngine = new AudioEngine();
