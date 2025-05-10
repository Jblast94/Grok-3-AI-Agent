import express, { Request, Response } from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import fs from 'fs/promises';
import path from 'path';
import dotenv from 'dotenv';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cron from 'node-cron';
import winston from 'winston';
import axios from 'axios';

// Load environment variables
dotenv.config();

// Import the Twitter client
// For production, uncomment this line and ensure the path is correct
// import { Scraper } from 'agent-twitter-client';

interface Settings {
  twitterUsername?: string;
  twitterPassword?: string;
  twitterEmail?: string;
  apiKey?: string;
  apiSecretKey?: string;
  accessToken?: string;
  accessTokenSecret?: string;
  affiliateLink?: string;
  autoPostEnabled?: boolean;
  contentSources?: string[];
  postFrequency?: number;
  hashtagGroups?: string[];
  targetAudience?: string[];
  analyticsEnabled?: boolean;
}

interface VideoContent {
  id: string;
  title: string;
  url: string;
  source: string;
  thumbnail?: string;
  description?: string;
  views?: number;
  likes?: number;
  trending?: boolean;
}

// Configure logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: 'twitter-autoposter' },
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

const app = express();
const port = process.env.PORT || 3001;
const SETTINGS_FILE_PATH = path.join(__dirname, '..', 'settings.json');
const POSTS_HISTORY_PATH = path.join(__dirname, '..', 'posts-history.json');

// Security middleware
app.use(helmet());
app.use(cors());
app.use(bodyParser.json());

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', apiLimiter);

// --- Settings Management ---
async function loadSettings(): Promise<Settings> {
  try {
    const data = await fs.readFile(SETTINGS_FILE_PATH, 'utf-8');
    return JSON.parse(data) as Settings;
  } catch (error) {
    // If file doesn't exist or other error, return empty settings
    logger.warn('Could not load settings.json, starting with empty settings.', error);
    return {};
  }
}

async function saveSettings(settings: Settings): Promise<void> {
  try {
    await fs.writeFile(SETTINGS_FILE_PATH, JSON.stringify(settings, null, 2));
    logger.info('Settings saved to settings.json');
  } catch (error) {
    logger.error('Error saving settings:', error);
    throw new Error('Failed to save settings.');
  }
}

// --- Post History Management ---
interface PostHistory {
  posts: {
    id: string;
    content: string;
    videoUrl: string;
    affiliateLink?: string;
    timestamp: string;
    engagement?: {
      likes: number;
      retweets: number;
      replies: number;
      clicks?: number;
    };
  }[];
}

async function loadPostHistory(): Promise<PostHistory> {
  try {
    const data = await fs.readFile(POSTS_HISTORY_PATH, 'utf-8');
    return JSON.parse(data) as PostHistory;
  } catch (error) {
    // If file doesn't exist or other error, return empty history
    logger.warn('Could not load posts-history.json, starting with empty history.', error);
    return { posts: [] };
  }
}

async function savePostHistory(history: PostHistory): Promise<void> {
  try {
    await fs.writeFile(POSTS_HISTORY_PATH, JSON.stringify(history, null, 2));
    logger.info('Post history saved to posts-history.json');
  } catch (error) {
    logger.error('Error saving post history:', error);
    throw new Error('Failed to save post history.');
  }
}

async function recordPost(content: string, videoUrl: string, affiliateLink?: string): Promise<void> {
  const history = await loadPostHistory();
  history.posts.push({
    id: `post_${Date.now()}`,
    content,
    videoUrl,
    affiliateLink,
    timestamp: new Date().toISOString(),
    engagement: {
      likes: 0,
      retweets: 0,
      replies: 0,
      clicks: 0
    }
  });
  await savePostHistory(history);
}

// --- API Routes ---
app.get('/api/settings', async (req: Request, res: Response) => {
  try {
    const settings = await loadSettings();
    // Don't send sensitive information to the client
    const safeSettings = { ...settings };
    if (safeSettings.twitterPassword) safeSettings.twitterPassword = '********';
    if (safeSettings.apiSecretKey) safeSettings.apiSecretKey = '********';
    if (safeSettings.accessTokenSecret) safeSettings.accessTokenSecret = '********';
    
    res.json(safeSettings);
  } catch (error) {
    logger.error('Failed to load settings:', error);
    res.status(500).json({ message: 'Failed to load settings.' });
  }
});

app.post('/api/settings', async (req: Request, res: Response) => {
  try {
    const newSettings = req.body as Settings;
    
    // Basic validation
    if (newSettings.autoPostEnabled) {
      if (!newSettings.twitterUsername || !newSettings.twitterPassword) {
        return res.status(400).json({ 
          message: 'Twitter credentials are required for auto-posting.' 
        });
      }
      
      if (!newSettings.affiliateLink) {
        return res.status(400).json({ 
          message: 'Affiliate link is required for auto-posting.' 
        });
      }
    }
    
    await saveSettings(newSettings);
    res.status(200).json({ message: 'Settings saved successfully.' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'An unknown error occurred';
    logger.error('Error saving settings:', error);
    res.status(500).json({ message });
  }
});

app.get('/api/history', async (req: Request, res: Response) => {
  try {
    const history = await loadPostHistory();
    res.json(history);
  } catch (error) {
    logger.error('Failed to load post history:', error);
    res.status(500).json({ message: 'Failed to load post history.' });
  }
});

app.post('/api/post/manual', async (req: Request, res: Response) => {
  try {
    const { videoUrl, customText } = req.body;
    if (!videoUrl) {
      return res.status(400).json({ message: 'Video URL is required.' });
    }
    
    const settings = await loadSettings();
    const result = await postVideoToTwitter(
      videoUrl, 
      settings.affiliateLink || '', 
      settings,
      customText
    );
    
    if (result.success) {
      res.status(200).json({ message: 'Tweet posted successfully!' });
    } else {
      res.status(500).json({ message: result.error });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'An unknown error occurred';
    logger.error('Error posting manual tweet:', error);
    res.status(500).json({ message });
  }
});

app.get('/api/trending', async (req: Request, res: Response) => {
  try {
    const videos = await findTrendingVideos();
    res.json(videos);
  } catch (error) {
    logger.error('Error fetching trending videos:', error);
    res.status(500).json({ message: 'Failed to fetch trending videos.' });
  }
});

// --- Content Discovery ---
async function findTrendingVideos(): Promise<VideoContent[]> {
  logger.info('Finding trending videos...');
  const settings = await loadSettings();
  const sources = settings.contentSources || ['youtube'];
  let allVideos: VideoContent[] = [];
  
  try {
    // YouTube trending videos
    if (sources.includes('youtube')) {
      try {
        // In a real app, use the YouTube API
        // const youtubeApiKey = process.env.YOUTUBE_API_KEY;
        // const response = await axios.get(`https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&chart=mostPopular&regionCode=US&maxResults=10&key=${youtubeApiKey}`);
        
        // Mock data for development
        const youtubeVideos: VideoContent[] = [
          {
            id: 'youtube_1',
            title: 'Amazing Cat Compilation 2023',
            url: 'https://youtube.com/watch?v=abc123',
            source: 'youtube',
            thumbnail: 'https://example.com/thumbnail1.jpg',
            views: 1500000,
            likes: 75000,
            trending: true
          },
          {
            id: 'youtube_2',
            title: 'How to Make Perfect Pasta Every Time',
            url: 'https://youtube.com/watch?v=def456',
            source: 'youtube',
            thumbnail: 'https://example.com/thumbnail2.jpg',
            views: 980000,
            likes: 45000,
            trending: true
          }
        ];
        allVideos = [...allVideos, ...youtubeVideos];
      } catch (error) {
        logger.error('Error fetching YouTube trending videos:', error);
      }
    }
    
    // TikTok trending videos
    if (sources.includes('tiktok')) {
      try {
        // In a real app, use the TikTok API or a scraping service
        // const tiktokApiKey = process.env.TIKTOK_API_KEY;
        // const response = await axios.get(`https://api.tiktok.com/trending?api_key=${tiktokApiKey}`);
        
        // Mock data for development
        const tiktokVideos: VideoContent[] = [
          {
            id: 'tiktok_1',
            title: 'Dance Challenge 2023',
            url: 'https://tiktok.com/@user/video/123456',
            source: 'tiktok',
            thumbnail: 'https://example.com/tiktok1.jpg',
            views: 2500000,
            likes: 500000,
            trending: true
          }
        ];
        allVideos = [...allVideos, ...tiktokVideos];
      } catch (error) {
        logger.error('Error fetching TikTok trending videos:', error);
      }
    }
    
    return allVideos;
  } catch (error) {
    logger.error('Error in findTrendingVideos:', error);
    return [];
  }
}

// --- Twitter Posting ---
interface PostResult {
  success: boolean;
  error?: string;
}

async function postVideoToTwitter(
  videoUrl: string, 
  affiliateLinkTemplate: string, 
  settings: Settings,
  customText?: string
): Promise<PostResult> {
  if (!settings.twitterUsername || !settings.twitterPassword) {
    logger.error('Twitter credentials not configured.');
    return { success: false, error: 'Twitter credentials not configured.' };
  }

  try {
    // In production, use the actual Twitter client
    // const scraper = new Scraper();
    // await scraper.login(
    //   settings.twitterUsername, 
    //   settings.twitterPassword, 
    //   settings.twitterEmail, 
    //   settings.apiKey, 
    //   settings.apiSecretKey, 
    //   settings.accessToken, 
    //   settings.accessTokenSecret
    // );
    
    logger.info(`Mock login with ${settings.twitterUsername}`);

    // Generate tweet text
    let tweetText = customText || `Check out this trending video: ${videoUrl}`;
    
    // Add hashtags if available
    const hashtagGroups = settings.hashtagGroups || [];
    if (hashtagGroups.length > 0) {
      // Randomly select one hashtag group
      const randomGroup = hashtagGroups[Math.floor(Math.random() * hashtagGroups.length)];
      tweetText += `\n\n${randomGroup}`;
    }
    
    // Add affiliate link if available
    if (affiliateLinkTemplate) {
      const fullAffiliateLink = affiliateLinkTemplate.replace('{{videoUrl}}', encodeURIComponent(videoUrl));
      tweetText += `\n\nWatch here: ${fullAffiliateLink}`;
    }

    // In production, actually send the tweet
    // await scraper.sendTweet(tweetText);
    logger.info(`Mock sending tweet: "${tweetText}"`);
    
    // Record the post in history
    await recordPost(tweetText, videoUrl, affiliateLinkTemplate ? 
      affiliateLinkTemplate.replace('{{videoUrl}}', encodeURIComponent(videoUrl)) : undefined);
    
    // In production, logout after posting
    // await scraper.logout();
    logger.info('Mock logout');
    
    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Failed to post to Twitter:', error);
    return { success: false, error: errorMessage };
  }
}

// --- Auto-Posting Job ---
async function autoPostJob() {
  logger.info('Running auto-post job...');
  const settings = await loadSettings();
  
  if (settings.autoPostEnabled && settings.affiliateLink) {
    try {
      const videos = await findTrendingVideos();
      
      if (videos.length > 0) {
        // Select a random video from the trending list
        const randomIndex = Math.floor(Math.random() * videos.length);
        const selectedVideo = videos[randomIndex];
        
        logger.info(`Selected video for posting: ${selectedVideo.title}`);
        
        const result = await postVideoToTwitter(
          selectedVideo.url, 
          settings.affiliateLink, 
          settings
        );
        
        if (result.success) {
          logger.info('Auto-post successful!');
        } else {
          logger.error(`Auto-post failed: ${result.error}`);
        }
      } else {
        logger.warn('No trending videos found for auto-posting.');
      }
    } catch (error) {
      logger.error('Error in auto-post job:', error);
    }
  } else {
    logger.info('Auto-posting is disabled or affiliate link not set.');
  }
}

// --- Analytics Collection ---
async function updateEngagementMetrics() {
  logger.info('Updating engagement metrics...');
  const settings = await loadSettings();
  
  if (!settings.analyticsEnabled) {
    logger.info('Analytics collection is disabled.');
    return;
  }
  
  try {
    const history = await loadPostHistory();
    
    // In a real app, fetch actual engagement metrics from Twitter API
    // For now, simulate random engagement updates for demonstration
    for (const post of history.posts) {
      // Only update posts from the last 7 days
      const postDate = new Date(post.timestamp);
      const now = new Date();
      const daysDifference = (now.getTime() - postDate.getTime()) / (1000 * 3600 * 24);
      
      if (daysDifference <= 7) {
        // Simulate engagement growth
        if (post.engagement) {
          post.engagement.likes += Math.floor(Math.random() * 10);
          post.engagement.retweets += Math.floor(Math.random() * 5);
          post.engagement.replies += Math.floor(Math.random() * 3);
          post.engagement.clicks = (post.engagement.clicks || 0) + Math.floor(Math.random() * 15);
        }
      }
    }
    
    await savePostHistory(history);
    logger.info('Engagement metrics updated successfully.');
  } catch (error) {
    logger.error('Error updating engagement metrics:', error);
  }
}

// --- Scheduling ---
// Schedule the auto-post job using node-cron
// Default: Run every hour
const postFrequency = process.env.AUTO_POST_INTERVAL_MINUTES || '60';
cron.schedule(`*/${postFrequency} * * * *`, autoPostJob);

// Update engagement metrics every 3 hours
cron.schedule('0 */3 * * *', updateEngagementMetrics);

// --- Server Startup ---
app.listen(port, () => {
  logger.info(`Backend server listening at http://localhost:${port}`);
  
  // Run auto-post job on startup (optional)
  // autoPostJob();
});

// --- Graceful Shutdown ---
process.on('SIGINT', async () => {
  logger.info('Shutting down server...');
  // Perform any cleanup here
  process.exit(0);
});

// Export for testing
export { app, findTrendingVideos, postVideoToTwitter };