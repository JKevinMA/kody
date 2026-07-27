export interface ProductPresentation { name: string; units: number; price: number; }
export interface Product { id?: number; barcode: string; name: string; price: number; presentations?: ProductPresentation[]; tags: string[]; image?: string; updatedAt: number; }
