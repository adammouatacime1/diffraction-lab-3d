export type SourceKind = 'plane' | 'point' | 'pair';
export type ObstacleKind = 'none' | 'slit' | 'double' | 'circle' | 'rectangle' | 'edge';
export type Resolution = 'performance' | 'balanced' | 'precision';
export type DisplayField = 'displacement' | 'amplitude' | 'intensity';
export type CameraView = 'free' | 'top' | 'profile' | 'iso';
export type LabMode = 'discovery' | 'huygens' | 'analysis' | 'comparison' | 'presentation';

export interface Parameters {
  frequency: number; speed: number; amplitude: number; aperture: number;
  source: SourceKind; sourceEnabled: boolean; sourceX: number; sourceY: number;
  sourceSeparation: number; sourceAngle: number; phase: number;
  obstacle: ObstacleKind; obstacleX: number; obstacleY: number;
  obstacleWidth: number; obstacleHeight: number; separation: number;
  boundary: 'absorbing' | 'reflecting'; resolution: Resolution;
}
export interface Grid {
  nx: number; ny: number; width: number; height: number;
  dx: number; dy: number; dt: number; cfl: number;
}
export interface ProbeReading {
  x: number; y: number; displacement: number; amplitude: number;
  intensity: number; phase: number | null; solid: boolean;
}
export interface ValidationResult {
  id: string; title: string; objective: string; parameters: string;
  prediction: string; result: string; error?: string;
  passed: boolean; limitation?: string;
}
export interface Experiment {
  id: string; title: string; shortTitle: string; category: string;
  objective: string; prediction: string; explanation: string;
  parameters: Partial<Parameters>; mode?: LabMode;
}
export interface ProbePosition { x: number; y: number }

export const DEFAULT_PARAMETERS: Parameters = {
  frequency: 10, speed: 2, amplitude: 0.004, aperture: 0.1,
  source: 'plane', sourceEnabled: true, sourceX: 0.28, sourceY: 0.8,
  sourceSeparation: 0.4, sourceAngle: 0, phase: 0,
  obstacle: 'slit', obstacleX: 1.35, obstacleY: 0.8,
  obstacleWidth: 0.3, obstacleHeight: 0.5, separation: 0.5,
  boundary: 'absorbing', resolution: 'balanced',
};
