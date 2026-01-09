import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ClientsApiService } from '../../core/services/clients-api.service';
import { EstimatesApiService } from '../../core/services/estimates-api.service';
import { ServicesApiService } from '../../core/services/services-api.service';
import { ClientItem } from '../../core/models/client.model';
import { EstimateItem } from '../../core/models/estimate.model';
import { ServiceItem } from '../../core/models/service.model';

@Component({
  selector: 'app-estimates',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  template: `
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <div>
          <div class="text-2xl font-semibold">Cotizaciones</div>
          <div class="text-sm text-slate-500">Gestion de cotizaciones y conversion a contratos</div>
        </div>
        <button
          class="rounded bg-slate-900 px-3 py-2 text-xs uppercase tracking-wide text-white"
          (click)="openCreate()"
        >
          Nueva cotizacion
        </button>
      </div>

      <div class="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm lg:grid-cols-4">
        <input
          type="text"
          [(ngModel)]="search"
          (keyup.enter)="load()"
          class="rounded-lg border border-slate-200 px-3 py-2 text-sm"
          placeholder="Buscar por titulo"
        />
        <select
          [(ngModel)]="statusFilter"
          class="rounded-lg border border-slate-200 px-3 py-2 text-sm"
        >
          <option value="">Todos los estados</option>
          <option value="draft">Borrador</option>
          <option value="sent">Enviada</option>
          <option value="accepted">Aceptada</option>
          <option value="rejected">Rechazada</option>
          <option value="expired">Vencida</option>
          <option value="converted">Convertida</option>
        </select>
        <select
          [(ngModel)]="clientFilter"
          class="rounded-lg border border-slate-200 px-3 py-2 text-sm"
        >
          <option value="">Todos los clientes</option>
          <option *ngFor="let client of clients" [value]="client._id">
            {{ client.name }}
          </option>
        </select>
        <button
          class="rounded bg-slate-900 px-3 py-2 text-xs uppercase tracking-wide text-white"
          (click)="load()"
        >
          Filtrar
        </button>
      </div>

      <div class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div *ngIf="isLoading" class="text-sm text-slate-500">Cargando cotizaciones...</div>
        <div *ngIf="error" class="text-sm text-red-600">{{ error }}</div>

        <table *ngIf="!isLoading" class="mt-2 w-full text-sm">
          <thead class="text-left text-xs uppercase tracking-wide text-slate-400">
            <tr>
              <th class="py-2">Cliente</th>
              <th class="py-2">Servicio</th>
              <th class="py-2">Periodo</th>
              <th class="py-2">Monto</th>
              <th class="py-2">Estado</th>
              <th class="py-2">Creada</th>
              <th class="py-2 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let item of estimates" class="border-t border-slate-100">
              <td class="py-3">
                <div class="font-medium text-slate-900">{{ getClientName(item) }}</div>
                <div class="text-xs text-slate-500">{{ item.title || '-' }}</div>
              </td>
              <td class="py-3">{{ getServiceName(item) }}</td>
              <td class="py-3">{{ formatPeriod(item.billingPeriod) }}</td>
              <td class="py-3">{{ formatMoney(item.amount, item.currency) }}</td>
              <td class="py-3">
                <span class="rounded-full px-2 py-1 text-xs" [ngClass]="statusClass(item.status)">
                  {{ formatStatus(item.status) }}
                </span>
              </td>
              <td class="py-3">{{ formatDate(item.createdAt) }}</td>
              <td class="py-3 text-right">
                <button
                  class="text-xs text-slate-700"
                  (click)="openEdit(item)"
                  [disabled]="item.status === 'converted'"
                >
                  Editar
                </button>
                <button
                  class="ml-3 text-xs text-emerald-600"
                  (click)="openConvert(item)"
                  [disabled]="item.status === 'converted' || item.status === 'rejected' || item.status === 'expired'"
                >
                  Convertir
                </button>
                <button class="ml-3 text-xs text-slate-400" (click)="remove(item)">Eliminar</button>
              </td>
            </tr>
            <tr *ngIf="estimates.length === 0 && !isLoading">
              <td colspan="7" class="py-6 text-center text-sm text-slate-500">
                Sin cotizaciones registradas
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
      <div class="w-full max-w-3xl rounded-2xl bg-white p-6 shadow-xl">
        <div class="flex items-center justify-between">
          <div class="text-lg font-semibold">{{ editing ? 'Editar cotizacion' : 'Nueva cotizacion' }}</div>
          <button class="text-slate-400" (click)="closeModal()">X</button>
        </div>

        <form class="mt-4 space-y-4" [formGroup]="form" (ngSubmit)="save()">
          <div class="grid gap-4 md:grid-cols-2">
            <div>
              <label class="text-xs font-semibold uppercase tracking-wide text-slate-600">Cliente</label>
              <select
                formControlName="clientId"
                class="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              >
                <option value="">Seleccionar cliente</option>
                <option *ngFor="let client of clients" [value]="client._id">
                  {{ client.name }}
                </option>
              </select>
            </div>
            <div>
              <label class="text-xs font-semibold uppercase tracking-wide text-slate-600">Servicio</label>
              <select
                formControlName="serviceId"
                class="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              >
                <option value="">Seleccionar servicio</option>
                <option *ngFor="let service of services" [value]="service._id">
                  {{ service.name }}
                </option>
              </select>
            </div>
          </div>

          <div class="grid gap-4 md:grid-cols-2">
            <div>
              <label class="text-xs font-semibold uppercase tracking-wide text-slate-600">Titulo</label>
              <input
                formControlName="title"
                class="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                placeholder="Hosting principal"
              />
            </div>
            <div>
              <label class="text-xs font-semibold uppercase tracking-wide text-slate-600">Estado</label>
              <select
                formControlName="status"
                class="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              >
                <option value="draft">Borrador</option>
                <option value="sent">Enviada</option>
                <option value="accepted">Aceptada</option>
                <option value="rejected">Rechazada</option>
                <option value="expired">Vencida</option>
              </select>
            </div>
          </div>

          <div class="grid gap-4 md:grid-cols-4">
            <div>
              <label class="text-xs font-semibold uppercase tracking-wide text-slate-600">Periodo</label>
              <select
                formControlName="billingPeriod"
                class="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              >
                <option value="monthly">Mensual</option>
                <option value="annual">Anual</option>
                <option value="one_time">Unico</option>
              </select>
            </div>
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
              <select
                formControlName="currency"
                class="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              >
                <option *ngFor="let currency of currencies" [value]="currency">
                  {{ currency }}
                </option>
              </select>
            </div>
          </div>

          <div>
            <label class="text-xs font-semibold uppercase tracking-wide text-slate-600">Notas</label>
            <textarea
              formControlName="notes"
              class="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              rows="3"
            ></textarea>
          </div>

          <div *ngIf="validationError" class="text-sm text-red-600">{{ validationError }}</div>

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
      *ngIf="isConvertOpen"
      class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4"
    >
      <div class="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl">
        <div class="flex items-center justify-between">
          <div class="text-lg font-semibold">Convertir a contrato</div>
          <button class="text-slate-400" (click)="closeConvert()">X</button>
        </div>

        <form class="mt-4 space-y-4" [formGroup]="convertForm" (ngSubmit)="convert()">
          <div class="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            Ajusta el precio y agrega notas antes de crear el contrato.
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
              <label class="text-xs font-semibold uppercase tracking-wide text-slate-600">Inicio</label>
              <input
                formControlName="startDate"
                type="date"
                class="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
            </div>
            <div *ngIf="convertForm.value.billingPeriod !== 'one_time'">
              <label class="text-xs font-semibold uppercase tracking-wide text-slate-600">Vence</label>
              <input
                formControlName="endDate"
                type="date"
                class="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div class="grid gap-4 md:grid-cols-2">
            <div>
              <label class="text-xs font-semibold uppercase tracking-wide text-slate-600">Notas del contrato</label>
              <textarea
                formControlName="contractNotes"
                class="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                rows="3"
              ></textarea>
            </div>
            <div>
              <label class="text-xs font-semibold uppercase tracking-wide text-slate-600">Notas de conversion</label>
              <textarea
                formControlName="conversionNotes"
                class="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                rows="3"
              ></textarea>
            </div>
          </div>

          <div *ngIf="convertError" class="text-sm text-red-600">{{ convertError }}</div>

          <div class="flex justify-end gap-3">
            <button type="button" class="text-sm text-slate-500" (click)="closeConvert()">
              Cancelar
            </button>
            <button
              type="submit"
              class="rounded bg-slate-900 px-4 py-2 text-xs uppercase tracking-wide text-white"
              [disabled]="convertForm.invalid || isConverting"
            >
              {{ isConverting ? 'Convirtiendo...' : 'Convertir' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
})
export class EstimatesComponent implements OnInit {
  estimates: EstimateItem[] = [];
  clients: ClientItem[] = [];
  services: ServiceItem[] = [];
  currencies: Array<'USD' | 'NIO'> = ['USD', 'NIO'];

  isLoading = false;
  isSaving = false;
  isConverting = false;
  error = '';
  validationError = '';
  convertError = '';
  isModalOpen = false;
  isConvertOpen = false;
  editing: EstimateItem | null = null;
  converting: EstimateItem | null = null;

  search = '';
  statusFilter = '';
  clientFilter = '';

  form: FormGroup;
  convertForm: FormGroup;

  constructor(
    private readonly fb: FormBuilder,
    private readonly estimatesApi: EstimatesApiService,
    private readonly clientsApi: ClientsApiService,
    private readonly servicesApi: ServicesApiService,
  ) {
    this.form = this.fb.group({
      clientId: ['', Validators.required],
      serviceId: ['', Validators.required],
      title: [''],
      billingPeriod: ['monthly', Validators.required],
      amount: [0, [Validators.required, Validators.min(0)]],
      currency: ['USD', Validators.required],
      status: ['draft', Validators.required],
      notes: [''],
    });

    this.convertForm = this.fb.group({
      amount: [0, [Validators.required, Validators.min(0)]],
      billingPeriod: ['monthly'],
      startDate: ['', Validators.required],
      endDate: [''],
      contractNotes: [''],
      conversionNotes: [''],
    });
  }

  ngOnInit() {
    this.load();
    this.loadReferences();
  }

  loadReferences() {
    this.clientsApi.list().subscribe({
      next: (response) => (this.clients = response.items),
      error: () => {
        this.error = 'No se pudieron cargar los clientes';
      },
    });
    this.servicesApi.list().subscribe({
      next: (items) => (this.services = items),
      error: () => {
        this.error = 'No se pudieron cargar los servicios';
      },
    });
  }

  load() {
    this.isLoading = true;
    this.error = '';
    this.estimatesApi
      .list({
        clientId: this.clientFilter || undefined,
        status: this.statusFilter || undefined,
        search: this.search || undefined,
      })
      .subscribe({
        next: (response) => {
          this.estimates = response.items;
          this.isLoading = false;
        },
        error: () => {
          this.error = 'No se pudieron cargar las cotizaciones';
          this.isLoading = false;
        },
      });
  }

  openCreate() {
    this.editing = null;
    this.validationError = '';
    this.form.reset({
      clientId: '',
      serviceId: '',
      title: '',
      billingPeriod: 'monthly',
      amount: 0,
      currency: 'USD',
      status: 'draft',
      notes: '',
    });
    this.isModalOpen = true;
  }

  openEdit(item: EstimateItem) {
    this.editing = item;
    this.validationError = '';
    this.form.reset({
      clientId: this.resolveId(item.clientId),
      serviceId: this.resolveId(item.serviceId),
      title: item.title ?? '',
      billingPeriod: item.billingPeriod,
      amount: item.amount,
      currency: item.currency,
      status: item.status === 'converted' ? 'accepted' : item.status,
      notes: item.notes ?? '',
    });
    this.isModalOpen = true;
  }

  closeModal() {
    this.isModalOpen = false;
  }

  save() {
    if (this.form.invalid) {
      this.validationError = 'Completa los campos obligatorios';
      return;
    }
    this.isSaving = true;
    this.validationError = '';

    const payload = {
      clientId: this.form.value.clientId ?? '',
      serviceId: this.form.value.serviceId ?? '',
      title: this.form.value.title || undefined,
      billingPeriod: this.form.value.billingPeriod ?? 'monthly',
      amount: Number(this.form.value.amount ?? 0),
      currency: this.form.value.currency ?? 'USD',
      status: this.form.value.status ?? 'draft',
      notes: this.form.value.notes || undefined,
    };

    if (this.editing) {
      this.estimatesApi.update(this.editing._id, payload).subscribe({
        next: () => {
          this.isSaving = false;
          this.isModalOpen = false;
          this.load();
        },
        error: () => {
          this.isSaving = false;
          this.validationError = 'No se pudo guardar la cotizacion';
        },
      });
      return;
    }

    this.estimatesApi.create(payload).subscribe({
      next: () => {
        this.isSaving = false;
        this.isModalOpen = false;
        this.load();
      },
      error: () => {
        this.isSaving = false;
        this.validationError = 'No se pudo crear la cotizacion';
      },
    });
  }

  remove(item: EstimateItem) {
    this.estimatesApi.remove(item._id).subscribe({
      next: () => this.load(),
      error: () => {
        this.error = 'No se pudo eliminar la cotizacion';
      },
    });
  }

  openConvert(item: EstimateItem) {
    this.converting = item;
    this.convertError = '';
    this.convertForm.reset({
      amount: item.amount,
      billingPeriod: item.billingPeriod,
      startDate: this.todayISO(),
      endDate: '',
      contractNotes: item.notes ?? '',
      conversionNotes: '',
    });
    this.isConvertOpen = true;
  }

  closeConvert() {
    this.isConvertOpen = false;
    this.converting = null;
  }

  convert() {
    if (this.convertForm.invalid || !this.converting) {
      this.convertError = 'Completa la informacion requerida';
      return;
    }
    this.isConverting = true;
    this.convertError = '';

    const payload = {
      amount: Number(this.convertForm.value.amount ?? 0),
      billingPeriod: this.convertForm.value.billingPeriod ?? this.converting.billingPeriod,
      startDate: this.convertForm.value.startDate ?? '',
      endDate: this.convertForm.value.endDate || undefined,
      contractNotes: this.convertForm.value.contractNotes || undefined,
      conversionNotes: this.convertForm.value.conversionNotes || undefined,
    };

    this.estimatesApi.convert(this.converting._id, payload).subscribe({
      next: () => {
        this.isConverting = false;
        this.isConvertOpen = false;
        this.converting = null;
        this.load();
      },
      error: () => {
        this.isConverting = false;
        this.convertError = 'No se pudo convertir la cotizacion';
      },
    });
  }

  getClientName(item: EstimateItem) {
    if (typeof item.clientId === 'string') {
      return this.clients.find((client) => client._id === item.clientId)?.name ?? 'Cliente';
    }
    return item.clientId?.name ?? 'Cliente';
  }

  getServiceName(item: EstimateItem) {
    if (typeof item.serviceId === 'string') {
      return this.services.find((service) => service._id === item.serviceId)?.name ?? 'Servicio';
    }
    return item.serviceId?.name ?? 'Servicio';
  }

  resolveId(value: string | { _id: string }) {
    return typeof value === 'string' ? value : value?._id;
  }

  formatPeriod(period?: string) {
    switch (period) {
      case 'monthly':
        return 'Mensual';
      case 'annual':
        return 'Anual';
      case 'one_time':
        return 'Unico';
      default:
        return 'N/D';
    }
  }

  formatStatus(status: EstimateItem['status']) {
    switch (status) {
      case 'draft':
        return 'Borrador';
      case 'sent':
        return 'Enviada';
      case 'accepted':
        return 'Aceptada';
      case 'rejected':
        return 'Rechazada';
      case 'expired':
        return 'Vencida';
      case 'converted':
        return 'Convertida';
      default:
        return status;
    }
  }

  statusClass(status: EstimateItem['status']) {
    switch (status) {
      case 'draft':
        return 'bg-slate-100 text-slate-600';
      case 'sent':
        return 'bg-blue-100 text-blue-700';
      case 'accepted':
        return 'bg-emerald-100 text-emerald-700';
      case 'rejected':
        return 'bg-rose-100 text-rose-700';
      case 'expired':
        return 'bg-amber-100 text-amber-700';
      case 'converted':
        return 'bg-indigo-100 text-indigo-700';
      default:
        return 'bg-slate-100 text-slate-600';
    }
  }

  formatMoney(amount: number, currency: 'USD' | 'NIO') {
    const label = currency ?? 'USD';
    return `${label} ${Number(amount || 0).toFixed(2)}`;
  }

  formatDate(value?: string) {
    if (!value) {
      return '-';
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '-';
    }
    return date.toLocaleDateString('es-NI');
  }

  todayISO() {
    const now = new Date();
    return now.toISOString().slice(0, 10);
  }
}
