import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ContractsApiService } from '../../core/services/contracts-api.service';
import { ClientsApiService } from '../../core/services/clients-api.service';
import { ServicesApiService } from '../../core/services/services-api.service';
import { ContractItem } from '../../core/models/contract.model';
import { ClientItem } from '../../core/models/client.model';
import { ServiceItem } from '../../core/models/service.model';

@Component({
  selector: 'app-contracts',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  template: `
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <div>
          <div class="text-2xl font-semibold">Contratos</div>
          <div class="text-sm text-slate-500">Gestion de contratos y vencimientos</div>
        </div>
        <button
          class="rounded bg-slate-900 px-3 py-2 text-xs uppercase tracking-wide text-white"
          (click)="openCreate()"
        >
          Nuevo contrato
        </button>
      </div>

      <div class="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm lg:grid-cols-6">
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
          <option value="active">Activo</option>
          <option value="expired">Vencido</option>
          <option value="cancelled">Cancelado</option>
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
        <div class="flex gap-2 lg:col-span-2">
          <input
            type="date"
            [(ngModel)]="dueFrom"
            class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
          <input
            type="date"
            [(ngModel)]="dueTo"
            class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
        </div>
        <button
          class="rounded bg-slate-900 px-3 py-2 text-xs uppercase tracking-wide text-white"
          (click)="load()"
        >
          Filtrar
        </button>
      </div>

      <div class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div *ngIf="isLoading" class="text-sm text-slate-500">Cargando contratos...</div>
        <div *ngIf="error" class="text-sm text-red-600">{{ error }}</div>

        <table *ngIf="!isLoading" class="mt-2 w-full text-sm">
          <thead class="text-left text-xs uppercase tracking-wide text-slate-400">
            <tr>
              <th class="py-2">Cliente</th>
              <th class="py-2">Servicio</th>
              <th class="py-2">Periodo</th>
              <th class="py-2">Monto</th>
              <th class="py-2">Pagado</th>
              <th class="py-2">Balance</th>
              <th class="py-2">Vence</th>
              <th class="py-2">Estado</th>
              <th class="py-2 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let item of contracts" class="border-t border-slate-100">
              <td class="py-3">
                <div class="font-medium text-slate-900">{{ getClientName(item) }}</div>
                <div class="text-xs text-slate-500">{{ item.title || '-' }}</div>
              </td>
              <td class="py-3">{{ getServiceName(item) }}</td>
              <td class="py-3">{{ formatPeriod(item.billingPeriod) }}</td>
              <td class="py-3">{{ formatMoney(item.amount, resolveCurrency(item.currency)) }}</td>
              <td class="py-3">{{ formatMoney(item.paidTotal || 0, resolveCurrency(item.currency)) }}</td>
              <td class="py-3">{{ formatMoney(item.balance || 0, resolveCurrency(item.currency)) }}</td>
              <td class="py-3">{{ formatDate(item.endDate) }}</td>
              <td class="py-3">
                <span class="rounded-full px-2 py-1 text-xs" [ngClass]="statusClass(item.status)">
                  {{ formatStatus(item.status) }}
                </span>
              </td>
              <td class="py-3 text-right">
                <button class="text-xs text-slate-700" (click)="openEdit(item)">Editar</button>
                <button
                  class="ml-3 text-xs text-amber-600"
                  (click)="cancel(item)"
                  [disabled]="item.status === 'cancelled'"
                >
                  Cancelar
                </button>
                <button class="ml-3 text-xs text-slate-400" (click)="remove(item)">Eliminar</button>
              </td>
            </tr>
            <tr *ngIf="contracts.length === 0 && !isLoading">
              <td colspan="9" class="py-6 text-center text-sm text-slate-500">
                Sin contratos registrados
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
          <div class="text-lg font-semibold">{{ editing ? 'Editar contrato' : 'Nuevo contrato' }}</div>
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
                <option value="active">Activo</option>
                <option value="expired">Vencido</option>
                <option value="cancelled">Cancelado</option>
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
            <div>
              <label class="text-xs font-semibold uppercase tracking-wide text-slate-600">Inicio</label>
              <input
                formControlName="startDate"
                type="date"
                class="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div>
            <label class="text-xs font-semibold uppercase tracking-wide text-slate-600">Vence</label>
            <input
              formControlName="endDate"
              type="date"
              class="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
            <div *ngIf="form.value.billingPeriod === 'one_time'" class="mt-1 text-xs text-slate-400">
              Opcional para contratos unicos.
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
  `,
})
export class ContractsComponent implements OnInit {
  contracts: ContractItem[] = [];
  clients: ClientItem[] = [];
  services: ServiceItem[] = [];
  isLoading = false;
  isSaving = false;
  isModalOpen = false;
  error = '';
  validationError = '';

  search = '';
  statusFilter = '';
  clientFilter = '';
  dueFrom = '';
  dueTo = '';

  editing: ContractItem | null = null;
  form: FormGroup;
  currencies: Array<'USD' | 'NIO'> = ['USD', 'NIO'];

  constructor(
    private readonly fb: FormBuilder,
    private readonly contractsApi: ContractsApiService,
    private readonly clientsApi: ClientsApiService,
    private readonly servicesApi: ServicesApiService,
  ) {
    this.form = this.fb.group({
      clientId: ['', [Validators.required]],
      serviceId: ['', [Validators.required]],
      title: [''],
      billingPeriod: ['monthly', [Validators.required]],
      amount: [0, [Validators.required, Validators.min(0)]],
      currency: ['USD', [Validators.required]],
      startDate: ['', [Validators.required]],
      endDate: [''],
      status: ['active'],
      notes: [''],
    });
  }

  ngOnInit() {
    this.loadDependencies();
    this.load();
  }

  loadDependencies() {
    this.clientsApi.list({ isActive: true, limit: 200 }).subscribe({
      next: (response) => {
        this.clients = response.items;
      },
    });

    this.servicesApi.list().subscribe({
      next: (items) => {
        this.services = items.filter((service) => service.isActive);
      },
    });
  }

  load() {
    this.isLoading = true;
    this.error = '';
    this.contractsApi
      .list({
        search: this.search || undefined,
        status: this.statusFilter || undefined,
        clientId: this.clientFilter || undefined,
        dueFrom: this.dueFrom || undefined,
        dueTo: this.dueTo || undefined,
      })
      .subscribe({
        next: (response) => {
          this.contracts = response.items;
          this.isLoading = false;
        },
        error: () => {
          this.error = 'No se pudo cargar el listado';
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
      startDate: '',
      endDate: '',
      status: 'active',
      notes: '',
    });
    this.isModalOpen = true;
  }

  openEdit(item: ContractItem) {
    this.editing = item;
    this.validationError = '';
    this.form.reset({
      clientId: this.getClientId(item),
      serviceId: this.getServiceId(item),
      title: item.title ?? '',
      billingPeriod: item.billingPeriod,
      amount: item.amount,
      currency: this.resolveCurrency(item.currency),
      startDate: this.toDateInput(item.startDate),
      endDate: this.toDateInput(item.endDate),
      status: item.status,
      notes: item.notes ?? '',
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

    const billingPeriod = this.form.value.billingPeriod as 'monthly' | 'annual' | 'one_time';
    const endDate = this.form.value.endDate || undefined;
    if (billingPeriod !== 'one_time' && !endDate) {
      this.validationError = 'endDate es requerido para contratos recurrentes';
      return;
    }

    this.isSaving = true;
    this.validationError = '';
    const payload = {
      clientId: this.form.value.clientId ?? '',
      serviceId: this.form.value.serviceId ?? '',
      title: this.form.value.title || undefined,
      billingPeriod,
      amount: Number(this.form.value.amount ?? 0),
      currency: this.form.value.currency || 'USD',
      startDate: this.form.value.startDate ?? '',
      endDate,
      status: (this.form.value.status || 'active') as 'active' | 'expired' | 'cancelled',
      notes: this.form.value.notes || undefined,
    };

    if (this.editing) {
      this.contractsApi.update(this.editing._id, payload).subscribe({
        next: () => {
          this.isSaving = false;
          this.isModalOpen = false;
          this.load();
        },
        error: () => {
          this.isSaving = false;
          this.error = 'No se pudo guardar el contrato';
        },
      });
      return;
    }

    this.contractsApi.create(payload).subscribe({
      next: () => {
        this.isSaving = false;
        this.isModalOpen = false;
        this.load();
      },
      error: () => {
        this.isSaving = false;
        this.error = 'No se pudo crear el contrato';
      },
    });
  }

  cancel(item: ContractItem) {
    if (item.status === 'cancelled') {
      return;
    }
    this.contractsApi.cancel(item._id).subscribe({
      next: () => this.load(),
      error: () => {
        this.error = 'No se pudo cancelar el contrato';
      },
    });
  }

  remove(item: ContractItem) {
    const confirmed = confirm(`Eliminar contrato ${item.title || item._id}?`);
    if (!confirmed) {
      return;
    }
    this.contractsApi.remove(item._id).subscribe({
      next: () => this.load(),
      error: () => {
        this.error = 'No se pudo eliminar el contrato';
      },
    });
  }

  getClientName(item: ContractItem) {
    if (typeof item.clientId === 'string') {
      return this.clients.find((client) => client._id === item.clientId)?.name ?? item.clientId;
    }
    return item.clientId?.name ?? '-';
  }

  getServiceName(item: ContractItem) {
    if (typeof item.serviceId === 'string') {
      return this.services.find((service) => service._id === item.serviceId)?.name ?? item.serviceId;
    }
    return item.serviceId?.name ?? '-';
  }

  getClientId(item: ContractItem) {
    return typeof item.clientId === 'string' ? item.clientId : item.clientId?._id ?? '';
  }

  getServiceId(item: ContractItem) {
    return typeof item.serviceId === 'string' ? item.serviceId : item.serviceId?._id ?? '';
  }

  formatPeriod(period: 'monthly' | 'annual' | 'one_time') {
    if (period === 'monthly') {
      return 'Mensual';
    }
    if (period === 'annual') {
      return 'Anual';
    }
    return 'Unico';
  }

  formatStatus(status: 'active' | 'expired' | 'cancelled') {
    if (status === 'active') {
      return 'Activo';
    }
    if (status === 'expired') {
      return 'Vencido';
    }
    return 'Cancelado';
  }

  statusClass(status: 'active' | 'expired' | 'cancelled') {
    if (status === 'active') {
      return 'bg-emerald-100 text-emerald-700';
    }
    if (status === 'expired') {
      return 'bg-amber-100 text-amber-700';
    }
    return 'bg-slate-100 text-slate-500';
  }

  formatDate(date?: string) {
    if (!date) {
      return '-';
    }
    return new Date(date).toLocaleDateString('es-ES');
  }

  toDateInput(date?: string) {
    if (!date) {
      return '';
    }
    const d = new Date(date);
    if (Number.isNaN(d.getTime())) {
      return '';
    }
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${month}-${day}`;
  }

  formatMoney(amount: number, currency: string) {
    const value = Number(amount ?? 0).toFixed(2);
    return `${currency} ${value}`;
  }

  resolveCurrency(currency?: string): 'USD' | 'NIO' {
    return currency === 'NIO' ? 'NIO' : 'USD';
  }
}
