export interface UserInput {
  targetRole: string;
  resumeText: string;
  skills: string[];
  certifications: string[];
  experience: string;
}

export type SkillStatus = "have" | "need" | "helpful";

export interface SkillWithStatus {
  name: string;
  status: SkillStatus;
}

export interface RoadmapItem {
  skill: string;
  resource: string;
  resourceUrl?: string;
}

export interface AnalysisResult {
  readinessScore: number;
  summary: string;
  skillsGrid: SkillWithStatus[];
  learningRoadmap: RoadmapItem[];
  targetRole: string;
}
