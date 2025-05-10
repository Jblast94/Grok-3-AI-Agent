# agent-twitter-client

This is a modified version of [@the-convocation/twitter-scraper](https://github.com/the-convocation/twitter-scraper) with added functionality for sending tweets and retweets. This package does not require the Twitter API to use and will run in both the browser and server.

## Installation

```sh
npm install agent-twitter-client
```

## Setup

Configure environment variables for authentication.

```
TWITTER_USERNAME=    # Account username
TWITTER_PASSWORD=    # Account password
TWITTER_EMAIL=       # Account email
PROXY_URL=           # HTTP(s) proxy for requests (necessary for browsers)

# Twitter API v2 credentials for tweet and poll functionality
TWITTER_API_KEY=               # Twitter API Key
TWITTER_API_SECRET_KEY=        # Twitter API Secret Key
TWITTER_ACCESS_TOKEN=          # Access Token for Twitter API v2
TWITTER_ACCESS_TOKEN_SECRET=   # Access Token Secret for Twitter API v2
```

### Getting Twitter Cookies

It is important to use Twitter cookies to avoid sending a new login request to Twitter every time you want to perform an action.

In your application, you will likely want to check for existing cookies. If cookies are not available, log in with user authentication credentials and cache the cookies for future use.

```ts
const scraper = await getScraper({ authMethod: 'password' });

scraper.getCookies().then((cookies) => {
  console.log(cookies);
  // Remove 'Cookies' and save the cookies as a JSON array
});
```

## Getting Started

```ts
const scraper = new Scraper();
await scraper.login('username', 'password');

// If using v2 functionality (currently required to support polls)
await scraper.login(
  'username',
  'password',
  'email',
  'appKey',
  'appSecret',
  'accessToken',
  'accessSecret',
);

const tweets = await scraper.getTweets('elonmusk', 10);
const tweetsAndReplies = scraper.getTweetsAndReplies('elonmusk');
const latestTweet = await scraper.getLatestTweet('elonmusk');
const tweet = await scraper.getTweet('1234567890123456789');
await scraper.sendTweet('Hello world!');

// Create a poll
await scraper.sendTweetV2(
  `What's got you most hyped? Let us know! 🤖💸`,
  undefined,
  {
    poll: {
      options: [
        { label: 'AI Innovations 🤖' },
        { label: 'Crypto Craze 💸' },
        { label: 'Both! 🌌' },
        { label: 'Neither for Me 😅' },
      ],
      durationMinutes: 120, // Duration of the poll in minutes
    },
  },
);
```

### Fetching Specific Tweet Data (V2)

```ts
// Fetch a single tweet with poll details
const tweet = await scraper.getTweetV2('1856441982811529619', {
  expansions: ['attachments.poll_ids'],
  pollFields: ['options', 'end_datetime'],
});
console.log('tweet', tweet);

// Fetch multiple tweets with poll and media details
const tweets = await scraper.getTweetsV2(
  ['1856441982811529619', '1856429655215260130'],
  {
    expansions: ['attachments.poll_ids', 'attachments.media_keys'],
    pollFields: ['options', 'end_datetime'],
    mediaFields: ['url', 'preview_image_url'],
  },
);
console.log('tweets', tweets);
```

## Deploying to AWS EC2

These instructions outline how to set up an AWS EC2 instance to run this application. This guide assumes you have an AWS account and are familiar with basic AWS concepts.

### 1. Launch an EC2 Instance

1.  **Choose an Amazon Machine Image (AMI):**
    *   Go to the EC2 Dashboard in your AWS Console.
    *   Click "Launch instance".
    *   Select an AMI. A common choice is "Amazon Linux 2 AMI" or an "Ubuntu Server" AMI. Ensure it's a 64-bit (x86) or ARM architecture depending on your preference and application needs.

2.  **Choose an Instance Type:**
    *   Select an instance type based on your application's resource requirements (CPU, memory). For basic testing, a `t2.micro` or `t3.micro` (within the free tier, if eligible) might be sufficient. For production, you'll likely need a more powerful instance.

3.  **Configure Instance Details:**
    *   **Network:** Select your default VPC or a custom VPC.
    *   **Subnet:** Choose a subnet.
    *   **Auto-assign Public IP:** Enable this if you want your instance to be accessible from the internet directly (you can also use an Elastic IP later).
    *   **IAM role (Optional but Recommended):** If your application needs to interact with other AWS services (e.g., S3, DynamoDB), create an IAM role with the necessary permissions and assign it to the instance.

4.  **Add Storage:**
    *   Configure the root volume size. The default (e.g., 8GB or 10GB) is often enough for the OS and a small application. Increase if needed.

5.  **Add Tags (Optional):**
    *   Add tags for easier resource management (e.g., `Name: MyTwitterAppInstance`).

6.  **Configure Security Group:**
    *   Create a new security group or select an existing one.
    *   **Crucial:** Add inbound rules:
        *   **SSH (Port 22):** Allow access from your IP address (or a specific range) so you can connect to the instance.
        *   **HTTP (Port 80) / HTTPS (Port 443):** If your application serves web content, allow access from "Anywhere" (0.0.0.0/0, ::/0) or specific IPs.
        *   **Custom TCP Port:** If your application listens on a specific port (e.g., 3000 for a Node.js app), add a rule for that port.

7.  **Review and Launch:**
    *   Review your instance configuration.
    *   Click "Launch".
    *   You will be prompted to select an existing key pair or create a new one. **This is essential for SSH access.** Download the private key (`.pem` file) and store it securely. You will not be able to download it again.

### 2. Connect to Your EC2 Instance

1.  Once your instance is running, select it in the EC2 console and click "Connect".
2.  Follow the instructions, typically using SSH:
    ```bash
    ssh -i /path/to/your-key-pair.pem ec2-user@your-instance-public-dns
    # Or for Ubuntu:
    # ssh -i /path/to/your-key-pair.pem ubuntu@your-instance-public-dns
    ```
    *   Replace `/path/to/your-key-pair.pem` with the actual path to your downloaded private key.
    *   Replace `your-instance-public-dns` with the Public IPv4 DNS of your instance.
    *   Make sure your `.pem` file has the correct permissions (e.g., `chmod 400 your-key-pair.pem`).

### 3. Set Up the Application Environment

1.  **Update the System:**
    ```bash
    sudo yum update -y  # For Amazon Linux
    # sudo apt update && sudo apt upgrade -y # For Ubuntu
    ```

2.  **Install Node.js and npm:**
    *   The recommended way is often to use Node Version Manager (nvm) to install and manage Node.js versions.
    ```bash
    # Install nvm
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
    # Activate nvm
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"  # This loads nvm
    [ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"  # This loads nvm bash_completion
    # Verify nvm installation
    command -v nvm
    # Install the latest LTS version of Node.js (or a specific version your app needs)
    nvm install --lts
    nvm use --lts
    # Verify Node.js and npm installation
    node -v
    npm -v
    ```

3.  **Install Git (if not already present):**
    ```bash
    sudo yum install git -y  # For Amazon Linux
    # sudo apt install git -y # For Ubuntu
    ```

4.  **Clone Your Application Repository:**
    ```bash
    git clone https://github.com/Jblast94/Grok-3-AI-Agent.git
    cd Grok-3-AI-Agent/agent-twitter-client-0.0.19 # Navigate into your project directory
    ```
    *   If your repository is private, you'll need to configure SSH keys for Git or use HTTPS with credentials/tokens.

5.  **Install Application Dependencies:**
    *   Navigate to the directory containing your `package.json` (e.g., `agent-twitter-client-0.0.19/` or `agent-twitter-client-0.0.19/backend/` if it's a monorepo structure).
    ```bash
    npm install
    # If you have separate frontend/backend, you might need to run install in respective directories:
    # cd backend && npm install
    # cd ../ui && npm install
    ```

6.  **Configure Environment Variables:**
    *   Create a `.env` file in the appropriate directory (e.g., `agent-twitter-client-0.0.19/` or `agent-twitter-client-0.0.19/backend/`) with your Twitter credentials and any other required variables, similar to the `.env.example`.
    ```bash
    cp .env.example .env
    nano .env # Or use vim or another editor to set your variables
    ```
    *   **Important:** Ensure your `PROXY_URL` is set up correctly if needed, especially if running in a restricted network environment or to avoid IP-based rate limits from Twitter. You might need to set up a proxy server (e.g., Squid) on your EC2 instance or use a third-party proxy service.

### 4. Build and Run Your Application

1.  **Build the Application (if necessary):**
    *   If your project uses TypeScript or has a build step (check your `package.json` scripts):
    ```bash
    npm run build
    # Or for specific parts if it's a monorepo:
    # cd backend && npm run build
    ```

2.  **Run the Application:**
    *   Use the start command defined in your `package.json`:
    ```bash
    npm start
    # Or, for example, if your main script is backend/dist/index.js:
    # node backend/dist/index.js
    ```

3.  **Keep the Application Running (Process Manager):**
    *   For long-running applications, use a process manager like PM2 to keep your app alive, manage logs, and handle restarts.
    ```bash
    sudo npm install pm2 -g  # Install PM2 globally
    # Start your application with PM2 (adjust the path to your entry script)
    pm2 start npm --name "twitter-app" -- run start
    # Or directly:
    # pm2 start backend/dist/index.js --name "twitter-app"

    # View logs
    pm2 logs twitter-app

    # List running processes
    pm2 list

    # Save PM2 process list to resurrect on reboot
    pm2 save
    pm2 startup # This will give you a command to run to enable startup on boot
    ```

### 5. Accessing Your Application

*   If your application is a web server, you should now be able to access it via your EC2 instance's public IP address or DNS name (e.g., `http://your-instance-public-ip:your-app-port`).
*   If you configured HTTPS, ensure your SSL/TLS certificates are set up correctly (e.g., using Let's Encrypt with Certbot, or AWS Certificate Manager with a Load Balancer).

### Security Best Practices

*   **Principle of Least Privilege:** Ensure your IAM roles and security group rules only grant necessary permissions.
*   **Regular Updates:** Keep your EC2 instance's OS and software packages updated.
*   **SSH Key Security:** Protect your `.pem` key. Do not share it.
*   **Monitoring and Logging:** Set up CloudWatch Alarms and logging for your instance and application.
*   **Backup:** Regularly back up important data.
*   **Consider a Load Balancer:** For production, place your EC2 instance(s) behind an Application Load Balancer (ALB) for better scalability, availability, and easier SSL/TLS management.
*   **Firewall:** Use AWS WAF (Web Application Firewall) for additional protection against common web exploits.

This guide provides a general overview. Specific steps might vary based on your application's architecture and requirements.
## API

### Authentication

```ts
// Log in
await scraper.login('username', 'password');

// Log out
await scraper.logout();

// Check if logged in
const isLoggedIn = await scraper.isLoggedIn();

// Get current session cookies
const cookies = await scraper.getCookies();

// Set current session cookies
await scraper.setCookies(cookies);

// Clear current cookies
await scraper.clearCookies();
```

### Profile

```ts
// Get a user's profile
const profile = await scraper.getProfile('TwitterDev');

// Get a user ID from their screen name
const userId = await scraper.getUserIdByScreenName('TwitterDev');

// Get logged-in user's profile
const me = await scraper.me();
```

### Search

```ts
import { SearchMode } from 'agent-twitter-client';

// Search for recent tweets
const tweets = scraper.searchTweets('#nodejs', 20, SearchMode.Latest);

// Search for profiles
const profiles = scraper.searchProfiles('John', 10);

// Fetch a page of tweet results
const results = await scraper.fetchSearchTweets('#nodejs', 20, SearchMode.Top);

// Fetch a page of profile results
const profileResults = await scraper.fetchSearchProfiles('John', 10);
```

### Relationships

```ts
// Get a user's followers
const followers = scraper.getFollowers('12345', 100);

// Get who a user is following
const following = scraper.getFollowing('12345', 100);

// Fetch a page of a user's followers
const followerResults = await scraper.fetchProfileFollowers('12345', 100);

// Fetch a page of who a user is following
const followingResults = await scraper.fetchProfileFollowing('12345', 100);

// Follow a user
const followUserResults = await scraper.followUser('elonmusk');
```

### Trends

```ts
// Get current trends
const trends = await scraper.getTrends();

// Fetch tweets from a list
const listTweets = await scraper.fetchListTweets('1234567890', 50);
```

### Tweets

```ts
// Get a user's tweets
const tweets = scraper.getTweets('TwitterDev');

// Fetch the home timeline
const homeTimeline = await scraper.fetchHomeTimeline(10, ['seenTweetId1','seenTweetId2']);

// Get a user's liked tweets
const likedTweets = scraper.getLikedTweets('TwitterDev');

// Get a user's tweets and replies
const tweetsAndReplies = scraper.getTweetsAndReplies('TwitterDev');

// Get tweets matching specific criteria
const timeline = scraper.getTweets('TwitterDev', 100);
const retweets = await scraper.getTweetsWhere(
  timeline,
  (tweet) => tweet.isRetweet,
);

// Get a user's latest tweet
const latestTweet = await scraper.getLatestTweet('TwitterDev');

// Get a specific tweet by ID
const tweet = await scraper.getTweet('1234567890123456789');

// Send a tweet
const sendTweetResults = await scraper.sendTweet('Hello world!');

// Send a quote tweet - Media files are optional
const sendQuoteTweetResults = await scraper.sendQuoteTweet(
  'Hello world!',
  '1234567890123456789',
  ['mediaFile1', 'mediaFile2'],
);

// Retweet a tweet
const retweetResults = await scraper.retweet('1234567890123456789');

// Like a tweet
const likeTweetResults = await scraper.likeTweet('1234567890123456789');
```

## Sending Tweets with Media

### Media Handling

The scraper requires media files to be processed into a specific format before sending:

- Media must be converted to Buffer format
- Each media file needs its MIME type specified
- This helps the scraper distinguish between image and video processing models

### Basic Tweet with Media

```ts
// Example: Sending a tweet with media attachments
const mediaData = [
  {
    data: fs.readFileSync('path/to/image.jpg'),
    mediaType: 'image/jpeg',
  },
  {
    data: fs.readFileSync('path/to/video.mp4'),
    mediaType: 'video/mp4',
  },
];

await scraper.sendTweet('Hello world!', undefined, mediaData);
```

### Supported Media Types

```ts
// Image formats and their MIME types
const imageTypes = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
};

// Video format
const videoTypes = {
  '.mp4': 'video/mp4',
};
```

### Media Upload Limitations

- Maximum 4 images per tweet
- Only 1 video per tweet
- Maximum video file size: 512MB
- Supported image formats: JPG, PNG, GIF
- Supported video format: MP4

## Grok Integration

This client provides programmatic access to Grok through Twitter's interface, offering a unique capability that even Grok's official API cannot match - access to real-time Twitter data. While Grok has a standalone API, only by interacting with Grok through Twitter can you leverage its ability to analyze and respond to live Twitter content. This makes it the only way to programmatically access an LLM with direct insight into Twitter's real-time information. [@grokkyAi](https://x.com/grokkyAi)

### Basic Usage

```ts
const scraper = new Scraper();
await scraper.login('username', 'password');

// Start a new conversation
const response = await scraper.grokChat({
  messages: [{ role: 'user', content: 'What are your thoughts on AI?' }],
});

console.log(response.message); // Grok's response
console.log(response.messages); // Full conversation history
```

If no `conversationId` is provided, the client will automatically create a new conversation.

### Handling Rate Limits

Grok has rate limits of 25 messages every 2 hours for non-premium accounts. The client provides rate limit information in the response:

```ts
const response = await scraper.grokChat({
  messages: [{ role: 'user', content: 'Hello!' }],
});

if (response.rateLimit?.isRateLimited) {
  console.log(response.rateLimit.message);
  console.log(response.rateLimit.upsellInfo); // Premium upgrade information
}
```

### Response Types

The Grok integration includes TypeScript types for better development experience:

```ts
interface GrokChatOptions {
  messages: GrokMessage[];
  conversationId?: string;
  returnSearchResults?: boolean;
  returnCitations?: boolean;
}

interface GrokChatResponse {
  conversationId: string;
  message: string;
  messages: GrokMessage[];
  webResults?: any[];
  metadata?: any;
  rateLimit?: GrokRateLimit;
}
```

### Advanced Usage

```ts
const response = await scraper.grokChat({
  messages: [{ role: 'user', content: 'Research quantum computing' }],
  returnSearchResults: true, // Include web search results
  returnCitations: true, // Include citations for information
});

// Access web results if available
if (response.webResults) {
  console.log('Sources:', response.webResults);
}

// Full conversation with history
console.log('Conversation:', response.messages);
```

### Limitations

- Message history prefilling is currently limited due to unofficial API usage
- Rate limits are enforced (25 messages/2 hours for non-premium)
