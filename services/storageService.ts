import { Project } from '../types';
import { MOCK_PROJECTS } from '../constants';

const STORAGE_KEY = 'fibo_studio_projects';

export const loadProjects = (): Project[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
    // Return default mocks if first time
    return MOCK_PROJECTS;
  } catch (e) {
    console.error("Failed to load projects", e);
    return MOCK_PROJECTS;
  }
};

export const saveProjects = (projects: Project[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
  } catch (e) {
    console.error("Failed to save projects", e);
  }
};
