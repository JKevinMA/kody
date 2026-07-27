import { Injectable } from '@angular/core';
import { Product } from './product.model';

@Injectable({ providedIn: 'root' })
export class CatalogService {
  private db?: IDBDatabase;
  async init() { this.db = await new Promise<IDBDatabase>((resolve, reject) => { const r = indexedDB.open('catalogo-rapido', 1); r.onupgradeneeded = () => { const p = r.result.createObjectStore('products', { keyPath: 'id', autoIncrement: true }); p.createIndex('barcode', 'barcode', { unique: true }); r.result.createObjectStore('history', { keyPath: 'barcode' }); }; r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); }); if (!(await this.all()).length) await this.seed(); }
  private store(n: string, m: IDBTransactionMode = 'readonly') { return this.db!.transaction(n, m).objectStore(n); }
  private req<T>(r: IDBRequest<T>) { return new Promise<T>((resolve, reject) => { r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); }); }
  all() { return this.req(this.store('products').getAll()); }
  async search(term: string) { const t = term.toLowerCase(); return (await this.all()).filter(p => p.name.toLowerCase().includes(t) || p.barcode.includes(term)); }
  async byBarcode(barcode: string) { const p = await this.req(this.store('products').index('barcode').get(barcode)); if (p) await this.req(this.store('history', 'readwrite').put({ ...p, viewedAt: Date.now() })); return p; }
  save(product: Product) { return this.req(this.store('products', 'readwrite').put(product)); }
  async upsert(product: Product) { const current=await this.req(this.store('products').index('barcode').get(product.barcode)); return this.save({ ...product, id: current?.id }); }
  async recent() { const r = await this.req(this.store('history').getAll()) as (Product & { viewedAt: number })[]; return r.sort((a,b) => b.viewedAt-a.viewedAt).slice(0,5); }
  private async seed() { for (const p of [{barcode:'7750182001123',name:'Agua mineral 625 ml',price:2.5,presentations:[{name:'Botella',units:1,price:2.5}],tags:['Bebidas']},{barcode:'7751271009872',name:'Galletas de vainilla',price:3.9,presentations:[{name:'Unidad',units:1,price:3.9}],tags:['Snacks','Oferta']},{barcode:'7501055362843',name:'Detergente líquido 1 L',price:15.9,presentations:[{name:'Botella',units:1,price:15.9}],tags:['Limpieza']}]) await this.save({...p,updatedAt:Date.now()}); }
}
