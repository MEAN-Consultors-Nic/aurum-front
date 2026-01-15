import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AccountsApiService } from '../../core/services/accounts-api.service';
import { ConfirmService } from '../../core/services/confirm.service';
import { AccountItem } from '../../core/models/account.model';

@Component({
  selector: 'app-accounts',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <div>
          <div class="text-2xl font-semibold">Accounts</div>
          <div class="text-sm text-slate-500">Manage your bank accounts and wallets</div>
        </div>
        <button
          class="rounded bg-slate-900 px-3 py-2 text-xs uppercase tracking-wide text-white"
          (click)="openCreate()"
        >
          New account
        </button>
      </div>

      <div class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div *ngIf="isLoading" class="text-sm text-slate-500">Loading accounts...</div>
        <div *ngIf="error" class="text-sm text-red-600">{{ error }}</div>

        <div *ngIf="!isLoading && accounts.length === 0" class="py-6 text-center text-sm text-slate-500">
          No accounts found
        </div>

        <div *ngIf="!isLoading && accounts.length > 0" class="space-y-8">
          <div>
            <div class="flex items-center justify-between">
              <div class="text-sm font-semibold text-slate-800">Bank accounts</div>
              <div class="text-xs text-slate-400">{{ bankAccounts.length }} total</div>
            </div>
            <div *ngIf="bankAccounts.length === 0" class="mt-3 text-sm text-slate-500">
              No bank accounts yet.
            </div>
            <div *ngFor="let group of bankGroups" class="mt-4">
              <div class="text-xs uppercase tracking-wide text-slate-400">{{ group.bankName }}</div>
              <div class="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                <div
                  *ngFor="let item of group.items"
                  class="rounded-xl border border-slate-200 bg-slate-50/60 p-4 shadow-sm"
                >
                  <div class="flex items-start justify-between gap-4">
                    <div>
                      <div class="text-sm font-semibold text-slate-900">{{ item.name }}</div>
                      <div class="text-xs text-slate-500">{{ item.bankName || 'No bank' }}</div>
                    </div>
                    <span
                      class="rounded-full px-2 py-1 text-xs"
                      [ngClass]="item.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'"
                    >
                      {{ item.isActive ? 'Active' : 'Inactive' }}
                    </span>
                  </div>
                  <div class="mt-4 grid gap-2 text-xs text-slate-600">
                    <div class="flex items-center justify-between">
                      <span>Currency</span>
                      <span class="font-medium text-slate-800">{{ item.currency }}</span>
                    </div>
                    <div class="flex items-center justify-between">
                      <span>Initial balance</span>
                      <span class="font-medium text-slate-800">
                        {{ formatMoney(item.initialBalance, item.currency) }}
                      </span>
                    </div>
                    <div class="flex items-center justify-between">
                      <span>Current balance</span>
                      <span class="font-semibold text-slate-900">
                        {{ formatMoney(item.currentBalance ?? item.initialBalance, item.currency) }}
                      </span>
                    </div>
                  </div>
                  <div class="mt-4 flex justify-end gap-3 text-xs">
                    <button class="text-slate-700" (click)="openEdit(item)">Edit</button>
                    <button class="text-slate-400" (click)="remove(item)">Delete</button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div>
            <div class="flex items-center justify-between">
              <div class="text-sm font-semibold text-slate-800">Cash</div>
              <div class="text-xs text-slate-400">{{ cashAccounts.length }} total</div>
            </div>
            <div *ngIf="cashAccounts.length === 0" class="mt-3 text-sm text-slate-500">
              No cash accounts yet.
            </div>
            <div class="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              <div
                *ngFor="let item of cashAccounts"
                class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div class="flex items-start justify-between gap-4">
                  <div>
                    <div class="text-sm font-semibold text-slate-900">{{ item.name }}</div>
                    <div class="text-xs text-slate-500">Cash</div>
                  </div>
                  <span
                    class="rounded-full px-2 py-1 text-xs"
                    [ngClass]="item.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'"
                  >
                    {{ item.isActive ? 'Active' : 'Inactive' }}
                  </span>
                </div>
                <div class="mt-4 grid gap-2 text-xs text-slate-600">
                  <div class="flex items-center justify-between">
                    <span>Currency</span>
                    <span class="font-medium text-slate-800">{{ item.currency }}</span>
                  </div>
                  <div class="flex items-center justify-between">
                    <span>Initial balance</span>
                    <span class="font-medium text-slate-800">
                      {{ formatMoney(item.initialBalance, item.currency) }}
                    </span>
                  </div>
                  <div class="flex items-center justify-between">
                    <span>Current balance</span>
                    <span class="font-semibold text-slate-900">
                      {{ formatMoney(item.currentBalance ?? item.initialBalance, item.currency) }}
                    </span>
                  </div>
                </div>
                <div class="mt-4 flex justify-end gap-3 text-xs">
                  <button class="text-slate-700" (click)="openEdit(item)">Edit</button>
                  <button class="text-slate-400" (click)="remove(item)">Delete</button>
                </div>
              </div>
            </div>
          </div>

          <div>
            <div class="flex items-center justify-between">
              <div class="text-sm font-semibold text-slate-800">Other</div>
              <div class="text-xs text-slate-400">{{ otherAccounts.length }} total</div>
            </div>
            <div *ngIf="otherAccounts.length === 0" class="mt-3 text-sm text-slate-500">
              No other accounts yet.
            </div>
            <div class="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              <div
                *ngFor="let item of otherAccounts"
                class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div class="flex items-start justify-between gap-4">
                  <div>
                    <div class="text-sm font-semibold text-slate-900">{{ item.name }}</div>
                    <div class="text-xs text-slate-500">{{ formatType(item.type) }}</div>
                  </div>
                  <span
                    class="rounded-full px-2 py-1 text-xs"
                    [ngClass]="item.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'"
                  >
                    {{ item.isActive ? 'Active' : 'Inactive' }}
                  </span>
                </div>
                <div class="mt-4 grid gap-2 text-xs text-slate-600">
                  <div class="flex items-center justify-between">
                    <span>Currency</span>
                    <span class="font-medium text-slate-800">{{ item.currency }}</span>
                  </div>
                  <div class="flex items-center justify-between">
                    <span>Initial balance</span>
                    <span class="font-medium text-slate-800">
                      {{ formatMoney(item.initialBalance, item.currency) }}
                    </span>
                  </div>
                  <div class="flex items-center justify-between">
                    <span>Current balance</span>
                    <span class="font-semibold text-slate-900">
                      {{ formatMoney(item.currentBalance ?? item.initialBalance, item.currency) }}
                    </span>
                  </div>
                </div>
                <div class="mt-4 flex justify-end gap-3 text-xs">
                  <button class="text-slate-700" (click)="openEdit(item)">Edit</button>
                  <button class="text-slate-400" (click)="remove(item)">Delete</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div
      *ngIf="isModalOpen"
      class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4"
    >
      <div class="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
        <div class="flex items-center justify-between">
          <div class="text-lg font-semibold">{{ editing ? 'Edit account' : 'New account' }}</div>
          <button class="text-slate-400" (click)="closeModal()">X</button>
        </div>

        <form class="mt-4 space-y-4" [formGroup]="form" (ngSubmit)="save()">
          <div>
            <label class="text-xs font-semibold uppercase tracking-wide text-slate-600">Name</label>
            <input
              formControlName="name"
              class="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              placeholder="Primary account"
            />
          </div>

          <div class="grid gap-4 md:grid-cols-2">
            <div>
              <label class="text-xs font-semibold uppercase tracking-wide text-slate-600">Type</label>
              <select
                formControlName="type"
                class="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              >
                <option value="bank">Bank</option>
                <option value="paypal">PayPal</option>
                <option value="cash">Cash</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label class="text-xs font-semibold uppercase tracking-wide text-slate-600">Currency</label>
              <select
                formControlName="currency"
                class="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              >
                <option value="USD">USD</option>
                <option value="NIO">NIO</option>
              </select>
            </div>
          </div>

          <div class="grid gap-4 md:grid-cols-2">
            <div>
              <label class="text-xs font-semibold uppercase tracking-wide text-slate-600">Bank</label>
              <input
                formControlName="bankName"
                class="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                placeholder="BAC, Lafise..."
              />
            </div>
            <div>
              <label class="text-xs font-semibold uppercase tracking-wide text-slate-600">Initial balance</label>
              <input
                formControlName="initialBalance"
                type="number"
                class="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                [disabled]="!!editing"
              />
              <div *ngIf="editing" class="mt-1 text-xs text-slate-400">
                Use an adjustment transaction to update the balance.
              </div>
            </div>
          </div>

          <div *ngIf="editing" class="flex items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" formControlName="isActive" class="h-4 w-4" />
            <span>Active</span>
          </div>

          <div *ngIf="error" class="text-sm text-red-600">{{ error }}</div>

          <div class="flex justify-end gap-3">
            <button type="button" class="text-sm text-slate-500" (click)="closeModal()">
              Cancel
            </button>
            <button
              type="submit"
              class="rounded bg-slate-900 px-4 py-2 text-xs uppercase tracking-wide text-white"
              [disabled]="form.invalid || isSaving"
            >
              {{ isSaving ? 'Saving...' : 'Save' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
})
export class AccountsComponent implements OnInit {
  accounts: AccountItem[] = [];
  bankGroups: Array<{ bankName: string; items: AccountItem[] }> = [];
  bankAccounts: AccountItem[] = [];
  cashAccounts: AccountItem[] = [];
  otherAccounts: AccountItem[] = [];
  isLoading = false;
  isSaving = false;
  isModalOpen = false;
  error = '';
  editing: AccountItem | null = null;
  form: FormGroup;

  constructor(
    private readonly fb: FormBuilder,
    private readonly accountsApi: AccountsApiService,
    private readonly confirm: ConfirmService,
  ) {
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      type: ['bank', [Validators.required]],
      currency: ['USD', [Validators.required]],
      bankName: [''],
      initialBalance: [0, [Validators.min(0)]],
      isActive: [true],
    });
  }

  ngOnInit() {
    this.load();
  }

  load() {
    this.isLoading = true;
    this.error = '';
    this.accountsApi.list({ includeBalance: true }).subscribe({
      next: (items) => {
        this.accounts = items;
        this.updateGroups();
        this.isLoading = false;
      },
      error: () => {
        this.error = 'Unable to load accounts';
        this.isLoading = false;
      },
    });
  }

  openCreate() {
    this.editing = null;
    this.form.reset({
      name: '',
      type: 'bank',
      currency: 'USD',
      bankName: '',
      initialBalance: 0,
      isActive: true,
    });
    this.isModalOpen = true;
  }

  openEdit(item: AccountItem) {
    this.editing = item;
    this.form.reset({
      name: item.name,
      type: item.type,
      currency: item.currency,
      bankName: item.bankName ?? '',
      initialBalance: item.initialBalance,
      isActive: item.isActive,
    });
    this.isModalOpen = true;
  }

  closeModal() {
    this.isModalOpen = false;
  }

  async save() {
    if (this.form.invalid) {
      return;
    }
    if (this.form.dirty) {
      const confirmed = await this.confirm.open({
        title: this.editing ? 'Confirm update' : 'Confirm create',
        message: this.editing
          ? 'Save changes to this account?'
          : 'Create this account with the current details?',
      });
      if (!confirmed) {
        return;
      }
    }

    this.isSaving = true;
    const payload = {
      name: this.form.value.name ?? '',
      type: this.form.value.type ?? 'bank',
      currency: this.form.value.currency ?? 'USD',
      bankName: this.form.value.bankName || undefined,
      initialBalance: Number(this.form.value.initialBalance ?? 0),
      isActive: this.form.value.isActive ?? true,
    };

    if (this.editing) {
      const { initialBalance, ...editPayload } = payload;
      this.accountsApi.update(this.editing._id, editPayload).subscribe({
        next: () => {
          this.isSaving = false;
          this.isModalOpen = false;
          this.load();
        },
        error: () => {
          this.isSaving = false;
          this.error = 'Unable to save account';
        },
      });
      return;
    }

    this.accountsApi.create(payload).subscribe({
      next: () => {
        this.isSaving = false;
        this.isModalOpen = false;
        this.load();
      },
      error: () => {
        this.isSaving = false;
        this.error = 'Unable to create account';
      },
    });
  }

  async remove(item: AccountItem) {
    const confirmed = await this.confirm.open({
      title: 'Confirm delete',
      message: `Delete account ${item.name}? This cannot be undone.`,
      confirmText: 'Delete',
      danger: true,
    });
    if (!confirmed) {
      return;
    }
    this.accountsApi.remove(item._id).subscribe({
      next: () => this.load(),
      error: () => {
        this.error = 'Unable to delete account';
      },
    });
  }

  formatType(type: AccountItem['type']) {
    if (type === 'bank') {
      return 'Bank';
    }
    if (type === 'paypal') {
      return 'PayPal';
    }
    if (type === 'cash') {
      return 'Cash';
    }
    return 'Other';
  }

  formatMoney(amount: number, currency: 'USD' | 'NIO') {
    return `${currency} ${Number(amount ?? 0).toFixed(2)}`;
  }

  private updateGroups() {
    this.bankAccounts = this.accounts.filter((item) => item.type === 'bank');
    this.cashAccounts = this.accounts.filter((item) => item.type === 'cash');
    this.otherAccounts = this.accounts.filter((item) => item.type !== 'bank' && item.type !== 'cash');

    const map = new Map<string, AccountItem[]>();
    for (const item of this.bankAccounts) {
      const bankName = item.bankName?.trim() || 'No bank';
      if (!map.has(bankName)) {
        map.set(bankName, []);
      }
      map.get(bankName)?.push(item);
    }

    const names = Array.from(map.keys()).sort((a, b) => {
      if (a === 'No bank') return 1;
      if (b === 'No bank') return -1;
      return a.localeCompare(b);
    });

    this.bankGroups = names.map((bankName) => ({
      bankName,
      items: map.get(bankName) ?? [],
    }));
  }
}
