import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FinanceApiService } from '../../core/services/finance-api.service';
import { ReportsApiService } from '../../core/services/reports-api.service';
import { ContractsApiService } from '../../core/services/contracts-api.service';
import { PlannedIncomesApiService } from '../../core/services/planned-incomes-api.service';
import { NotificationsApiService } from '../../core/services/notifications-api.service';
import { RecurringExpensesApiService } from '../../core/services/recurring-expenses-api.service';
import { DashboardOverview } from '../../core/models/dashboard.model';
import { ContractItem } from '../../core/models/contract.model';
import {
  FinanceByCategoryItem,
  FinanceByClientItem,
  FinanceByContractItem,
  FinanceOverview,
} from '../../core/models/finance.model';
import { PlannedIncomeAlerts, PlannedIncomeSummary } from '../../core/models/planned-income.model';
import { BudgetAlertItem } from '../../core/models/recurring-expense.model';
import { TrendItem } from '../../core/models/report.model';
import { RecurringExpenseOccurrence } from '../../core/models/recurring-expense.model';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="space-y-6">
      <div>
        <div class="text-2xl font-semibold">Dashboard</div>
        <div class="text-sm text-slate-500">General overview</div>
      </div>

      <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div class="text-xs uppercase tracking-wide text-slate-500">Total receivable</div>
          <div class="text-2xl font-semibold text-slate-900">
            {{ formatMoney(overview?.totalReceivableUsd || 0, 'USD') }}
          </div>
          <div class="text-xs text-slate-500">
            {{ formatMoney(overview?.totalReceivableNio || 0, 'NIO') }}
          </div>
        </div>
        <div class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div class="text-xs uppercase tracking-wide text-slate-500">Paid this month</div>
          <div class="text-2xl font-semibold text-slate-900">
            {{ formatMoney(overview?.totalPaidThisMonthUsd || 0, 'USD') }}
          </div>
          <div class="text-xs text-slate-500">
            {{ formatMoney(overview?.totalPaidThisMonthNio || 0, 'NIO') }}
          </div>
        </div>
        <div class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div class="text-xs uppercase tracking-wide text-slate-500">Overdue contracts</div>
          <div class="text-2xl font-semibold text-slate-900">
            {{ overview?.overdueCount || 0 }}
          </div>
        </div>
        <div class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div class="text-xs uppercase tracking-wide text-slate-500">Due in 30 days</div>
          <div class="text-2xl font-semibold text-slate-900">
            {{ overview?.dueNext30Days || 0 }}
          </div>
        </div>
      </div>

      <div class="space-y-3">
        <div>
          <div class="text-sm font-semibold text-slate-800">Receivables</div>
          <div class="text-xs text-slate-500">Due soon versus overdue contracts</div>
        </div>
        <div class="grid gap-4 lg:grid-cols-2">
          <div class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div class="text-sm font-semibold text-slate-800">Due soon</div>
            <div *ngIf="isLoadingDue" class="mt-3 text-sm text-slate-500">Loading...</div>
            <table *ngIf="!isLoadingDue" class="mt-3 w-full text-sm">
              <thead class="text-left text-xs uppercase tracking-wide text-slate-400">
                <tr>
                  <th class="py-2">Client</th>
                  <th class="py-2">Service</th>
                  <th class="py-2">Balance</th>
                  <th class="py-2">Due</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let item of dueSoon" class="border-t border-slate-100">
                  <td class="py-3">{{ getClientName(item) }}</td>
                  <td class="py-3">{{ getServiceName(item) }}</td>
                  <td class="py-3">{{ formatMoney(item.balance || 0, item.currency || 'USD') }}</td>
                  <td class="py-3">{{ formatDate(item.endDate) }}</td>
                </tr>
                <tr *ngIf="dueSoon.length === 0 && !isLoadingDue">
                  <td colspan="4" class="py-4 text-center text-sm text-slate-500">No data</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div class="text-sm font-semibold text-slate-800">Overdue</div>
            <div *ngIf="isLoadingOverdue" class="mt-3 text-sm text-slate-500">Loading...</div>
            <table *ngIf="!isLoadingOverdue" class="mt-3 w-full text-sm">
              <thead class="text-left text-xs uppercase tracking-wide text-slate-400">
                <tr>
                  <th class="py-2">Client</th>
                  <th class="py-2">Service</th>
                  <th class="py-2">Balance</th>
                  <th class="py-2">Due</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let item of overdue" class="border-t border-slate-100">
                  <td class="py-3">{{ getClientName(item) }}</td>
                  <td class="py-3">{{ getServiceName(item) }}</td>
                  <td class="py-3">{{ formatMoney(item.balance || 0, item.currency || 'USD') }}</td>
                  <td class="py-3">{{ formatDate(item.endDate) }}</td>
                </tr>
                <tr *ngIf="overdue.length === 0 && !isLoadingOverdue">
                  <td colspan="4" class="py-4 text-center text-sm text-slate-500">No data</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div class="space-y-4">
        <div>
          <div class="text-sm font-semibold text-slate-800">Cashflow snapshot</div>
          <div class="text-xs text-slate-500">Balances, planned income, and alerts</div>
        </div>
        <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <div class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div class="text-xs uppercase tracking-wide text-slate-500">Total balance</div>
            <div class="mt-3 space-y-2 text-sm text-slate-600">
              <div class="flex items-center justify-between">
                <span>USD</span>
                <span class="text-base font-semibold text-slate-900">
                  {{ formatMoney(financeOverview?.balanceUsd || 0, 'USD') }}
                </span>
              </div>
              <div class="flex items-center justify-between">
                <span>NIO</span>
                <span class="text-base font-semibold text-slate-900">
                  {{ formatMoney(financeOverview?.balanceNio || 0, 'NIO') }}
                </span>
              </div>
            </div>
          </div>

          <div class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div class="text-xs uppercase tracking-wide text-slate-500">Planned income (month)</div>
            <div class="mt-2 text-lg font-semibold text-slate-900">
              {{ formatMoney(plannedSummary?.totals?.plannedUsd ?? 0, 'USD') }}
              / {{ formatMoney(plannedSummary?.totals?.plannedNio ?? 0, 'NIO') }}
            </div>
            <div class="text-xs text-slate-500">
              Confirmed: {{ formatMoney(plannedSummary?.totals?.confirmedUsd ?? 0, 'USD') }}
              / {{ formatMoney(plannedSummary?.totals?.confirmedNio ?? 0, 'NIO') }}
            </div>
          </div>

          <div class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div class="text-xs uppercase tracking-wide text-slate-500">Recurring expenses (month)</div>
            <div class="mt-2 text-lg font-semibold text-slate-900">
              {{ formatMoney(recurringPlannedTotal('USD'), 'USD') }}
              / {{ formatMoney(recurringPlannedTotal('NIO'), 'NIO') }}
            </div>
            <div class="text-xs text-slate-500">Planned recurring charges</div>
          </div>

          <div class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div class="text-xs uppercase tracking-wide text-slate-500">Overdue planned income</div>
            <div class="text-2xl font-semibold text-slate-900">
              {{ plannedAlerts?.count || 0 }}
            </div>
          </div>

          <div class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div class="text-xs uppercase tracking-wide text-slate-500">Overdue recurring expenses</div>
            <div class="text-2xl font-semibold text-slate-900">
              {{ overdueRecurringCount() }}
            </div>
          </div>

          <div class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div class="text-xs uppercase tracking-wide text-slate-500">Budget alerts</div>
            <div class="text-2xl font-semibold text-slate-900">{{ budgetAlerts.length }}</div>
            <div class="text-xs text-slate-500" *ngIf="budgetAlerts.length === 0">
              No alerts
            </div>
            <div class="text-xs text-slate-500" *ngIf="budgetAlerts.length > 0">
              {{ budgetAlerts[0].categoryName }} ·
              {{ (budgetAlerts[0].usage * 100).toFixed(0) }}% used
            </div>
          </div>
        </div>

        <div class="space-y-3">
          <div class="text-sm font-semibold text-slate-800">Trends (last 6 months)</div>
          <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div class="text-xs uppercase tracking-wide text-slate-500">Total receivable (USD)</div>
              <div class="text-lg font-semibold text-slate-900">
                {{ formatMoney(lastTrendReceivableUsd(), 'USD') }}
              </div>
              <svg viewBox="0 0 160 56" class="mt-3 h-14 w-full">
                <polyline
                  [attr.points]="buildSparkline(receivableUsdSeries())"
                  fill="none"
                  stroke="#0f172a"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </div>

            <div class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div class="text-xs uppercase tracking-wide text-slate-500">Paid this month (USD)</div>
              <div class="text-lg font-semibold text-slate-900">
                {{ formatMoney(lastTrendPaidUsd(), 'USD') }}
              </div>
              <svg viewBox="0 0 160 56" class="mt-3 h-14 w-full">
                <polyline
                  [attr.points]="buildSparkline(paidUsdSeries())"
                  fill="none"
                  stroke="#0ea5e9"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </div>

            <div class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div class="text-xs uppercase tracking-wide text-slate-500">Balance USD</div>
              <div class="text-lg font-semibold text-slate-900">
                {{ formatMoney(lastTrendBalanceUsd(), 'USD') }}
              </div>
              <svg viewBox="0 0 160 56" class="mt-3 h-14 w-full">
                <polyline
                  [attr.points]="buildSparkline(balanceUsdSeries())"
                  fill="none"
                  stroke="#22c55e"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </div>

            <div class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div class="text-xs uppercase tracking-wide text-slate-500">Balance NIO</div>
              <div class="text-lg font-semibold text-slate-900">
                {{ formatMoney(lastTrendBalanceNio(), 'NIO') }}
              </div>
              <svg viewBox="0 0 160 56" class="mt-3 h-14 w-full">
                <polyline
                  [attr.points]="buildSparkline(balanceNioSeries())"
                  fill="none"
                  stroke="#f97316"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </div>
          </div>
        </div>

        <div class="grid gap-4 lg:grid-cols-3">
          <div class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div class="text-sm font-semibold text-slate-800">Top expenses this month</div>
            <table class="mt-3 w-full text-sm">
              <thead class="text-left text-xs uppercase tracking-wide text-slate-400">
                <tr>
                  <th class="py-2">Category</th>
                  <th class="py-2">Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let item of topExpenses" class="border-t border-slate-100">
                  <td class="py-2">{{ item.categoryName }}</td>
                  <td class="py-2">{{ formatMoney(item.total, item.currency) }}</td>
                </tr>
                <tr *ngIf="topExpenses.length === 0">
                  <td colspan="2" class="py-4 text-center text-sm text-slate-500">No data</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div class="text-sm font-semibold text-slate-800">Income by client</div>
            <table class="mt-3 w-full text-sm">
              <thead class="text-left text-xs uppercase tracking-wide text-slate-400">
                <tr>
                  <th class="py-2">Client</th>
                  <th class="py-2">Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let item of topClients" class="border-t border-slate-100">
                  <td class="py-2">{{ item.clientName || item.clientId }}</td>
                  <td class="py-2">{{ formatMoney(item.total, item.currency) }}</td>
                </tr>
                <tr *ngIf="topClients.length === 0">
                  <td colspan="2" class="py-4 text-center text-sm text-slate-500">No data</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div class="text-sm font-semibold text-slate-800">Income by project</div>
            <table class="mt-3 w-full text-sm">
              <thead class="text-left text-xs uppercase tracking-wide text-slate-400">
                <tr>
                  <th class="py-2">Project</th>
                  <th class="py-2">Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let item of topContracts" class="border-t border-slate-100">
                  <td class="py-2">{{ item.contractTitle || item.contractId }}</td>
                  <td class="py-2">{{ formatMoney(item.total, item.currency) }}</td>
                </tr>
                <tr *ngIf="topContracts.length === 0">
                  <td colspan="2" class="py-4 text-center text-sm text-slate-500">No data</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class DashboardComponent implements OnInit {
  overview: DashboardOverview | null = null;
  financeOverview: FinanceOverview | null = null;
  plannedSummary: PlannedIncomeSummary | null = null;
  plannedAlerts: PlannedIncomeAlerts | null = null;
  budgetAlerts: BudgetAlertItem[] = [];
  trends: TrendItem[] = [];
  recurringOccurrences: RecurringExpenseOccurrence[] = [];
  topExpenses: FinanceByCategoryItem[] = [];
  topClients: FinanceByClientItem[] = [];
  topContracts: FinanceByContractItem[] = [];
  dueSoon: ContractItem[] = [];
  overdue: ContractItem[] = [];
  isLoadingDue = false;
  isLoadingOverdue = false;

  constructor(
    private readonly reportsApi: ReportsApiService,
    private readonly contractsApi: ContractsApiService,
    private readonly financeApi: FinanceApiService,
    private readonly plannedIncomesApi: PlannedIncomesApiService,
    private readonly notificationsApi: NotificationsApiService,
    private readonly recurringExpensesApi: RecurringExpensesApiService,
  ) {}

  ngOnInit() {
    this.loadOverview();
    this.loadDueLists();
    this.loadFinanceSnapshot();
    this.loadPlannedIncome();
    this.loadBudgetAlerts();
    this.loadTrends();
    this.loadRecurringExpenses();
  }

  loadOverview() {
    this.reportsApi.dashboardOverview().subscribe({
      next: (data) => {
        this.overview = data;
      },
    });
  }

  loadDueLists() {
    const today = new Date();
    const dueFrom = this.toDateInput(today);
    const dueTo = this.toDateInput(new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000));

    this.isLoadingDue = true;
    this.contractsApi
      .list({ dueFrom, dueTo, limit: 10 })
      .subscribe({
        next: (response) => {
          this.dueSoon = response.items.filter((item) => (item.balance || 0) > 0);
          this.isLoadingDue = false;
        },
        error: () => {
          this.isLoadingDue = false;
        },
      });

    this.isLoadingOverdue = true;
    this.contractsApi
      .list({ dueTo: this.toDateInput(today), limit: 10 })
      .subscribe({
        next: (response) => {
          this.overdue = response.items.filter((item) => (item.balance || 0) > 0);
          this.isLoadingOverdue = false;
        },
        error: () => {
          this.isLoadingOverdue = false;
        },
      });
  }

  loadFinanceSnapshot() {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    this.financeApi.overview().subscribe({
      next: (data) => {
        this.financeOverview = data;
      },
    });

    this.financeApi.byCategory({ month, year }).subscribe({
      next: (items) => {
        this.topExpenses = items
          .filter((item) => item.total > 0)
          .sort((a, b) => b.total - a.total)
          .slice(0, 5);
      },
    });

    this.financeApi.byClient().subscribe({
      next: (items) => {
        this.topClients = items
          .filter((item) => item.total > 0)
          .sort((a, b) => b.total - a.total)
          .slice(0, 5);
      },
    });

    this.financeApi.byContract().subscribe({
      next: (items) => {
        this.topContracts = items
          .filter((item) => item.total > 0)
          .sort((a, b) => b.total - a.total)
          .slice(0, 5);
      },
    });
  }

  loadPlannedIncome() {
    const month = new Date().toISOString().slice(0, 7);
    this.plannedIncomesApi.summary(month).subscribe({
      next: (data) => (this.plannedSummary = data),
    });
    this.plannedIncomesApi.alerts(month).subscribe({
      next: (data) => (this.plannedAlerts = data),
    });
  }

  loadBudgetAlerts() {
    const month = new Date().toISOString().slice(0, 7);
    this.notificationsApi.getNotifications(month).subscribe({
      next: (data) => {
        this.budgetAlerts = data.budget?.items ?? [];
      },
    });
  }

  loadTrends() {
    this.reportsApi.trends(6).subscribe({
      next: (items) => {
        this.trends = items;
      },
    });
  }

  loadRecurringExpenses() {
    const month = new Date().toISOString().slice(0, 7);
    this.recurringExpensesApi.occurrences(month).subscribe({
      next: (items) => {
        this.recurringOccurrences = items;
      },
    });
  }

  buildSparkline(values: number[]) {
    const width = 160;
    const height = 56;
    const padding = 6;
    if (values.length === 0) {
      return '';
    }
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    const step = values.length > 1 ? (width - padding * 2) / (values.length - 1) : 0;
    return values
      .map((value, index) => {
        const x = padding + index * step;
        const y = height - padding - ((value - min) / range) * (height - padding * 2);
        return `${x},${y}`;
      })
      .join(' ');
  }

  recurringPlannedTotal(currency: 'USD' | 'NIO') {
    return this.recurringOccurrences
      .filter((item) => item.currency === currency && item.status !== 'omitted')
      .reduce((sum, item) => sum + (item.amount ?? 0), 0);
  }

  overdueRecurringCount() {
    const today = new Date();
    return this.recurringOccurrences.filter(
      (item) => item.status === 'planned' && new Date(item.date) < today,
    ).length;
  }

  receivableUsdSeries() {
    return this.trends.map((item) => item.totalReceivableUsd ?? 0);
  }

  paidUsdSeries() {
    return this.trends.map((item) => item.totalPaidUsd ?? 0);
  }

  balanceUsdSeries() {
    return this.trends.map((item) => item.balanceUsd ?? 0);
  }

  balanceNioSeries() {
    return this.trends.map((item) => item.balanceNio ?? 0);
  }

  lastTrendReceivableUsd() {
    if (this.trends.length === 0) {
      return 0;
    }
    return this.trends[this.trends.length - 1].totalReceivableUsd ?? 0;
  }

  lastTrendPaidUsd() {
    if (this.trends.length === 0) {
      return 0;
    }
    return this.trends[this.trends.length - 1].totalPaidUsd ?? 0;
  }

  lastTrendBalanceUsd() {
    if (this.trends.length === 0) {
      return 0;
    }
    return this.trends[this.trends.length - 1].balanceUsd ?? 0;
  }

  lastTrendBalanceNio() {
    if (this.trends.length === 0) {
      return 0;
    }
    return this.trends[this.trends.length - 1].balanceNio ?? 0;
  }

  getClientName(item: ContractItem) {
    if (typeof item.clientId === 'string') {
      return item.clientId;
    }
    return item.clientId?.name ?? '-';
  }

  getServiceName(item: ContractItem) {
    if (typeof item.serviceId === 'string') {
      return item.serviceId;
    }
    return item.serviceId?.name ?? '-';
  }

  formatDate(date?: string) {
    if (!date) {
      return '-';
    }
    return new Date(date).toLocaleDateString('en-US');
  }

  formatMoney(amount: number, currency: 'USD' | 'NIO' = 'USD') {
    const value = Number(amount ?? 0).toFixed(2);
    return `${currency} ${value}`;
  }

  private toDateInput(date: Date) {
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${date.getFullYear()}-${month}-${day}`;
  }
}
