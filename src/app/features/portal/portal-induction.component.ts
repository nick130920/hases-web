import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WorkerApiService } from '../../core/worker-api.service';
import { InductionOrgModuleEnriched } from '../../core/types';
import { MediaPlayerComponent } from '../../shared/media-player.component';
import { SignaturePadComponent } from '../../shared/signature-pad.component';

type SignatureKind = 'regulation' | 'policies' | 'contract';

@Component({
  selector: 'app-portal-induction',
  standalone: true,
  imports: [CommonModule, MediaPlayerComponent, SignaturePadComponent],
  template: `
    <header class="page-head">
      <h1 style="font-size: 1.5rem;">Inducción organizacional</h1>
      <p class="page-subtitle">
        Revisa los módulos en orden y firma cada documento al final.
      </p>
    </header>

    <p class="success" *ngIf="ok">{{ ok }}</p>
    <p class="error" *ngIf="error">{{ error }}</p>

    <article class="card" *ngFor="let m of modules()">
      <div class="card-section-head">
        <h2>
          <span class="badge badge--soft">{{ m.sort_order }}</span>
          {{ m.title }}
        </h2>
        <span
          class="badge badge--success"
          *ngIf="m.completed_at"
        >
          <span class="icon icon--sm">check_circle</span>
          Visto
        </span>
      </div>
      <p class="page-subtitle" style="line-height: 1.6; margin-bottom: 12px;">
        {{ m.body }}
      </p>

      <ng-container *ngIf="m.media?.length; else noMedia">
        <app-media-player
          *ngFor="let media of m.media"
          [media]="media"
          [src]="api.fileUrl(media.file_id)"
          (progress)="onProgress(m, $event)"
          (completed)="onCompleted(m)"
        />
      </ng-container>
      <ng-template #noMedia>
        <p class="muted">Este módulo no incluye material audiovisual.</p>
      </ng-template>

      <div class="form-actions" *ngIf="!m.completed_at">
        <button class="btn btn--ghost" (click)="markSeen(m)">
          <span class="icon icon--sm">visibility</span>
          Marcar como visto
        </button>
      </div>
    </article>

    <article class="card card--accent">
      <div class="card-section-head">
        <h2>Firmas</h2>
      </div>
      <p class="page-subtitle">
        Selecciona el documento, lee el contenido y firma con tu dedo o el mouse.
      </p>
      <div class="row" style="gap: 8px; margin: 14px 0 18px;">
        <button
          *ngFor="let kind of kinds"
          class="btn"
          [class.btn--primary]="activeSig === kind"
          [class.btn--ghost]="activeSig !== kind"
          type="button"
          (click)="activeSig = kind"
        >
          <span class="icon icon--sm">draw</span>
          {{ kindLabel(kind) }}
        </button>
      </div>
      <ng-container *ngIf="activeSig">
        <app-signature-pad
          [hint]="'Firma del ' + kindLabel(activeSig)"
          [confirmLabel]="'Enviar firma de ' + kindLabel(activeSig)"
          (signed)="signWith(activeSig, $event)"
        />
      </ng-container>
    </article>
  `,
})
export class PortalInductionComponent implements OnInit {
  protected readonly api = inject(WorkerApiService);
  modules = signal<InductionOrgModuleEnriched[]>([]);
  ok = '';
  error = '';
  kinds: SignatureKind[] = ['regulation', 'policies', 'contract'];
  activeSig: SignatureKind | '' = '';

  ngOnInit(): void {
    this.refresh();
  }

  refresh(): void {
    this.api.listInductionModules().subscribe({ next: (m) => this.modules.set(m ?? []) });
  }

  kindLabel(kind: string): string {
    return (
      { regulation: 'Reglamento interno', policies: 'Políticas', contract: 'Contrato' } as Record<
        string,
        string
      >
    )[kind] ?? kind;
  }

  onProgress(m: InductionOrgModuleEnriched, seconds: number): void {
    this.api.reportProgress(m.id, seconds).subscribe();
  }

  onCompleted(m: InductionOrgModuleEnriched): void {
    this.api.reportProgress(m.id, m.viewed_seconds ?? 0, true).subscribe({
      next: () => {
        this.ok = `Módulo "${m.title}" marcado como visto`;
        this.refresh();
      },
    });
  }

  markSeen(m: InductionOrgModuleEnriched): void {
    this.api.markProgress(m.id).subscribe({
      next: () => {
        this.ok = `Módulo "${m.title}" registrado`;
        this.refresh();
      },
    });
  }

  signWith(kind: SignatureKind, dataURI: string): void {
    this.api.uploadSignatureBase64(kind, dataURI).subscribe({
      next: () => {
        this.ok = `Firma registrada (${this.kindLabel(kind)})`;
        this.activeSig = '';
      },
      error: (e) => {
        this.error = e?.error?.error ?? 'No se pudo registrar la firma';
      },
    });
  }
}
