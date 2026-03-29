// ============================
// Vehicle Types
// ============================

export interface VehicleMake {
  id: number;
  slug: string;
  name: string;
  logo_url: string | null;
  models_count: number;
}

export interface VehicleModel {
  id: number;
  slug: string;
  name: string;
  make_id: number;
  make_name: string;
}

export interface VehicleYear {
  year: number;
}

export interface VehicleEngine {
  id: number;
  name: string;
  displacement: string | null;
  fuel_type: FuelType | null;
  cylinders: number | null;
}

export type FuelType = "petrol" | "diesel" | "hybrid" | "electric" | "lpg";

export interface SelectedVehicle {
  make: string;
  make_id: number;
  model: string;
  model_id: number;
  year: number;
  engine?: string;
  engine_id?: number;
  display_label: string; // e.g. "2018 Toyota Camry 2.5L"
}

export interface SavedVehicle extends SelectedVehicle {
  id: string; // local UUID
  nickname?: string;
  is_primary: boolean;
  saved_at: string;
}
