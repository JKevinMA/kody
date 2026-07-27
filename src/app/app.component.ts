import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BarcodeFormat, BrowserMultiFormatReader, IScannerControls } from '@zxing/browser';
import { LucideDynamicIcon, LucideDownload, LucideFlashlight, LucidePackage, LucidePlus, LucideScanBarcode, LucideSearch, LucideUpload, LucideX, provideLucideIcons } from '@lucide/angular';
import { CatalogService } from './catalog.service';
import { Product, ProductPresentation } from './product.model';

interface PresentationDraft { name: string; customName: boolean; units: number | null; priceInput: string; unitsTouched: boolean; priceTouched: boolean; }
interface ProductDraft { barcode: string; name: string; tags: string[]; image?: string; presentations: PresentationDraft[]; }

@Component({ selector: 'app-root', standalone: true, imports: [CommonModule, FormsModule, LucideDynamicIcon], providers: [provideLucideIcons(LucideDownload, LucideFlashlight, LucidePackage, LucidePlus, LucideScanBarcode, LucideSearch, LucideUpload, LucideX)], templateUrl: './app.component.html' })
export class AppComponent implements OnInit, OnDestroy {
  tab = signal<'search'|'register'|'products'>('search'); query=''; results:Product[]=[]; recent:Product[]=[]; products:Product[]=[]; selected?:Product; message=''; scanning=false; flashOn=true; flashAvailable=false; draft=this.empty();
  tagInput=''; suggestedTags:string[]=[]; presentationSuggestions=['Unidad', 'Paquete', 'Bolsa', 'Caja', 'Botella', 'Lata', 'Docena'];
  private scanner?: IScannerControls;
  constructor(private catalog:CatalogService) {}
  async ngOnInit() { await this.catalog.init(); this.recent=await this.catalog.recent(); await this.refreshSuggestedTags(); }
  ngOnDestroy() { this.stopScanner(); }
  async setTab(tab:'search'|'register'|'products') { this.tab.set(tab); if(tab==='products') await this.refreshProducts(); }
  async find() { this.results=this.query.trim()?await this.catalog.search(this.query.trim()):[]; }
  async lookup(code:string) { const p=await this.catalog.byBarcode(code); if(p){ this.selected=p; this.recent=await this.catalog.recent(); navigator.vibrate?.(80); } else { this.message=`No encontramos el código ${code}. Regístralo a continuación.`; this.draft=this.empty(code); this.tab.set('register'); } }
  presentations(product:Product):ProductPresentation[] { return product.presentations?.length ? product.presentations : [{name:'Unidad',units:1,price:product.price}]; }
  async scan(target:'search'|'register') {
    this.tab.set(target); this.message='';
    if (!window.isSecureContext) { this.message='Para usar la cámara en iPhone, abre la aplicación mediante HTTPS; la dirección IP por HTTP no tiene permiso.'; return; }
    if (!navigator.mediaDevices?.getUserMedia) { this.message='Este navegador no permite abrir la cámara. Ingresa el código manualmente.'; return; }
    this.stopScanner(); this.flashOn=true; this.scanning=true;
    await new Promise(requestAnimationFrame);
    const video=document.querySelector('#scanner-video') as HTMLVideoElement | null;
    if (!video) { this.stopScanner(); return; }
    try {
      const reader=new BrowserMultiFormatReader(undefined, { delayBetweenScanAttempts: 100, delayBetweenScanSuccess: 100 });
      reader.possibleFormats=[BarcodeFormat.EAN_13, BarcodeFormat.EAN_8, BarcodeFormat.CODE_128, BarcodeFormat.UPC_A, BarcodeFormat.UPC_E];
      this.scanner=await reader.decodeFromConstraints({ video: { facingMode: { ideal: 'environment' } }, audio: false }, video, (result) => {
        if (!result || !this.scanning) return;
        this.stopScanner(); target==='search' ? this.lookup(result.getText()) : this.draft.barcode=result.getText(); navigator.vibrate?.(80);
      });
      this.flashAvailable=Boolean(this.scanner.switchTorch);
      if (this.flashAvailable) await this.setFlash(true);
    } catch { this.stopScanner(); this.message='No se pudo abrir la cámara. Revisa sus permisos.'; }
  }
  async setFlash(on:boolean) { if (!this.scanner?.switchTorch) return; try { await this.scanner.switchTorch(on); this.flashOn=on; } catch { this.flashAvailable=false; this.flashOn=false; } }
  addPresentation() { this.draft.presentations.push({name:'Unidad',customName:false,units:1,priceInput:'0.00',unitsTouched:false,priceTouched:false}); }
  removePresentation(index:number) { if(this.draft.presentations.length > 1) this.draft.presentations.splice(index,1); }
  selectPresentationName(presentation:PresentationDraft, name:string) { presentation.customName=name==='__custom__'; if (!presentation.customName) presentation.name=name; else presentation.name=''; }
  clearInitialPrice(presentation:PresentationDraft) { if(!presentation.priceTouched && presentation.priceInput==='0.00') presentation.priceInput=''; presentation.priceTouched=true; }
  clearInitialUnits(presentation:PresentationDraft) { if(!presentation.unitsTouched && presentation.units===1) presentation.units=null; presentation.unitsTouched=true; }
  formatPresentationPrice(presentation:PresentationDraft) { const amount=Number(presentation.priceInput.replace(',', '.')); presentation.priceInput=Number.isFinite(amount) ? amount.toFixed(2) : '0.00'; }
  formatPresentationUnits(presentation:PresentationDraft) { presentation.units=Math.max(1, Number(presentation.units) || 1); }
  async save() {
    const presentations=this.draft.presentations.map(p => ({name:p.name.trim() || 'Unidad', units:Math.max(1, Number(p.units) || 1), price:Number(p.priceInput.replace(',', '.'))}));
    if(!this.draft.barcode || !this.draft.name || presentations.some(p => !p.price || !Number.isFinite(p.price))){this.message='Completa código, nombre y el precio de cada presentación.';return;}
    const product:Product={barcode:this.draft.barcode.trim(),name:this.draft.name.trim().toUpperCase(),price:presentations[0].price,presentations,tags:this.draft.tags.filter(Boolean),image:this.draft.image,updatedAt:Date.now()};
    await this.catalog.upsert(product); await this.refreshSuggestedTags(); this.message='Producto guardado correctamente.'; this.draft=this.empty(); this.tagInput=''; this.tab.set('products'); await this.refreshProducts();
  }
  onImage(e:Event) { const f=(e.target as HTMLInputElement).files?.[0]; if(!f)return; const r=new FileReader(); r.onload=()=>this.draft.image=r.result as string; r.readAsDataURL(f); }
  addTag(value=this.tagInput) { const tag=value.trim(); if (!tag || this.draft.tags.some(item => item.toLowerCase() === tag.toLowerCase())) return; this.draft.tags.push(tag); this.tagInput=''; }
  removeTag(tag:string) { this.draft.tags=this.draft.tags.filter(item => item !== tag); }
  async exportProducts() { const data=JSON.stringify({version:1, exportedAt:new Date().toISOString(), products:await this.catalog.all()},null,2); const url=URL.createObjectURL(new Blob([data],{type:'application/json'})); const link=document.createElement('a'); link.href=url; link.download=`kody-productos-${new Date().toISOString().slice(0,10)}.json`; link.click(); URL.revokeObjectURL(url); }
  async importProducts(event:Event) { const file=(event.target as HTMLInputElement).files?.[0]; if(!file)return; try { const raw=JSON.parse(await file.text()); const entries=Array.isArray(raw) ? raw : raw.products; if(!Array.isArray(entries)) throw new Error(); let imported=0; for(const entry of entries) { const product=this.normaliseProduct(entry); if(!product) continue; await this.catalog.upsert(product); imported++; } await this.refreshProducts(); await this.refreshSuggestedTags(); this.message=`Se importaron ${imported} productos.`; } catch { this.message='El archivo no tiene un formato de productos válido.'; } finally { (event.target as HTMLInputElement).value=''; } }
  stopScanner() { this.scanner?.stop(); this.scanner=undefined; this.scanning=false; this.flashAvailable=false; }
  private async refreshProducts() { this.products=(await this.catalog.all()).sort((a,b) => a.name.localeCompare(b.name)); }
  private async refreshSuggestedTags() { this.suggestedTags=[...new Set((await this.catalog.all()).flatMap(product => product.tags))].sort((a,b) => a.localeCompare(b)); }
  private normaliseProduct(value:unknown):Product | undefined { if(!value || typeof value !== 'object') return; const source=value as Partial<Product>; if(typeof source.barcode !== 'string' || typeof source.name !== 'string' || !source.barcode.trim() || !source.name.trim()) return; const legacyPrice=Number(source.price); const sourcePresentations=Array.isArray(source.presentations) ? source.presentations : []; const presentations=sourcePresentations.map(p => ({name:typeof p?.name==='string' && p.name.trim() ? p.name.trim() : 'Unidad',units:Math.max(1,Number(p?.units)||1),price:Number(p?.price)})).filter(p => Number.isFinite(p.price) && p.price>0); if(!presentations.length && Number.isFinite(legacyPrice) && legacyPrice>0) presentations.push({name:'Unidad',units:1,price:legacyPrice}); if(!presentations.length) return; return {barcode:source.barcode.trim(),name:source.name.trim(),price:presentations[0].price,presentations,tags:Array.isArray(source.tags) ? source.tags.filter((tag):tag is string => typeof tag==='string' && Boolean(tag.trim())) : [],image:typeof source.image==='string' ? source.image : undefined,updatedAt:Date.now()}; }
  private empty(barcode=''):ProductDraft { return {barcode,name:'',tags:[],presentations:[{name:'Unidad',customName:false,units:1,priceInput:'0.00',unitsTouched:false,priceTouched:false}]}; }
}
