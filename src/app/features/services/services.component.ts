import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ServicesApiService } from '../../core/services/services-api.service';
import { ServiceItem } from '../../core/models/service.model';

@Component({
  selector: 'app-services',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <div>
          <div class="text-2xl font-semibold">Servicios</div>
          <div class="text-sm text-slate-500">Catalogo y configuracion de servicios</div>
        </div>
        <button
          class="rounded bg-slate-900 px-3 py-2 text-xs uppercase tracking-wide text-white"
          (click)="openCreate()"
        >
          Nuevo servicio
        </button>
      </div>

      <div class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div *ngIf="isLoading" class="text-sm text-slate-500">Cargando servicios...</div>
        <div *ngIf="error" class="text-sm text-red-600">{{ error }}</div>

        <table *ngIf="!isLoading" class="mt-2 w-full text-sm">
          <thead class="text-left text-xs uppercase tracking-wide text-slate-400">
            <tr>
              <th class="py-2">Nombre</th>
              <th class="py-2">Tipo</th>
              <th class="py-2">Periodo</th>
              <th class="py-2">Estado</th>
              <th class="py-2 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let item of services" class="border-t border-slate-100">
              <td class="py-3">
                <div class="font-medium text-slate-900">{{ item.name }}</div>
                <div class="text-xs text-slate-500">{{ item.description || 'Sin descripcion' }}</div>
              </td>
              <td class="py-3">{{ item.billingType === 'recurring' ? 'Recurrente' : 'Unico' }}</td>
              <td class="py-3">{{ formatPeriod(item.defaultPeriod) }}</td>
              <td class="py-3">
                <span
                  class="rounded-full px-2 py-1 text-xs"
                  [ngClass]="item.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'"
                >
                  {{ item.isActive ? 'Activo' : 'Inactivo' }}
                </span>
              </td>
              <td class="py-3 text-right">
                <button class="text-xs text-slate-700" (click)="openEdit(item)">Editar</button>
                <button class="ml-3 text-xs text-red-600" (click)="toggleStatus(item)">
                  {{ item.isActive ? 'Desactivar' : 'Activar' }}
                </button>
                <button class="ml-3 text-xs text-slate-400" (click)="remove(item)">Eliminar</button>
              </td>
            </tr>
            <tr *ngIf="services.length === 0 && !isLoading">
              <td colspan="5" class="py-6 text-center text-sm text-slate-500">
                Sin servicios registrados
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
          <div class="text-lg font-semibold">{{ editing ? 'Editar servicio' : 'Nuevo servicio' }}</div>
          <button class="text-slate-400" (click)="closeModal()">X</button>
        </div>

        <form class="mt-4 space-y-4" [formGroup]="form" (ngSubmit)="save()">
          <div>
            <label class="text-xs font-semibold uppercase tracking-wide text-slate-600">Nombre</label>
            <input
              formControlName="name"
              class="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              placeholder="Hosting, Soporte, Website..."
            />
          </div>

          <div class="grid gap-4 md:grid-cols-2">
            <div>
              <label class="text-xs font-semibold uppercase tracking-wide text-slate-600">Tipo</label>
              <select
                formControlName="billingType"
                class="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              >
                <option value="recurring">Recurrente</option>
                <option value="one_time">Unico</option>
              </select>
            </div>
            <div>
              <label class="text-xs font-semibold uppercase tracking-wide text-slate-600">Periodo</label>
              <select
                formControlName="defaultPeriod"
                class="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              >
                <option value="">Sin definir</option>
                <option value="monthly">Mensual</option>
                <option value="annual">Anual</option>
                <option value="one_time">Unico</option>
              </select>
            </div>
          </div>

          <div>
            <label class="text-xs font-semibold uppercase tracking-wide text-slate-600">Descripcion</label>
            <textarea
              formControlName="description"
              class="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              rows="3"
            ></textarea>
          </div>

          <div *ngIf="editing" class="flex items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" formControlName="isActive" class="h-4 w-4" />
            <span>Activo</span>
          </div>

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
export class ServicesComponent implements OnInit {
  services: ServiceItem[] = [];
  isLoading = false;
  isSaving = false;
  error = '';
  isModalOpen = false;
  editing: ServiceItem | null = null;

  constructor(
    private readonly fb: FormBuilder,
    private readonly servicesApi: ServicesApiService,
  ) {
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      billingType: ['recurring', [Validators.required]],
      defaultPeriod: [''],
      description: [''],
      isActive: [true],
    });
  }

  form: FormGroup;

  ngOnInit() {
    this.load();
  }

  load() {
    this.isLoading = true;
    this.error = '';
    this.servicesApi.list().subscribe({
      next: (items) => {
        this.services = items;
        this.isLoading = false;
      },
      error: () => {
        this.error = 'No se pudo cargar el catalogo';
        this.isLoading = false;
      },
    });
  }

  openCreate() {
    this.editing = null;
    this.form.reset({
      name: '',
      billingType: 'recurring',
      defaultPeriod: '',
      description: '',
      isActive: true,
    });
    this.isModalOpen = true;
  }

  openEdit(item: ServiceItem) {
    this.editing = item;
    this.form.reset({
      name: item.name,
      billingType: item.billingType,
      defaultPeriod: item.defaultPeriod ?? '',
      description: item.description ?? '',
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
    const defaultPeriod = (this.form.value.defaultPeriod || undefined) as
      | 'monthly'
      | 'annual'
      | 'one_time'
      | undefined;
    const basePayload = {
      name: this.form.value.name ?? '',
      billingType: (this.form.value.billingType ?? 'recurring') as 'recurring' | 'one_time',
      defaultPeriod,
      description: this.form.value.description || undefined,
    };

    if (this.editing) {
      this.servicesApi
        .update(this.editing._id, {
          ...basePayload,
          isActive: this.form.value.isActive ?? true,
        })
        .subscribe({
          next: () => {
            this.isSaving = false;
            this.isModalOpen = false;
            this.load();
          },
          error: () => {
            this.isSaving = false;
            this.error = 'No se pudo guardar el servicio';
          },
        });
      return;
    }

    this.servicesApi.create(basePayload).subscribe({
      next: () => {
        this.isSaving = false;
        this.isModalOpen = false;
        this.load();
      },
      error: () => {
        this.isSaving = false;
        this.error = 'No se pudo crear el servicio';
      },
    });
  }

  toggleStatus(item: ServiceItem) {
    this.servicesApi.update(item._id, { isActive: !item.isActive }).subscribe({
      next: () => this.load(),
      error: () => {
        this.error = 'No se pudo actualizar el estado';
      },
    });
  }

  remove(item: ServiceItem) {
    const confirmed = confirm(`Eliminar servicio ${item.name}?`);
    if (!confirmed) {
      return;
    }
    this.servicesApi.remove(item._id).subscribe({
      next: () => this.load(),
      error: () => {
        this.error = 'No se pudo eliminar el servicio';
      },
    });
  }

  formatPeriod(period?: 'monthly' | 'annual' | 'one_time') {
    if (!period) {
      return '-';
    }
    if (period === 'monthly') {
      return 'Mensual';
    }
    if (period === 'annual') {
      return 'Anual';
    }
    return 'Unico';
  }
}
