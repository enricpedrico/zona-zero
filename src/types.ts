export type Locale = "ca" | "es" | "en";
export type Intensity = "soft" | "cinematic" | "intense";
export type GameStatus = "active" | "complete";
export type EventCategory = "conflict" | "environment" | "alliance" | "discovery";
export type ItemId =
  | "compact_bow"
  | "field_spear"
  | "survival_hatchet"
  | "shock_baton"
  | "signal_launcher"
  | "tactical_slingshot"
  | "rescue_blade"
  | "scrap_carbine"
  | "medkit"
  | "light_armor"
  | "climbing_rope"
  | "ration_pack"
  | "water_filter"
  | "binoculars"
  | "smoke_beacon";
export type ReplayKind =
  | "ambush"
  | "duel"
  | "trap"
  | "betrayal"
  | "crossfire"
  | "storm"
  | "collapse"
  | "exposure"
  | "eject"
  | "fall"
  | "flood"
  | "fire"
  | "ice"
  | "fog"
  | "cave"
  | "chase"
  | "projectile"
  | "creature"
  | "shock"
  | "crush";

export interface ParticipantStats {
  eliminations: number;
  assists: number;
  incidents: number;
  daysSurvived: number;
}

export interface ParticipantState {
  id: string;
  name: string;
  avatarSeed: number;
  avatarVersion: number;
  hasCustomAvatar: boolean;
  alive: boolean;
  health: number;
  morale: number;
  combat: number;
  survival: number;
  stealth: number;
  supplies: number;
  injuries: number;
  inventory: ItemId[];
  equippedWeapon?: ItemId;
  eliminatedDay?: number;
  eliminatedBy?: string;
  stats: ParticipantStats;
}

export interface RelationshipState {
  [pair: string]: number;
}

export interface EventResult {
  id: string;
  definitionId: string;
  category: EventCategory;
  actorIds: string[];
  eliminatedIds: string[];
  day: number;
  itemId?: ItemId;
  itemRecipientId?: string;
  actorWeapons?: Record<string, ItemId | null>;
}

export interface DayResult {
  day: number;
  eventIds: string[];
  events: EventResult[];
  eliminatedIds: string[];
  survivorsAfter: number;
}

export interface GameState {
  schemaVersion: 1;
  id: string;
  title: string;
  seed: string;
  intensity: Intensity;
  darkHumor: boolean;
  status: GameStatus;
  currentDay: number;
  initialCount: number;
  participants: ParticipantState[];
  relationships: RelationshipState;
  days: DayResult[];
  revealedEvents: Record<number, number>;
  createdAt: string;
  updatedAt: string;
}

export interface EventDefinition {
  id: string;
  category: EventCategory;
  fatal: boolean;
  actorCount: number;
  darkHumor?: boolean;
  relationshipDelta?: number;
  effect?: "heal" | "injure" | "supplies" | "morale" | "alliance" | "airdrop" | "disarm";
  itemPool?: "weapon" | "survival" | "any";
  requiresWeapon?: boolean;
  replayKind?: ReplayKind;
}

export interface GameSummary {
  id: string;
  title: string;
  status: GameStatus;
  currentDay: number;
  initialCount: number;
  survivors: number;
  updatedAt: string;
  winnerName?: string;
}

export interface LocalGameArchive {
  archiveVersion: 1;
  exportedAt: string;
  game: GameState;
}
