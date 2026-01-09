import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { AccountsApiService } from '../../core/services/accounts-api.service';
import { CategoriesApiService } from '../../core/services/categories-api.service';
import { TransactionsApiService } from '../../core/services/transactions-api.service';
import { AccountItem } from '../../core/models/account.model';
import { CategoryItem } from '../../core/models/category.model';
import { TransactionItem } from '../../core/models/transaction.model';

@Component({
  selector: 'app-transactions',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  template: `
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <div>
          <div class="text-2xl font-semibold">Movimientos</div>
          <div class="text-sm text-slate-500">Registra ingresos, gastos y ajustes</div>
        </div>
        <div class="flex gap-2">
          <button
            class="rounded border border-slate-200 px-3 py-2 text-xs uppercase tracking-wide text-slate-700"
            (click)="openTransfer()"
          >
            Transferencia
          </button>
          <button
            class="rounded bg-slate-900 px-3 py-2 text-xs uppercase tracking-wide text-white"
            (click)="openCreate()"
          >
            Nuevo movimiento
          </button>
        </div>
      </div>

      <div class="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm lg:grid-cols-4">
        <select [(ngModel)]="accountFilter" class="rounded-lg border border-slate-200 px-3 py-2 text-sm">
          <option value="">Todas las cuentas</option>
          <option *ngFor="let account of accounts" [value]="account._id">
            {{ account.name }}
          </option>
        </select>
        <select [(ngModel)]="typeFilter" class="rounded-lg border border-slate-200 px-3 py-2 text-sm">
          <option value="">Todos los tipos</option>
          <option value="income">Ingreso</option>
          <option value="expense">Gasto</option>
          <option value="adjustment">Ajuste</option>
          <option value="transfer">Transferencia</option>
        </select>
        <input
          type="date"
          [(ngModel)]="from"
          class="rounded-lg border border-slate-200 px-3 py-2 text-sm"
        />
        <input
          type="date"
          [(ngModel)]="to"
          class="rounded-lg border border-slate-200 px-3 py-2 text-sm"
        />
        <button
          class="rounded bg-slate-900 px-3 py-2 text-xs uppercase tracking-wide text-white lg:col-span-4"
          (click)="load()"
        >
          Filtrar
        </button>
      </div>

      <div class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div *ngIf="isLoading" class="text-sm text-slate-500">Cargando movimientos...</div>
        <div *ngIf="error" class="text-sm text-red-600">{{ error }}</div>

        <table *ngIf="!isLoading" class="mt-2 w-full text-sm">
          <thead class="text-left text-xs uppercase tracking-wide text-slate-400">
            <tr>
              <th class="py-2">Fecha</th>
              <th class="py-2">Cuenta</th>
              <th class="py-2">Tipo</th>
              <th class="py-2">Categoria</th>
              <th class="py-2">Monto</th>
              <th class="py-2">Notas</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let item of transactions" class="border-t border-slate-100">
              <td class="py-3">{{ formatDate(item.date) }}</td>
              <td class="py-3">{{ resolveAccountName(item.accountId) }}</td>
              <td class="py-3">{{ formatType(item) }}</td>
              <td class="py-3">{{ resolveCategoryName(item.categoryId) }}</td>
              <td class="py-3">{{ formatMoney(item.amount, item.currency) }}</td>
              <td class="py-3">{{ item.notes || '-' }}</td>
            </tr>
            <tr *ngIf="transactions.length === 0 && !isLoading">
              <td colspan="6" class="py-6 text-center text-sm text-slate-500">
                Sin movimientos registrados
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
      <div class="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl">
        <div class="flex items-center justify-between">
          <div class="text-lg font-semibold">Nuevo movimiento</div>
          <button class="text-slate-400" (click)="closeModal()">X</button>
        </div>

        <form class="mt-4 space-y-4" [formGroup]="form" (ngSubmit)="save()">
          <div class="grid gap-4 md:grid-cols-3">
            <div>
              <label class="text-xs font-semibold uppercase tracking-wide text-slate-600">Tipo</label>
              <select
                formControlName="type"
                class="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                (change)="onTypeChange()"
              >
                <option value="income">Ingreso</option>
                <option value="expense">Gasto</option>
                <option value="adjustment">Ajuste</option>
              </select>
            </div>
            <div>
              <label class="text-xs font-semibold uppercase tracking-wide text-slate-600">Cuenta</label>
              <select
                formControlName="accountId"
                class="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                (change)="onAccountChange()"
              >
                <option value="">Seleccionar cuenta</option>
                <option *ngFor="let account of accounts" [value]="account._id">
                  {{ account.name }} ({{ account.currency }})
                </option>
              </select>
            </div>
            <div>
              <label class="text-xs font-semibold uppercase tracking-wide text-slate-600">Categoria</label>
              <select
                formControlName="categoryId"
                class="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                [disabled]="form.value.type === 'adjustment'"
              >
                <option value="">Seleccionar categoria</option>
                <option *ngFor="let category of filteredCategories" [value]="category._id">
                  {{ category.name }}
                </option>
              </select>
            </div>
          </div>

          <div class="grid gap-4 md:grid-cols-3">
            <div>
              <label class="text-xs font-semibold uppercase tracking-wide text-slate-600">Monto</label>
              <input
                formControlName="amount"
                type="number"
                class="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label class="text-xs font-semibold uppercase tracking-wide text-slate-600">Moneda</label>
              <input
                formControlName="currency"
                class="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                readonly
              />
            </div>
            <div>
              <label class="text-xs font-semibold uppercase tracking-wide text-slate-600">Fecha</label>
              <input
                formControlName="date"
                type="date"
                class="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div class="grid gap-4 md:grid-cols-2">
            <div *ngIf="form.value.type === 'adjustment'">
              <label class="text-xs font-semibold uppercase tracking-wide text-slate-600">Direccion</label>
              <select
                formControlName="flow"
                class="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              >
                <option value="in">Aumentar saldo</option>
                <option value="out">Disminuir saldo</option>
              </select>
            </div>
            <div>
              <label class="text-xs font-semibold uppercase tracking-wide text-slate-600">Referencia</label>
              <input
                formControlName="reference"
                class="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div>
            <label class="text-xs font-semibold uppercase tracking-wide text-slate-600">Notas</label>
            <textarea
              formControlName="notes"
              rows="2"
              class="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            ></textarea>
          </div>

          <div *ngIf="modalError" class="text-sm text-red-600">{{ modalError }}</div>

          <div class="flex justify-end gap-3">
            <button type="button" class="text-sm text-slate-500" (click)="closeModal()">
              Cancelar
            </button>
            <button
              type="submit"
              class="rounded bg-slate-900 px-4 py-2 text-xs uppercase tracking-wide text-white"
              [disabled]="form.invalid || isSaving"
            >
              {{ isSaving ? 'Guardando...' : 'Guardar' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <div
      *ngIf="isTransferOpen"
      class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4"
    >
      <div class="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl">
        <div class="flex items-center justify-between">
          <div class="text-lg font-semibold">Transferencia entre cuentas</div>
          <button class="text-slate-400" (click)="closeTransfer()">X</button>
        </div>

        <form class="mt-4 space-y-4" [formGroup]="transferForm" (ngSubmit)="saveTransfer()">
          <div class="grid gap-4 md:grid-cols-2">
            <div>
              <label class="text-xs font-semibold uppercase tracking-wide text-slate-600">Cuenta origen</label>
              <select
                formControlName="fromAccountId"
                class="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                (change)="onTransferAccountChange()"
              >
                <option value="">Seleccionar cuenta</option>
                <option *ngFor="let account of accounts" [value]="account._id">
                  {{ account.name }} ({{ account.currency }})
                </option>
              </select>
            </div>
            <div>
              <label class="text-xs font-semibold uppercase tracking-wide text-slate-600">Cuenta destino</label>
              <select
                formControlName="toAccountId"
                class="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              >
                <option value="">Seleccionar cuenta</option>
                <option *ngFor="let account of accounts" [value]="account._id">
                  {{ account.name }} ({{ account.currency }})
                </option>
              </select>
            </div>
          </div>

          <div class="grid gap-4 md:grid-cols-3">
            <div>
              <label class="text-xs font-semibold uppercase tracking-wide text-slate-600">Monto</label>
              <input
                formControlName="amount"
                type="number"
                class="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label class="text-xs font-semibold uppercase tracking-wide text-slate-600">Moneda</label>
              <input
                formControlName="currency"
                class="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                readonly
              />
            </div>
            <div>
              <label class="text-xs font-semibold uppercase tracking-wide text-slate-600">Fecha</label>
              <input
                formControlName="date"
                type="date"
                class="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div>
            <label class="text-xs font-semibold uppercase tracking-wide text-slate-600">Tipo de cambio</label>
            <input
              formControlName="exchangeRate"
              type="number"
              step="0.01"
              class="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
            <div class="mt-1 text-xs text-slate-500">Usa el TC si las cuentas tienen monedas distintas.</div>
          </div>

          <div class="grid gap-4 md:grid-cols-2">
            <div>
              <label class="text-xs font-semibold uppercase tracking-wide text-slate-600">Referencia</label>
              <input
                formControlName="reference"
                class="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label class="text-xs font-semibold uppercase tracking-wide text-slate-600">Notas</label>
              <input
                formControlName="notes"
                class="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div *ngIf="transferError" class="text-sm text-red-600">{{ transferError }}</div>

          <div class="flex justify-end gap-3">
            <button type="button" class="text-sm text-slate-500" (click)="closeTransfer()">
              Cancelar
            </button>
            <button
              type="submit"
              class="rounded bg-slate-900 px-4 py-2 text-xs uppercase tracking-wide text-white"
              [disabled]="transferForm.invalid || isSavingTransfer"
            >
              {{ isSavingTransfer ? 'Guardando...' : 'Transferir' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
})
export class TransactionsComponent implements OnInit {
  transactions: TransactionItem[] = [];
  accounts: AccountItem[] = [];
  categories: CategoryItem[] = [];
  filteredCategories: CategoryItem[] = [];

  isLoading = false;
  isSaving = false;
  isSavingTransfer = false;
  isModalOpen = false;
  isTransferOpen = false;
  error = '';
  modalError = '';
  transferError = '';

  accountFilter = '';
  typeFilter = '';
  from = '';
  to = '';

  form: FormGroup;
  transferForm: FormGroup;

  constructor(
    private readonly fb: FormBuilder,
    private readonly accountsApi: AccountsApiService,
    private readonly categoriesApi: CategoriesApiService,
    private readonly transactionsApi: TransactionsApiService,
  ) {
    this.form = this.fb.group({
      type: ['expense', [Validators.required]],
      accountId: ['', [Validators.required]],
      categoryId: [''],
      amount: [0, [Validators.required, Validators.min(0.01)]],
      currency: ['USD', [Validators.required]],
      date: ['', [Validators.required]],
      flow: ['in'],
      reference: [''],
      notes: [''],
    });

    this.transferForm = this.fb.group({
      fromAccountId: ['', [Validators.required]],
      toAccountId: ['', [Validators.required]],
      amount: [0, [Validators.required, Validators.min(0.01)]],
      currency: ['USD', [Validators.required]],
      date: ['', [Validators.required]],
      exchangeRate: [36],
      reference: [''],
      notes: [''],
    });
  }

  ngOnInit() {
    this.loadDependencies();
    this.load();
  }

  loadDependencies() {
    this.accountsApi.list({ isActive: true }).subscribe({
      next: (items) => (this.accounts = items),
    });
    this.categoriesApi.list().subscribe({
      next: (items) => {
        this.categories = items;
        this.applyCategoryFilter();
      },
    });
  }

  load() {
    this.isLoading = true;
    this.error = '';
    this.transactionsApi
      .list({
        accountId: this.accountFilter || undefined,
        type: this.typeFilter || undefined,
        from: this.from || undefined,
        to: this.to || undefined,
      })
      .subscribe({
        next: (items) => {
          this.transactions = items;
          this.isLoading = false;
        },
        error: () => {
          this.error = 'No se pudieron cargar los movimientos';
          this.isLoading = false;
        },
      });
  }

  openCreate() {
    this.modalError = '';
    this.form.reset({
      type: 'expense',
      accountId: '',
      categoryId: '',
      amount: 0,
      currency: 'USD',
      date: '',
      flow: 'in',
      reference: '',
      notes: '',
    });
    this.applyCategoryFilter();
    this.isModalOpen = true;
  }

  closeModal() {
    this.isModalOpen = false;
  }

  openTransfer() {
    this.transferError = '';
    this.transferForm.reset({
      fromAccountId: '',
      toAccountId: '',
      amount: 0,
      currency: 'USD',
      date: '',
      exchangeRate: 36,
      reference: '',
      notes: '',
    });
    this.isTransferOpen = true;
  }

  closeTransfer() {
    this.isTransferOpen = false;
  }

  onTypeChange() {
    this.applyCategoryFilter();
  }

  onAccountChange() {
    const account = this.accounts.find((item) => item._id === this.form.value.accountId);
    if (account) {
      this.form.patchValue({ currency: account.currency });
    }
  }

  onTransferAccountChange() {
    const account = this.accounts.find((item) => item._id === this.transferForm.value.fromAccountId);
    if (account) {
      this.transferForm.patchValue({ currency: account.currency });
    }
  }

  save() {
    if (this.form.invalid) {
      return;
    }
    this.isSaving = true;
    const payload = {
      type: this.form.value.type,
      accountId: this.form.value.accountId,
      categoryId: this.form.value.categoryId || undefined,
      amount: Number(this.form.value.amount ?? 0),
      currency: this.form.value.currency ?? 'USD',
      date: this.form.value.date ?? '',
      flow: this.form.value.type === 'adjustment' ? this.form.value.flow : undefined,
      reference: this.form.value.reference || undefined,
      notes: this.form.value.notes || undefined,
    } as const;

    this.transactionsApi.create(payload).subscribe({
      next: () => {
        this.isSaving = false;
        this.isModalOpen = false;
        this.load();
      },
      error: () => {
        this.isSaving = false;
        this.modalError = 'No se pudo guardar el movimiento';
      },
    });
  }

  saveTransfer() {
    if (this.transferForm.invalid) {
      return;
    }
    this.isSavingTransfer = true;
    const payload = {
      fromAccountId: this.transferForm.value.fromAccountId ?? '',
      toAccountId: this.transferForm.value.toAccountId ?? '',
      amount: Number(this.transferForm.value.amount ?? 0),
      currency: this.transferForm.value.currency ?? 'USD',
      exchangeRate: Number(this.transferForm.value.exchangeRate ?? 0),
      date: this.transferForm.value.date ?? '',
      reference: this.transferForm.value.reference || undefined,
      notes: this.transferForm.value.notes || undefined,
    };

    this.transactionsApi.transfer(payload).subscribe({
      next: () => {
        this.isSavingTransfer = false;
        this.isTransferOpen = false;
        this.load();
      },
      error: () => {
        this.isSavingTransfer = false;
        this.transferError = 'No se pudo guardar la transferencia';
      },
    });
  }

  applyCategoryFilter() {
    const type = this.form.value.type ?? 'expense';
    if (type === 'adjustment') {
      this.filteredCategories = [];
      return;
    }
    this.filteredCategories = this.categories.filter((item) => item.type === type);
  }

  resolveAccountName(account: TransactionItem['accountId']) {
    if (typeof account === 'string') {
      return this.accounts.find((item) => item._id === account)?.name ?? account;
    }
    return account?.name ?? '-';
  }

  resolveCategoryName(category?: TransactionItem['categoryId']) {
    if (!category) {
      return '-';
    }
    if (typeof category === 'string') {
      return this.categories.find((item) => item._id === category)?.name ?? category;
    }
    return category?.name ?? '-';
  }

  formatDate(date?: string) {
    if (!date) {
      return '-';
    }
    return new Date(date).toLocaleDateString('es-NI');
  }

  formatMoney(amount: number, currency: 'USD' | 'NIO') {
    return `${currency} ${Number(amount ?? 0).toFixed(2)}`;
  }

  formatType(item: TransactionItem) {
    if (item.type === 'income') {
      return 'Ingreso';
    }
    if (item.type === 'expense') {
      return 'Gasto';
    }
    if (item.type === 'adjustment') {
      return item.flow === 'in' ? 'Ajuste + ' : 'Ajuste -';
    }
    return 'Transferencia';
  }
}
