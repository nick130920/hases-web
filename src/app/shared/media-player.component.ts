import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { InductionOrgMedia } from '../core/types';

// MediaPlayerComponent: reproductor unificado para los recursos de inducción.
// Para videos, emite `progress` (segundos vistos) cada 10 segundos.
@Component({
  selector: 'app-media-player',
  standalone: true,
  imports: [CommonModule],
  template: `
    <article class="media-player" *ngIf="media as m">
      <header>
        <strong>{{ m.title || m.kind }}</strong>
        <span class="badge badge--soft">{{ m.kind }}</span>
      </header>

      <video
        *ngIf="m.kind === 'video'"
        [src]="src"
        controls
        preload="metadata"
        (timeupdate)="onTimeUpdate($event)"
        (ended)="onEnded()"
      ></video>

      <audio *ngIf="m.kind === 'audio'" [src]="src" controls></audio>

      <img *ngIf="m.kind === 'image'" [src]="src" [alt]="m.title" class="media-player__img" />

      <p *ngIf="m.kind === 'pdf'">
        <a [href]="src" target="_blank" rel="noopener">Abrir documento PDF</a>
      </p>
    </article>
  `,
  styles: [
    `
      .media-player {
        background: var(--color-surface-elevated);
        border: 1px solid var(--color-outline);
        border-radius: var(--radius-sm);
        padding: 12px;
        margin-bottom: 12px;
      }
      .media-player header {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 8px;
      }
      .media-player video,
      .media-player audio {
        width: 100%;
        max-height: 480px;
      }
      .media-player__img {
        max-width: 100%;
        height: auto;
        display: block;
      }
    `,
  ],
})
export class MediaPlayerComponent {
  @Input({ required: true }) media!: InductionOrgMedia;
  @Input({ required: true }) src!: string;
  @Output() readonly progress = new EventEmitter<number>();
  @Output() readonly completed = new EventEmitter<void>();

  private lastReported = 0;

  onTimeUpdate(ev: Event): void {
    const v = ev.target as HTMLVideoElement;
    const cur = Math.floor(v.currentTime);
    if (cur - this.lastReported >= 10) {
      this.lastReported = cur;
      this.progress.emit(cur);
    }
  }

  onEnded(): void {
    this.completed.emit();
  }
}
