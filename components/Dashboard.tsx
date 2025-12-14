import React, { useEffect, useState } from 'react';
import { Project, User } from '../types';
import { Plus, Clock, Box, Image as ImageIcon, FolderOpen, Trash2, LogOut, Loader2, BarChart3 } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { DEFAULT_STUDIO_CONFIG, INITIAL_OBJECT } from '../constants';
import { projectsAPI, authAPI, checkBackendConnection, ProjectSummary, ProjectStats } from '../services/apiService';

interface DashboardProps {
  user: User;
  projects: Project[];
  onOpenProject: (project: Project) => void;
  onCreateProject: (project: Project) => void;
  onDeleteProject: (projectId: string) => void;
  onLogout: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ 
  user, 
  projects: localProjects, 
  onOpenProject, 
  onCreateProject, 
  onDeleteProject,
  onLogout 
}) => {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [stats, setStats] = useState<ProjectStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [useBackend, setUseBackend] = useState(false);

  // Check backend and load projects
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const isConnected = await checkBackendConnection();
        setUseBackend(isConnected);

        if (isConnected && !user.isDemo) {
          // Load from backend
          const [projectsData, statsData] = await Promise.all([
            projectsAPI.getAll(),
            projectsAPI.getStats()
          ]);
          setProjects(projectsData);
          setStats(statsData);
        } else {
          // Use local projects for demo user or when backend is unavailable
          setProjects(localProjects.map(p => ({
            id: p.id,
            name: p.name,
            lastUpdated: p.lastUpdated,
            moodDescription: p.config.moodDescription,
            objectCount: p.objects.length,
            imageCount: p.images.length
          })));
          setStats({
            totalProjects: localProjects.length,
            totalImages: localProjects.reduce((sum, p) => sum + p.images.length, 0),
            totalObjects: localProjects.reduce((sum, p) => sum + p.objects.length, 0)
          });
        }
      } catch (error) {
        console.error('Failed to load projects:', error);
        // Fallback to local
        setProjects(localProjects.map(p => ({
          id: p.id,
          name: p.name,
          lastUpdated: p.lastUpdated,
          moodDescription: p.config.moodDescription,
          objectCount: p.objects.length,
          imageCount: p.images.length
        })));
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [localProjects, user.isDemo]);

  const handleCreate = async () => {
    const newProject: Project = {
      id: uuidv4(),
      name: `Untitled Project ${projects.length + 1}`,
      lastUpdated: Date.now(),
      config: { ...DEFAULT_STUDIO_CONFIG },
      objects: [{ ...INITIAL_OBJECT, id: uuidv4() }],
      images: []
    };

    if (useBackend && !user.isDemo) {
      try {
        const created = await projectsAPI.create({
          name: newProject.name,
          config: newProject.config,
          objects: newProject.objects
        });
        newProject.id = created.id;
      } catch (error) {
        console.error('Failed to create project on backend:', error);
      }
    }

    onCreateProject(newProject);
  };

  const handleDelete = async (projectId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!confirm('Are you sure you want to delete this project?')) return;

    if (useBackend && !user.isDemo) {
      try {
        await projectsAPI.delete(projectId);
      } catch (error) {
        console.error('Failed to delete project:', error);
      }
    }

    onDeleteProject(projectId);
    setProjects(prev => prev.filter(p => p.id !== projectId));
  };

  const handleOpenProject = async (projectSummary: ProjectSummary) => {
    if (useBackend && !user.isDemo) {
      try {
        const fullProject = await projectsAPI.getById(projectSummary.id);
        onOpenProject(fullProject);
        return;
      } catch (error) {
        console.error('Failed to load project:', error);
      }
    }

    // Fallback to local project
    const localProject = localProjects.find(p => p.id === projectSummary.id);
    if (localProject) {
      onOpenProject(localProject);
    }
  };

  const handleLogout = () => {
    authAPI.logout();
    onLogout();
  };


  return (
    <div className="min-h-screen bg-zinc-950 p-8 text-zinc-200">
      {/* Header */}
      <header className="mb-8 max-w-7xl mx-auto flex justify-between items-start">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-white mb-2">FIBO Studio</h1>
          <p className="text-zinc-400 text-lg">Virtual Production & 3D Lighting Studio</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-white font-medium">{user.name}</p>
            <p className="text-zinc-500 text-sm">{user.email}</p>
            {user.isDemo && (
              <span className="text-xs bg-indigo-600/20 text-indigo-400 px-2 py-0.5 rounded-full">Demo Mode</span>
            )}
          </div>
          <button 
            onClick={handleLogout}
            className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors"
            title="Logout"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto">
        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-600/20 rounded-lg">
                  <FolderOpen className="w-5 h-5 text-indigo-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{stats.totalProjects}</p>
                  <p className="text-zinc-500 text-sm">Projects</p>
                </div>
              </div>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-600/20 rounded-lg">
                  <ImageIcon className="w-5 h-5 text-green-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{stats.totalImages}</p>
                  <p className="text-zinc-500 text-sm">Generated Images</p>
                </div>
              </div>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-600/20 rounded-lg">
                  <Box className="w-5 h-5 text-orange-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{stats.totalObjects}</p>
                  <p className="text-zinc-500 text-sm">3D Objects</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Projects Header */}
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <FolderOpen className="w-5 h-5 text-indigo-500" />
            Your Projects
          </h2>
          <button 
            onClick={handleCreate}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-md font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Project
          </button>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
          </div>
        )}

        {/* Projects Grid */}
        {!loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <div 
                key={project.id} 
                className="group bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden hover:border-indigo-500/50 transition-all duration-300 hover:shadow-2xl hover:shadow-indigo-500/10 cursor-pointer flex flex-col"
                onClick={() => handleOpenProject(project)}
              >
                {/* Preview Area */}
                <div className="h-48 bg-zinc-800 relative overflow-hidden">
                  <div className="w-full h-full flex flex-col items-center justify-center text-zinc-600 bg-gradient-to-br from-zinc-800 to-zinc-900">
                    <Box className="w-12 h-12 mb-2 opacity-50" />
                    <span className="text-sm">{project.objectCount} Objects</span>
                  </div>
                  <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={(e) => handleDelete(project.id, e)}
                      className="p-2 bg-zinc-900/80 hover:bg-red-900/80 text-zinc-400 hover:text-red-200 rounded-full"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Info Area */}
                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="text-lg font-medium text-white group-hover:text-indigo-400 transition-colors mb-1">
                      {project.name}
                    </h3>
                    <p className="text-xs text-zinc-500 flex items-center gap-1 mb-4">
                      <Clock className="w-3 h-3" />
                      Last edited {new Date(project.lastUpdated).toLocaleDateString()}
                    </p>
                  </div>
                  
                  <div className="flex items-center justify-between text-xs text-zinc-400 pt-4 border-t border-zinc-800">
                    <div className="flex items-center gap-1.5">
                      <Box className="w-3.5 h-3.5" />
                      <span>{project.objectCount} Objects</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <ImageIcon className="w-3.5 h-3.5" />
                      <span>{project.imageCount} Renders</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {projects.length === 0 && (
              <div className="col-span-full flex flex-col items-center justify-center py-20 text-zinc-500 border-2 border-dashed border-zinc-800 rounded-xl">
                <Box className="w-12 h-12 mb-4 opacity-20" />
                <p>No projects yet. Create one to get started.</p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};
