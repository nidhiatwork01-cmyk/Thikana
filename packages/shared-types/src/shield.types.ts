export type TenancyStatus =
  | "DRAFT"
  | "MOVE_IN_SEALED"
  | "ACTIVE"
  | "MOVE_OUT"
  | "DISPUTE"
  | "RESOLVED";

export type InspectionArea =
  | "WALLS"
  | "CEILING"
  | "FLOOR"
  | "BATHROOM"
  | "BED_MATTRESS"
  | "WARDROBE"
  | "SWITCHES_LIGHTS"
  | "WINDOWS_DOORS"
  | "APPLIANCES";

export type ItemCondition = "PRISTINE" | "GOOD" | "MINOR_DAMAGE" | "HEAVILY_DAMAGED";

export interface InspectionItem {
  id: string;
  area: InspectionArea;
  name: string;
  condition: ItemCondition;
  notes: string;
  mediaUrls: string[];
  fileSha256: string;
  previousBlockHash: string; // Hash chain pointer
  currentBlockHash: string; // SHA-256(area + condition + fileSha256 + prevHash + timestamp)
  timestamp: string;
}

export interface TenancyRecord {
  id: string;
  tenantId: string;
  pgTitle: string;
  ownerName?: string;
  ownerPhone?: string;
  roomNumber: string;
  rentAmount: number;
  depositAmount: number;
  status: TenancyStatus;
  moveInDate: string;
  moveOutDate?: string;
  moveInInspectionId?: string;
  moveOutInspectionId?: string;
  createdAt: string;
}

export interface InspectionSealResult {
  inspectionId: string;
  rootHash: string;
  itemCount: number;
  sealedAt: string;
  pdfUrl?: string;
}
