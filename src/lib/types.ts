export interface Paca {
  id?: number;
  nombre: string;
  colectivo: string;
  peso: number | null;
  fecha_inicio: string;
  coordenadas_lat: number | null;
  coordenadas_lng: number | null;
  participantes: number | null;
  informacion: string | null;
  created_at?: string;
  updated_at?: string;
}
