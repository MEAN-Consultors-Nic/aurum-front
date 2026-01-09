import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { NotificationsApiService } from '../../core/services/notifications-api.service';
import { PlannedIncomeOccurrence } from '../../core/models/planned-income.model';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="space-y-6">
      <div>
        <div class="text-2xl font-semibold">Notifications</div>
        <div class="text-sm text-slate-500">Pending items that need attention</div>
      </div>

      <div class="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm lg:grid-cols-4">
        <div>
          <label class="text-xs font-semibold uppercase tracking-wide text-slate-500">Month</label>
          <input
            type="month"
            [(ngModel)]="selectedMonth"
            class="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
        </div>
        <div class="lg:col-span-3 flex items-end">
          <button
            class="w-full rounded bg-slate-900 px-3 py-2 text-xs uppercase tracking-wide text-white"
            (click)="load()"
          >
            Refresh
          </button>
        </div>
      </div>

      <div class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div class="flex items-center justify-between">
          <div class="text-sm font-semibold text-slate-800">Planned income alerts</div>
          <a routerLink="/planned-income" class="text-xs text-slate-600">Open planner</a>
        </div>
        <div *ngIf="isLoading" class="mt-3 text-sm text-slate-500">Loading...</div>
        <table *ngIf="!isLoading" class="mt-3 w-full text-sm">
          <thead class="text-left text-xs uppercase tracking-wide text-slate-400">
            <tr>
              <th class="py-2">Date</th>
              <th class="py-2">Name</th>
              <th class="py-2">Account</th>
              <th class="py-2">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let item of plannedIncomeAlerts" class="border-t border-slate-100">
              <td class="py-3">{{ formatDate(item.date) }}</td>
              <td class="py-3">{{ resolvePlannedName(item) }}</td>
              <td class="py-3">{{ resolveAccountName(item) }}</td>
              <td class="py-3">{{ formatMoney(item.amount, item.currency) }}</td>
            </tr>
            <tr *ngIf="plannedIncomeAlerts.length === 0 && !isLoading">
              <td colspan="4" class="py-4 text-center text-sm text-slate-500">No alerts</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `,
})
export class NotificationsComponent implements OnInit {
  plannedIncomeAlerts: PlannedIncomeOccurrence[] = [];
  selectedMonth = new Date().toISOString().slice(0, 7);
  isLoading = false;

  constructor(private readonly notificationsApi: NotificationsApiService) {}

  ngOnInit() {
    this.load();
  }

  load() {
    this.isLoading = true;
    this.notificationsApi.getNotifications(this.selectedMonth).subscribe({
      next: (data) => {
        this.plannedIncomeAlerts = data.plannedIncome?.items ?? [];
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
      },
    });
  }

  resolveAccountName(item: PlannedIncomeOccurrence) {
    const account = item.accountId as { _id: string; name: string } | string;
    return typeof account === 'string' ? account : account?.name || '';
  }

  resolvePlannedName(item: PlannedIncomeOccurrence) {
    const planned = item.plannedIncomeId as { _id: string; name: string } | string;
    return typeof planned === 'string' ? planned : planned?.name || '';
  }

  formatDate(value?: string) {
    if (!value) {
      return '-';
    }
    return new Date(value).toLocaleDateString();
  }

  formatMoney(amount: number, currency: 'USD' | 'NIO') {
    return `${currency} ${amount.toFixed(2)}`;
  }
}
