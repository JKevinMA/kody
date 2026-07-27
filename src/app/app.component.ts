import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BarcodeFormat, BrowserMultiFormatReader, IScannerControls } from '@zxing/browser';
import { CatalogService } from './catalog.service';
import { Product } from './product.model';

@Component({ selector: 'app-root', standalone: true, imports: [CommonModule, FormsModule], templateUrl: './app.component.html' })
export class AppComponent implements OnInit, OnDestroy {
  tab = signal<'search'|'register'>('search'); query=''; results:Product[]=[]; recent:Product[]=[]; selected?:Product; message=''; scanning=false; draft=this.empty();
  private scanner?: IScannerControls;
  constructor(private catalog:CatalogService) {}
  async ngOnInit() { await this.catalog.init(); this.recent=await this.catalog.recent(); }
  ngOnDestroy() { this.stopScanner(); }
  async find() { this.results=this.query.trim()?await this.catalog.search(this.query.trim()):[]; }
  async lookup(code:string) { const p=await this.catalog.byBarcode(code); if(p){ this.selected=p; this.recent=await this.catalog.recent(); navigator.vibrate?.(80); } else { this.message=`No encontramos el código ${code}. Regístralo a continuación.`; this.draft=this.empty(code); this.tab.set('register'); } }
  async scan(target:'search'|'register') {
    this.tab.set(target);
    this.message='';
    if (!window.isSecureContext) {
      this.message='Para usar la cámara en iPhone, abre la aplicación mediante HTTPS; la dirección IP por HTTP no tiene permiso.';
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      this.message='Este navegador no permite abrir la cámara. Ingresa el código manualmente.';
      return;
    }

    this.stopScanner();
    this.scanning=true;
    await new Promise(requestAnimationFrame);
    const video=document.querySelector('#scanner-video') as HTMLVideoElement | null;
    if (!video) {
      this.stopScanner();
      return;
    }

    try {
      const reader=new BrowserMultiFormatReader();
      reader.possibleFormats=[BarcodeFormat.EAN_13, BarcodeFormat.EAN_8, BarcodeFormat.CODE_128, BarcodeFormat.UPC_A, BarcodeFormat.UPC_E];
      this.scanner=await reader.decodeFromConstraints(
        { video: { facingMode: { ideal: 'environment' } }, audio: false },
        video,
        (result, _error, controls) => {
          if (!result || !this.scanning) return;
          this.stopScanner();
          target==='search' ? this.lookup(result.getText()) : this.draft.barcode=result.getText();
          navigator.vibrate?.(80);
        },
      );
    } catch {
      this.stopScanner();
      this.message='No se pudo abrir la cámara. Revisa sus permisos.';
    }
  }
  async save() { if(!this.draft.barcode || !this.draft.name || !this.draft.price){this.message='Completa código, nombre y precio.';return;} this.draft.tags=this.draft.tags.filter(Boolean); this.draft.updatedAt=Date.now(); await this.catalog.save({...this.draft}); this.message='Producto guardado correctamente.'; this.draft=this.empty(); this.tab.set('search'); }
  onImage(e:Event) { const f=(e.target as HTMLInputElement).files?.[0]; if(!f)return; const r=new FileReader(); r.onload=()=>this.draft.image=r.result as string; r.readAsDataURL(f); }
  private stopScanner() { this.scanner?.stop(); this.scanner=undefined; this.scanning=false; }
  private empty(barcode=''):Product { return {barcode,name:'',price:0,stock:0,tags:[],updatedAt:0}; }
}
