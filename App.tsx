import React, { useState, useEffect } from 'react';
import { Dashboard } from './components/Dashboard';
import { Studio } from './components/Studio';
import { LandingPage } from './components/LandingPage';
import { AuthPage } from './components/AuthPage';
import { Project, ViewMode, User } from './types';
import { loadProjects, saveProjects } from './services/storageService';
import { v4 as uuidv4 } from 'uuid';
import { DEFAULT_STUDIO_CONFIG, INITIAL_OBJECT } from './constants';
import { authAPI, getAuthToken, projectsAPI, checkBackendConnection } from './services/apiService';

const App: React.FC = () => {
  const [view, setView] = useState<ViewMode>('landing');
  const [user, setUser] = useState<User | null>(null);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  // Check for existing session on mount
  useEffect(() => {
    const checkSession = async () => {
      const token = getAuthToken();
      if (token) {
        try {
          const response = await authAPI.getMe();
          setUser(response.user);
          setView('dashboard');
        } catch (error) {
          // Token invalid, clear it
          authAPI.logout();
        }
      }
      
      // Load local projects
      const loaded = loadProjects();
      setProjects(loaded);
      setLoading(false);
    };

    checkSession();
  }, []);

  const handleLogin = (userData: { id: string; name: string; email: string; isDemo: boolean }) => {
    const newUser: User = {
      id: userData.id,
      name: userData.name,
      email: userData.email,
      isDemo: userData.isDemo
    };
    setUser(newUser);
    setView('dashboard');
  };

  const handleDemoLogin = () => {
    // Local demo login (when backend is unavailable)
    const demoUser: User = {
      id: 'demo-user-local-only',
      name: 'Demo User',
      email: 'demo@fibostudio.com',
      isDemo: true
    };
    setUser(demoUser);
    
    // Create a sample demo project for the demo user if none exist
    if (projects.length === 0) {
      const demoProject: Project = {
        id: uuidv4(),
        name: 'Sample Demo Project',
        lastUpdated: Date.now(),
        config: { 
          ...DEFAULT_STUDIO_CONFIG,
          moodDescription: 'Clean studio lighting for product photography'
        },
        objects: [{ 
          ...INITIAL_OBJECT, 
          id: uuidv4(),
          name: 'Sample Product',
          shape: 'torus',
          color: '#6366f1' // Indigo color
        }],
        images: []
      };
      setProjects([demoProject]);
    }
    
    setView('dashboard');
  };

  const handleOpenProject = (project: Project) => {
    setCurrentProject(project);
    setView('studio');
  };

  const handleCreateProject = (project: Project) => {
    const updatedProjects = [project, ...projects];
    setProjects(updatedProjects);
    saveProjects(updatedProjects);
    handleOpenProject(project);
  };

  const handleDeleteProject = (projectId: string) => {
    const updated = projects.filter(p => p.id !== projectId);
    setProjects(updated);
    saveProjects(updated);
  };

  const handleUpdateProject = async (updatedProject: Project) => {
    setCurrentProject(updatedProject);
    const updatedList = projects.map(p => p.id === updatedProject.id ? updatedProject : p);
    setProjects(updatedList);
    saveProjects(updatedList);

    // Sync to backend if connected and not demo
    if (user && !user.isDemo) {
      try {
        await projectsAPI.update(updatedProject.id, {
          name: updatedProject.name,
          config: updatedProject.config,
          objects: updatedProject.objects,
          images: updatedProject.images,
          consistencySettings: updatedProject.consistencySettings
        });
      } catch (error) {
        console.log('Failed to sync project to backend:', error);
      }
    }
  };

  const handleBackToDashboard = () => {
    setView('dashboard');
    setCurrentProject(null);
  };

  const handleLogout = () => {
    authAPI.logout();
    setUser(null);
    setView('landing');
    setCurrentProject(null);
  };

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  return (
    <div className="font-sans antialiased text-zinc-900 selection:bg-indigo-500 selection:text-white">
      {view === 'landing' && (
        <LandingPage 
          onGetStarted={() => setView('auth')}
          onTryDemo={handleDemoLogin}
        />
      )}

      {view === 'auth' && (
        <AuthPage 
          onLogin={handleLogin}
          onDemoLogin={handleDemoLogin}
          onBack={() => setView('landing')}
        />
      )}

      {view === 'dashboard' && user && (
        <Dashboard 
          user={user}
          projects={projects} 
          onOpenProject={handleOpenProject}
          onCreateProject={handleCreateProject}
          onDeleteProject={handleDeleteProject}
          onLogout={handleLogout}
        />
      )}

      {view === 'studio' && currentProject && user && (
        <Studio 
          project={currentProject} 
          onUpdateProject={handleUpdateProject}
          onBack={handleBackToDashboard}
        />
      )}
    </div>
  );
};

export default App;
