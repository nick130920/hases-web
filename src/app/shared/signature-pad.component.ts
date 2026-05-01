import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  Output,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';

// SignaturePadComponent: canvas reutilizable para firma electrónica.
// Soporta mouse y touch. Emite el data URI PNG cuando el usuario confirma.
@Component({
  selector: 'app-signature-pad',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="sigpad">
      <p class="sigpad__hint">{{ hint }}</p>
      <canvas
        #pad
        class="sigpad__canvas"
        [width]="width"
        [height]="height"
        (mousedown)="start($event)"
        (mousemove)="draw($event)"
        (mouseup)="end()"
        (mouseleave)="end()"
        (touchstart)="startTouch($event)"
        (touchmove)="moveTouch($event)"
        (touchend)="end()"
      ></canvas>
      <div class="sigpad__actions">
        <button type="button" class="btn btn--ghost" (click)="clear()" [disabled]="empty">
          Limpiar
        </button>
        <button type="button" class="btn btn--primary" (click)="confirm()" [disabled]="empty">
          {{ confirmLabel }}
        </button>
      </div>
    </div>
  `,
  styles: [
    `
      .sigpad__canvas {
        width: 100%;
        max-width: 480px;
        border: 1px dashed var(--color-outline);
        border-radius: var(--radius-sm);
        background: #fff;
        touch-action: none;
        cursor: crosshair;
      }
      .sigpad__hint {
        margin: 0 0 8px;
        color: var(--color-on-surface-secondary);
        font-size: 0.875rem;
      }
      .sigpad__actions {
        margin-top: 10px;
        display: flex;
        gap: 8px;
      }
    `,
  ],
})
export class SignaturePadComponent implements AfterViewInit {
  @ViewChild('pad') padRef!: ElementRef<HTMLCanvasElement>;
  @Input() width = 480;
  @Input() height = 180;
  @Input() hint = 'Firme con el dedo o el mouse en el recuadro.';
  @Input() confirmLabel = 'Firmar';
  @Output() readonly signed = new EventEmitter<string>();

  private ctx!: CanvasRenderingContext2D;
  private drawing = false;
  empty = true;

  ngAfterViewInit(): void {
    const canvas = this.padRef.nativeElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    this.ctx = ctx;
    this.ctx.lineWidth = 2;
    this.ctx.lineCap = 'round';
    this.ctx.strokeStyle = '#0e5e54';
  }

  start(e: MouseEvent): void {
    this.drawing = true;
    this.empty = false;
    const { x, y } = this.toCanvasCoords(e.clientX, e.clientY);
    this.ctx.beginPath();
    this.ctx.moveTo(x, y);
  }

  draw(e: MouseEvent): void {
    if (!this.drawing) return;
    const { x, y } = this.toCanvasCoords(e.clientX, e.clientY);
    this.ctx.lineTo(x, y);
    this.ctx.stroke();
  }

  startTouch(e: TouchEvent): void {
    e.preventDefault();
    if (!e.touches[0]) return;
    this.drawing = true;
    this.empty = false;
    const { x, y } = this.toCanvasCoords(e.touches[0].clientX, e.touches[0].clientY);
    this.ctx.beginPath();
    this.ctx.moveTo(x, y);
  }

  moveTouch(e: TouchEvent): void {
    e.preventDefault();
    if (!this.drawing || !e.touches[0]) return;
    const { x, y } = this.toCanvasCoords(e.touches[0].clientX, e.touches[0].clientY);
    this.ctx.lineTo(x, y);
    this.ctx.stroke();
  }

  end(): void {
    this.drawing = false;
  }

  clear(): void {
    const canvas = this.padRef.nativeElement;
    this.ctx.clearRect(0, 0, canvas.width, canvas.height);
    this.empty = true;
  }

  confirm(): void {
    if (this.empty) return;
    this.signed.emit(this.padRef.nativeElement.toDataURL('image/png'));
  }

  private toCanvasCoords(clientX: number, clientY: number): { x: number; y: number } {
    const rect = this.padRef.nativeElement.getBoundingClientRect();
    const scaleX = this.padRef.nativeElement.width / rect.width;
    const scaleY = this.padRef.nativeElement.height / rect.height;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  }
}
