import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CatalogService } from './catalog.service';
import { Product } from './product.model';
declare const BarcodeDetector: any;

@Component({ selector: 'app-root', standalone: true, imports: [CommonModule, FormsModule], templateUrl: './app.component.html' })
export class AppComponent implements OnInit {
  tab = signal<'search'|'register'>('search'); query=''; results:Product[]=[]; recent:Product[]=[]; selected?:Product; message=''; scanning=false; draft=this.empty();
  constructor(private catalog:CatalogService) {}
  async ngOnInit() { await this.catalog.init(); this.recent=await this.catalog.recent(); }
  async find() { this.results=this.query.trim()?await this.catalog.search(this.query.trim()):[]; }
  async lookup(code:string) { const p=await this.catalog.byBarcode(code); if(p){ this.selected=p; this.recent=await this.catalog.recent(); navigator.vibrate?.(80); } else { this.message=`No encontramos el código ${code}. Regístralo a continuación.`; this.draft=this.empty(code); this.tab.set('register'); } }
  async scan(target:'search'|'register') { this.tab.set(target); if (!('BarcodeDetector' in window) || !navigator.mediaDevices?.getUserMedia) { this.message='Este navegador no permite lectura por cámara. Ingresa el código manualmente.'; return; } this.scanning=true; await new Promise(requestAnimationFrame); const video=document.querySelector('#scanner-video') as HTMLVideoElement; try { const stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'}}}); video.srcObject=stream; await video.play(); const detector=new BarcodeDetector({formats:['ean_13','ean_8','code_128','upc_a','upc_e']}); const timer=window.setInterval(async()=>{ const codes=await detector.detect(video); if(codes[0]?.rawValue){ clearInterval(timer); stream.getTracks().forEach(t=>t.stop()); this.scanning=false; target==='search' ? this.lookup(codes[0].rawValue) : this.draft.barcode=codes[0].rawValue; navigator.vibrate?.(80); } },300); } catch { this.scanning=false; this.message='No se pudo abrir la cámara. Revisa sus permisos.'; } }
  async save() { if(!this.draft.barcode || !this.draft.name || !this.draft.price){this.message='Completa código, nombre y precio.';return;} this.draft.tags=this.draft.tags.filter(Boolean); this.draft.updatedAt=Date.now(); await this.catalog.save({...this.draft}); this.message='Producto guardado correctamente.'; this.draft=this.empty(); this.tab.set('search'); }
  onImage(e:Event) { const f=(e.target as HTMLInputElement).files?.[0]; if(!f)return; const r=new FileReader(); r.onload=()=>this.draft.image=r.result as string; r.readAsDataURL(f); }
  private empty(barcode=''):Product { return {barcode,name:'',price:0,stock:0,tags:[],updatedAt:0}; }
}
