import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { BudgetsApiService } from '../../core/services/budgets-api.service';
import { CategoriesApiService } from '../../core/services/categories-api.service';
import { BudgetItem } from '../../core/models/budget.model';
import { CategoryItem } from '../../core/models/category.model';

@Component({
  selector: 'app-budgets',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  template: `
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <div>
          <div class="text-2xl font-semibold">Presupuestos</div>
          <div class="text-sm text-slate-500">Define limites por categoria</div>
        </div>
        <button
          class="rounded bg-slate-900 px-3 py-2 text-xs uppercase tracking-wide text-white"
          (click)="openCreate()"
        >
          Nuevo presupuesto
        </button>
      </div>

      <div class="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm lg:grid-cols-2">
        <input
          type="number"
          [(ngModel)]="month"
          class="rounded-lg border border-slate-200 px-3 py-2 text-sm"
          placeholder="Mes"
        />
        <input
          type="number"
          [(ngModel)]="year"
          class="rounded-lg border border-slate-200 px-3 py-2 text-sm"
          placeholder="Ano"
        />
        <button
          class="rounded bg-slate-900 px-3 py-2 text-xs uppercase tracking-wide text-white lg:col-span-2"
          (click)="load()"
        >
          Filtrar
        </button>
      </div>

      <div class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div *ngIf="isLoading" class="text-sm text-slate-500">Cargando presupuestos...</div>
        <div *ngIf="error" class="text-sm text-red-600">{{ error }}</div>

        <table *ngIf="!isLoading" class="mt-2 w-full text-sm">
          <thead class="text-left text-xs uppercase tracking-wide text-slate-400">
            <tr>
              <th class="py-2">Categoria</th>
              <th class="py-2">Mes</th>
              <th class="py-2">Monto</th>
              <th class="py-2">Moneda</th>
              <th class="py-2 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let item of budgets" class="border-t border-slate-100">
              <td class="py-3">{{ resolveCategoryName(item.categoryId) }}</td>
              <td class="py-3">{{ item.month }}/{{ item.year }}</td>
              <td class="py-3">{{ formatMoney(item.amount, item.currency) }}</td>
              <td class="py-3">{{ item.currency }}</td>
              <td class="py-3 text-right">
                <button class="text-xs text-slate-700" (click)="openEdit(item)">Editar</button>
                <button class="ml-3 text-xs text-slate-400" (click)="remove(item)">Eliminar</button>
              </td>
            </tr>
            <tr *ngIf="budgets.length === 0 && !isLoading">
              <td colspan="5" class="py-6 text-center text-sm text-slate-500">
                Sin presupuestos registrados
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
          <div class="text-lg font-semibold">{{ editing ? 'Editar presupuesto' : 'Nuevo presupuesto' }}</div>
          <button class="text-slate-400" (click)="closeModal()">X</button>
        </div>

        <form class="mt-4 space-y-4" [formGroup]="form" (ngSubmit)="save()">
          <div>
            <label class="text-xs font-semibold uppercase tracking-wide text-slate-600">Categoria</label>
            <select
              formControlName="categoryId"
              class="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            >
              <option value="">Seleccionar categoria</option>
              <option *ngFor="let category of categories" [value]="category._id">
                {{ category.name }}
              </option>
            </select>
          </div>

          <div class="grid gap-4 md:grid-cols-3">
            <div>
              <label class="text-xs font-semibold uppercase tracking-wide text-slate-600">Mes</label>
              <input
                formControlName="month"
                type="number"
                class="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label class="text-xs font-semibold uppercase tracking-wide text-slate-600">Ano</label>
              <input
                formControlName="year"
                type="number"
                class="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label class="text-xs font-semibold uppercase tracking-wide text-slate-600">Moneda</label>
              <select
                formControlName="currency"
                class="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              >
                <option value="USD">USD</option>
                <option value="NIO">NIO</option>
              </select>
            </div>
          </div>

          <div>
            <label class="text-xs font-semibold uppercase tracking-wide text-slate-600">Monto</label>
            <input
              formControlName="amount"
              type="number"
              class="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </div>

          <div *ngIf="error" class="text-sm text-red-600">{{ error }}</div>

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
  `,
})
export class BudgetsComponent implements OnInit {
  budgets: BudgetItem[] = [];
  categories: CategoryItem[] = [];
  isLoading = false;
  isSaving = false;
  isModalOpen = false;
  error = '';
  editing: BudgetItem | null = null;
  form: FormGroup;
  month = new Date().getMonth() + 1;
  year = new Date().getFullYear();

  constructor(
    private readonly fb: FormBuilder,
    private readonly budgetsApi: BudgetsApiService,
    private readonly categoriesApi: CategoriesApiService,
  ) {
    this.form = this.fb.group({
      categoryId: ['', [Validators.required]],
      month: [this.month, [Validators.required]],
      year: [this.year, [Validators.required]],
      amount: [0, [Validators.required, Validators.min(0)]],
      currency: ['USD', [Validators.required]],
    });
  }

  ngOnInit() {
    this.loadReferences();
    this.load();
  }

  loadReferences() {
    this.categoriesApi.list({ type: 'expense' }).subscribe({
      next: (items) => (this.categories = items),
    });
  }

  load() {
    this.isLoading = true;
    this.error = '';
    this.budgetsApi.list({ month: this.month, year: this.year }).subscribe({
      next: (items) => {
        this.budgets = items;
        this.isLoading = false;
      },
      error: () => {
        this.error = 'No se pudieron cargar los presupuestos';
        this.isLoading = false;
      },
    });
  }

  openCreate() {
    this.editing = null;
    this.form.reset({
      categoryId: '',
      month: this.month,
      year: this.year,
      amount: 0,
      currency: 'USD',
    });
    this.isModalOpen = true;
  }

  openEdit(item: BudgetItem) {
    this.editing = item;
    this.form.reset({
      categoryId: this.resolveCategoryId(item.categoryId),
      month: item.month,
      year: item.year,
      amount: item.amount,
      currency: item.currency,
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
      categoryId: this.form.value.categoryId ?? '',
      month: Number(this.form.value.month ?? this.month),
      year: Number(this.form.value.year ?? this.year),
      amount: Number(this.form.value.amount ?? 0),
      currency: this.form.value.currency ?? 'USD',
    };

    if (this.editing) {
      this.budgetsApi.update(this.editing._id, payload).subscribe({
        next: () => {
          this.isSaving = false;
          this.isModalOpen = false;
          this.load();
        },
        error: () => {
          this.isSaving = false;
          this.error = 'No se pudo guardar el presupuesto';
        },
      });
      return;
    }

    this.budgetsApi.create(payload).subscribe({
      next: () => {
        this.isSaving = false;
        this.isModalOpen = false;
        this.load();
      },
      error: () => {
        this.isSaving = false;
        this.error = 'No se pudo crear el presupuesto';
      },
    });
  }

  remove(item: BudgetItem) {
    this.budgetsApi.remove(item._id).subscribe({
      next: () => this.load(),
      error: () => {
        this.error = 'No se pudo eliminar el presupuesto';
      },
    });
  }

  resolveCategoryName(category: BudgetItem['categoryId']) {
    if (typeof category === 'string') {
      return this.categories.find((item) => item._id === category)?.name ?? category;
    }
    return category?.name ?? '-';
  }

  resolveCategoryId(category: BudgetItem['categoryId']) {
    return typeof category === 'string' ? category : category?._id;
  }

  formatMoney(amount: number, currency: 'USD' | 'NIO') {
    return `${currency} ${Number(amount ?? 0).toFixed(2)}`;
  }
}
