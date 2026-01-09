import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CategoriesApiService } from '../../core/services/categories-api.service';
import { CategoryItem } from '../../core/models/category.model';

@Component({
  selector: 'app-categories',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <div>
          <div class="text-2xl font-semibold">Categorias</div>
          <div class="text-sm text-slate-500">Organiza ingresos y gastos</div>
        </div>
        <button
          class="rounded bg-slate-900 px-3 py-2 text-xs uppercase tracking-wide text-white"
          (click)="openCreate()"
        >
          Nueva categoria
        </button>
      </div>

      <div class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div *ngIf="isLoading" class="text-sm text-slate-500">Cargando categorias...</div>
        <div *ngIf="error" class="text-sm text-red-600">{{ error }}</div>

        <table *ngIf="!isLoading" class="mt-2 w-full text-sm">
          <thead class="text-left text-xs uppercase tracking-wide text-slate-400">
            <tr>
              <th class="py-2">Nombre</th>
              <th class="py-2">Tipo</th>
              <th class="py-2">Padre</th>
              <th class="py-2 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let row of displayCategories" class="border-t border-slate-100">
              <td class="py-3 font-medium text-slate-900">
                <div [style.paddingLeft.px]="row.depth * 16">
                  <span *ngIf="row.depth > 0" class="mr-2 text-slate-400">•</span>
                  {{ row.item.name }}
                </div>
              </td>
              <td class="py-3">{{ row.item.type === 'income' ? 'Ingreso' : 'Gasto' }}</td>
              <td class="py-3">{{ resolveParentName(row.item.parentId) }}</td>
              <td class="py-3 text-right">
                <button class="text-xs text-slate-700" (click)="openEdit(row.item)">Editar</button>
                <button class="ml-3 text-xs text-slate-400" (click)="remove(row.item)">Eliminar</button>
              </td>
            </tr>
            <tr *ngIf="displayCategories.length === 0 && !isLoading">
              <td colspan="4" class="py-6 text-center text-sm text-slate-500">
                Sin categorias registradas
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
          <div class="text-lg font-semibold">{{ editing ? 'Editar categoria' : 'Nueva categoria' }}</div>
          <button class="text-slate-400" (click)="closeModal()">X</button>
        </div>

        <form class="mt-4 space-y-4" [formGroup]="form" (ngSubmit)="save()">
          <div>
            <label class="text-xs font-semibold uppercase tracking-wide text-slate-600">Nombre</label>
            <input
              formControlName="name"
              class="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              placeholder="Alimentacion"
            />
          </div>

          <div class="grid gap-4 md:grid-cols-2">
            <div>
              <label class="text-xs font-semibold uppercase tracking-wide text-slate-600">Tipo</label>
              <select
                formControlName="type"
                class="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              >
                <option value="income">Ingreso</option>
                <option value="expense">Gasto</option>
              </select>
            </div>
            <div>
              <label class="text-xs font-semibold uppercase tracking-wide text-slate-600">Categoria padre</label>
              <select
                formControlName="parentId"
                class="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              >
                <option value="">Sin padre</option>
                <option *ngFor="let category of categories" [value]="category._id">
                  {{ category.name }}
                </option>
              </select>
            </div>
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
export class CategoriesComponent implements OnInit {
  categories: CategoryItem[] = [];
  displayCategories: Array<{ item: CategoryItem; depth: number }> = [];
  isLoading = false;
  isSaving = false;
  isModalOpen = false;
  error = '';
  editing: CategoryItem | null = null;
  form: FormGroup;

  constructor(private readonly fb: FormBuilder, private readonly categoriesApi: CategoriesApiService) {
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      type: ['expense', [Validators.required]],
      parentId: [''],
    });
  }

  ngOnInit() {
    this.load();
  }

  load() {
    this.isLoading = true;
    this.error = '';
    this.categoriesApi.list().subscribe({
      next: (items) => {
        this.categories = items;
        this.displayCategories = this.buildHierarchy(items);
        this.isLoading = false;
      },
      error: () => {
        this.error = 'No se pudo cargar las categorias';
        this.isLoading = false;
      },
    });
  }

  openCreate() {
    this.editing = null;
    this.form.reset({ name: '', type: 'expense', parentId: '' });
    this.isModalOpen = true;
  }

  openEdit(item: CategoryItem) {
    this.editing = item;
    this.form.reset({
      name: item.name,
      type: item.type,
      parentId: item.parentId ?? '',
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
      type: this.form.value.type ?? 'expense',
      parentId: this.form.value.parentId || undefined,
    };

    if (this.editing) {
      this.categoriesApi.update(this.editing._id, payload).subscribe({
        next: () => {
          this.isSaving = false;
          this.isModalOpen = false;
          this.load();
        },
        error: () => {
          this.isSaving = false;
          this.error = 'No se pudo guardar la categoria';
        },
      });
      return;
    }

    this.categoriesApi.create(payload).subscribe({
      next: () => {
        this.isSaving = false;
        this.isModalOpen = false;
        this.load();
      },
      error: () => {
        this.isSaving = false;
        this.error = 'No se pudo crear la categoria';
      },
    });
  }

  remove(item: CategoryItem) {
    this.categoriesApi.remove(item._id).subscribe({
      next: () => this.load(),
      error: () => {
        this.error = 'No se pudo eliminar la categoria';
      },
    });
  }

  resolveParentName(parentId?: string) {
    if (!parentId) {
      return '-';
    }
    return this.categories.find((item) => item._id === parentId)?.name ?? '-';
  }

  private buildHierarchy(items: CategoryItem[]) {
    const byParent = new Map<string, CategoryItem[]>();
    const roots: CategoryItem[] = [];
    items.forEach((item) => {
      const parent = item.parentId ?? '';
      if (!parent) {
        roots.push(item);
        return;
      }
      if (!byParent.has(parent)) {
        byParent.set(parent, []);
      }
      byParent.get(parent)?.push(item);
    });

    const sortByName = (list: CategoryItem[]) =>
      list.sort((a, b) => a.name.localeCompare(b.name));

    sortByName(roots);

    const result: Array<{ item: CategoryItem; depth: number }> = [];
    const walk = (node: CategoryItem, depth: number) => {
      result.push({ item: node, depth });
      const children = byParent.get(node._id);
      if (children && children.length) {
        sortByName(children);
        children.forEach((child) => walk(child, depth + 1));
      }
    };

    roots.forEach((root) => walk(root, 0));
    return result;
  }
}
