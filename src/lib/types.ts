export interface Colectivo {
  id?: number;
  nombre: string;
  color: string;
  created_at?: string;
}

export interface Paca {
  id?: number;
  nombre: string;
  colectivo: string;
  colectivo_id?: number | null;
  peso: number | null;
  fecha_inicio: string;
  coordenadas_lat: number | null;
  coordenadas_lng: number | null;
  participantes: number | null;
  informacion: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface Medicion {
  id?: number;
  paca_id: number;
  peso: number;
  fecha: string;
  notas: string | null;
  created_at?: string;
}
