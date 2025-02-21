import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-status-pill',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span class="status-pill" [ngClass]="getStatusClass()">
      {{ status }}
    </span>
  `,
  styleUrl: './status-pill.component.css'
})
export class StatusPillComponent {
  @Input() status: string = '';

  getStatusClass(): string {
    switch (this.status.toLowerCase()) {
      case 'applied': return 'status-applied';
      case 'interview': return 'status-interview';
      case 'offer': return 'status-offer';
      case 'rejected': return 'status-rejected';
      case 'accepted': return 'status-accepted';
      default: return 'status-default';
    }
  }
}
