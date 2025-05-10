// Types for the Twitter Auto-Poster application

export interface Settings {
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

export interface VideoContent {
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

export interface PostHistory {
  posts: Post[];
}

export interface Post {
  id: string;
  content: string;
  videoUrl: string;
  affiliateLink?: string;
  timestamp: string;
  engagement?: Engagement;
}

export interface Engagement {
  likes: number;
  retweets: number;
  replies: number;
  clicks?: number;
}

export interface PostResult {
  success: boolean;
  error?: string;
}

export interface AnalyticsData {
  totalPosts: number;
  totalEngagement: {
    likes: number;
    retweets: number;
    replies: number;
    clicks: number;
  };
  topPerformingPosts: Post[];
  engagementRate: number;
  clickThroughRate: number;
  conversionRate?: number;
  revenueGenerated?: number;
}

export interface ContentSource {
  id: string;
  name: string;
  enabled: boolean;
  apiKey?: string;
  categories?: string[];
}

export interface HashtagGroup {
  id: string;
  name: string;
  hashtags: string[];
}

export interface ScheduleSettings {
  frequency: 'hourly' | 'daily' | 'custom';
  customMinutes?: number;
  timeOfDay?: string; // For daily posts, format: "HH:MM"
  daysOfWeek?: number[]; // 0-6, where 0 is Sunday
  maxPostsPerDay?: number;
}