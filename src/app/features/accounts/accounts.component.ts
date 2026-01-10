import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AccountsApiService } from '../../core/services/accounts-api.service';
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

        <table *ngIf="!isLoading" class="mt-2 w-full text-sm">
          <thead class="text-left text-xs uppercase tracking-wide text-slate-400">
            <tr>
              <th class="py-2">Account</th>
              <th class="py-2">Type</th>
              <th class="py-2">Currency</th>
              <th class="py-2">Initial balance</th>
              <th class="py-2">Current balance</th>
              <th class="py-2">Status</th>
              <th class="py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let item of accounts" class="border-t border-slate-100">
              <td class="py-3">
                <div class="font-medium text-slate-900">{{ item.name }}</div>
                <div class="text-xs text-slate-500">{{ item.bankName || 'No bank' }}</div>
              </td>
              <td class="py-3">{{ formatType(item.type) }}</td>
              <td class="py-3">{{ item.currency }}</td>
              <td class="py-3">{{ formatMoney(item.initialBalance, item.currency) }}</td>
              <td class="py-3">{{ formatMoney(item.currentBalance ?? item.initialBalance, item.currency) }}</td>
              <td class="py-3">
                <span
                  class="rounded-full px-2 py-1 text-xs"
                  [ngClass]="item.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'"
                >
                  {{ item.isActive ? 'Active' : 'Inactive' }}
                </span>
              </td>
              <td class="py-3 text-right">
                <button class="text-xs text-slate-700" (click)="openEdit(item)">Edit</button>
                <button class="ml-3 text-xs text-slate-400" (click)="remove(item)">Delete</button>
              </td>
            </tr>
            <tr *ngIf="accounts.length === 0 && !isLoading">
              <td colspan="7" class="py-6 text-center text-sm text-slate-500">
                No accounts found
              </td>
            </tr>
          </tbody>
        </table>
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
  isLoading = false;
  isSaving = false;
  isModalOpen = false;
  error = '';
  editing: AccountItem | null = null;
  form: FormGroup;

  constructor(private readonly fb: FormBuilder, private readonly accountsApi: AccountsApiService) {
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

  save() {
    if (this.form.invalid) {
      return;
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

  remove(item: AccountItem) {
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
}
