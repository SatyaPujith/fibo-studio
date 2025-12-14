import { Router, Response } from 'express';
import { Project } from '../models/Project.js';
import { auth, AuthRequest } from '../middleware/auth.js';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// All routes require authentication
router.use(auth);

// @route   GET /api/projects
// @desc    Get all projects for current user
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    // Demo users don't have database projects - return empty array
    // Their projects are stored locally in the browser
    if (req.isDemo) {
      return res.json([]);
    }

    const projects = await Project.find({ userId: req.userId })
      .sort({ updatedAt: -1 })
      .select('name config.moodDescription objects images updatedAt');

    // Transform to frontend format
    const formattedProjects = projects.map(p => ({
      id: p._id,
      name: p.name,
      lastUpdated: p.updatedAt.getTime(),
      moodDescription: p.config?.moodDescription,
      objectCount: p.objects?.length || 0,
      imageCount: p.images?.length || 0
    }));

    res.json(formattedProjects);
  } catch (error: any) {
    console.error('Get projects error:', error);
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

// @route   GET /api/projects/:id
// @desc    Get single project
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    // Demo users don't have database projects
    if (req.isDemo) {
      return res.status(404).json({ error: 'Demo projects are stored locally, not in database.' });
    }

    const project = await Project.findOne({
      _id: req.params.id,
      userId: req.userId
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Transform to frontend format
    res.json({
      id: project._id,
      name: project.name,
      lastUpdated: project.updatedAt.getTime(),
      config: project.config,
      objects: project.objects,
      images: project.images,
      consistencySettings: project.consistencySettings
    });
  } catch (error: any) {
    console.error('Get project error:', error);
    res.status(500).json({ error: 'Failed to fetch project' });
  }
});

// @route   POST /api/projects
// @desc    Create new project
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    // Demo users can't create projects in database
    if (req.isDemo) {
      return res.status(403).json({ error: 'Demo users cannot save to database. Projects are stored locally.' });
    }

    const { name, config, objects, consistencySettings } = req.body;

    // Create default object if none provided
    const defaultObjects = objects?.length ? objects : [{
      id: uuidv4(),
      name: 'New Object',
      type: 'primitive',
      shape: 'cube',
      color: '#ffffff',
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
      roughness: 0.5,
      metalness: 0.5
    }];

    const project = new Project({
      userId: req.userId,
      name: name || 'Untitled Project',
      config: config || {},
      objects: defaultObjects,
      images: [],
      consistencySettings: consistencySettings || {}
    });

    await project.save();

    res.status(201).json({
      id: project._id,
      name: project.name,
      lastUpdated: project.updatedAt.getTime(),
      config: project.config,
      objects: project.objects,
      images: project.images,
      consistencySettings: project.consistencySettings
    });
  } catch (error: any) {
    console.error('Create project error:', error);
    res.status(500).json({ error: 'Failed to create project' });
  }
});


// @route   PUT /api/projects/:id
// @desc    Update project
router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    // Demo users can't update projects in database
    if (req.isDemo) {
      return res.status(403).json({ error: 'Demo users cannot save to database. Projects are stored locally.' });
    }

    const { name, config, objects, images, consistencySettings } = req.body;

    const project = await Project.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      {
        $set: {
          ...(name && { name }),
          ...(config && { config }),
          ...(objects && { objects }),
          ...(images && { images }),
          ...(consistencySettings && { consistencySettings })
        }
      },
      { new: true }
    );

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    res.json({
      id: project._id,
      name: project.name,
      lastUpdated: project.updatedAt.getTime(),
      config: project.config,
      objects: project.objects,
      images: project.images,
      consistencySettings: project.consistencySettings
    });
  } catch (error: any) {
    console.error('Update project error:', error);
    res.status(500).json({ error: 'Failed to update project' });
  }
});

// @route   DELETE /api/projects/:id
// @desc    Delete project
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    // Demo users can't delete projects from database
    if (req.isDemo) {
      return res.status(403).json({ error: 'Demo users cannot modify database. Projects are stored locally.' });
    }

    const project = await Project.findOneAndDelete({
      _id: req.params.id,
      userId: req.userId
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    res.json({ message: 'Project deleted successfully' });
  } catch (error: any) {
    console.error('Delete project error:', error);
    res.status(500).json({ error: 'Failed to delete project' });
  }
});

// @route   POST /api/projects/:id/images
// @desc    Add generated image to project
router.post('/:id/images', async (req: AuthRequest, res: Response) => {
  try {
    // Demo users can't add images to database
    if (req.isDemo) {
      return res.status(403).json({ error: 'Demo users cannot save to database. Images are stored locally.' });
    }

    const { url, promptUsed, objectName } = req.body;

    const image = {
      id: uuidv4(),
      url,
      promptUsed,
      timestamp: Date.now(),
      objectName
    };

    const project = await Project.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      { $push: { images: { $each: [image], $position: 0 } } },
      { new: true }
    );

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    res.status(201).json(image);
  } catch (error: any) {
    console.error('Add image error:', error);
    res.status(500).json({ error: 'Failed to add image' });
  }
});

// @route   GET /api/projects/stats/summary
// @desc    Get user's project statistics
router.get('/stats/summary', async (req: AuthRequest, res: Response) => {
  try {
    // Demo users - return zeros, stats come from local storage
    if (req.isDemo) {
      return res.json({
        totalProjects: 0,
        totalImages: 0,
        totalObjects: 0
      });
    }

    const projects = await Project.find({ userId: req.userId });
    
    const totalProjects = projects.length;
    const totalImages = projects.reduce((sum, p) => sum + (p.images?.length || 0), 0);
    const totalObjects = projects.reduce((sum, p) => sum + (p.objects?.length || 0), 0);

    res.json({
      totalProjects,
      totalImages,
      totalObjects
    });
  } catch (error: any) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

export default router;
