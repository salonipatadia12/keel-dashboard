export type OutcomeType = 'human' | 'voicemail' | 'dead_end' | 'info' | 'submenu' | 'repeat';

export interface OverviewRow {
  callId: string | null;
  parent_call_id: string | null;
  university: string | null;
  mode: string | null;
  business_hours: string | null;
  live_operator_available: boolean | null;
  voicemail_available: boolean | null;
  ivr_depth: number | null;
  closed_hours_loop: string | null;
  notes: string | null;
  path: string | number | null;
  depth: number | null;
  digit_tested: string | number | null;
  outcome_detail: string | null;
  outcome_type: string | null;
  has_submenu: boolean | null;
  duration: number | null;
}

export interface MenuItemRow {
  callId: string | null;
  parent_call_id: string | null;
  university: string | null;
  digit: string | number | null;
  menu_level: number | null;
  option_label: string | null;
  type: string | null;
  leads_to: string | null;
  human: boolean | null;
  notes: string | null;
  path: string | number | null;
  depth: number | null;
}

export interface ScriptCaptureRow {
  callId: string | null;
  parent_call_id: string | null;
  university: string | null;
  digit: string | number | null;
  key_instructions: string | null;
  url_mentioned: string | null;
  compliance_warning: boolean | null;
  self_service_level: string | null;
  path: string | number | null;
}

export interface SystemCharacteristicsRow {
  callId: string | null;
  parent_call_id: string | null;
  university: string | null;
  asks_questions: boolean | null;
  collects_id: boolean | null;
  collects_dtmf: boolean | null;
  has_operator_zero: boolean | null;
  loop_behavior: string | null;
  escalation_path: string | null;
  system_type: string | null;
  path: string | number | null;
}

export interface UniversityListRow {
  university: string;
  phone: number | string;
}

export interface RawData {
  source: string;
  generatedAt: string;
  universityList: UniversityListRow[];
  overview: OverviewRow[];
  menuMapping: MenuItemRow[];
  scriptCapture: ScriptCaptureRow[];
  systemCharacteristics: SystemCharacteristicsRow[];
  tone: unknown[];
  frictionScore: unknown[];
  discoveryQueue: unknown[];
}

export interface Reference {
  value: string;
  kind: 'url' | 'phone';
  sourcePath: string;
  sourceNodeLabel: string;
  digit: string;
}

export interface TreeNode {
  id: string;
  digit: string;
  label: string;
  type: string;
  outcomeType: OutcomeType;
  depth: number;
  durationSec: number | null;
  hasOperator: boolean;
  isRecommended: boolean;
  notes: string | null;
  urls: Reference[];
  phones: Reference[];
  children: TreeNode[];
}

export interface FrictionComponents {
  depth: number;
  options: number;
  time: number;
  dead_end: number;
  agent_access: number;
  clarity: number;
  operator: number;
}

export interface FrictionResult {
  totalScore: number;
  grade: 'Excellent' | 'Good' | 'Fair' | 'Poor';
  components: FrictionComponents;
  maxDepth: number;
  avgOptions: number;
  totalNodes: number;
  deadEndCount: number;
  voicemailCount: number;
  humanReachableCount: number;
  hasOpZero: boolean;
}
