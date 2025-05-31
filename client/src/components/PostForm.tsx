import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Upload, Send, Twitter, Linkedin, Facebook, Instagram, Calendar } from 'lucide-react';
import { Post } from '../pages/Index';

interface PostFormProps {
  onPostCreated: (post: Post) => void;
  generatedCaptions: string[];
}

const PostForm = ({ onPostCreated, generatedCaptions }: PostFormProps) => {
  const [content, setContent] = useState('');
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [image, setImage] = useState<string | null>(null);
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledDate, setScheduledDate] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const [showAICaptions, setShowAICaptions] = useState(true);
  const [connections, setConnections] = useState<{ [key: string]: boolean }>({ Twitter: false, LinkedIn: false });
  const { toast } = useToast();

  // Fetch connection status from backend
  useEffect(() => {
    const fetchConnections = async () => {
      try {
        const twitterRes = await fetch('/api/status/twitter');
        const linkedinRes = await fetch('/api/status/linkedin');
        const twitter = await twitterRes.json();
        const linkedin = await linkedinRes.json();
        setConnections({
          Twitter: twitter.connected,
          LinkedIn: linkedin.connected
        });
      } catch (e) {
        // fallback: assume not connected
        setConnections({ Twitter: false, LinkedIn: false });
      }
    };
    fetchConnections();
  }, []);

  const platforms = [
    { name: 'Twitter', icon: Twitter, color: 'text-blue-500' },
    { name: 'LinkedIn', icon: Linkedin, color: 'text-blue-700' },
    { name: 'Facebook', icon: Facebook, color: 'text-blue-600' },
    { name: 'Instagram', icon: Instagram, color: 'text-pink-500' }
  ];

  const togglePlatform = (platform: string) => {
    setSelectedPlatforms(prev =>
      prev.includes(platform)
        ? prev.filter(p => p !== platform)
        : [...prev, platform]
    );
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => setImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handlePost = async () => {
    if (!content.trim() || selectedPlatforms.length === 0) {
      toast({
        title: "Missing Information",
        description: "Please add content and select at least one platform",
        variant: "destructive"
      });
      return;
    }
    // Only allow posting to connected platforms
    const notConnected = selectedPlatforms.filter(p => connections[p] === false && (p === 'Twitter' || p === 'LinkedIn'));
    if (notConnected.length > 0) {
      toast({
        title: "Account Not Connected",
        description: `Please connect your ${notConnected.join(', ')} account(s) before posting.`,
        variant: "destructive"
      });
      return;
    }
    setIsPosting(true);
    try {
      // Simulate API call to post to selected platforms
      await new Promise(resolve => setTimeout(resolve, 2000));
      const newPost: Post = {
        id: Date.now().toString(),
        content,
        platforms: selectedPlatforms,
        image: image || undefined,
        scheduledDate: isScheduled ? new Date(scheduledDate) : undefined,
        status: isScheduled ? 'scheduled' : 'posted',
        createdAt: new Date()
      };
      onPostCreated(newPost);
      toast({
        title: isScheduled ? "Post Scheduled!" : "Post Published!",
        description: `Successfully ${isScheduled ? 'scheduled' : 'posted'} to ${selectedPlatforms.join(', ')}`
      });
      setContent('');
      setSelectedPlatforms([]);
      setImage(null);
      setIsScheduled(false);
      setScheduledDate('');
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to publish post. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsPosting(false);
    }
  };

  // --- OAuth Connect Handlers ---
  const handleConnect = (platform: string) => {
    // Redirect to backend OAuth endpoint for the selected platform
    if (platform === 'Twitter') {
      window.location.href = 'http://localhost:3000/auth/twitter';
    } else if (platform === 'LinkedIn') {
      window.location.href = 'http://localhost:3000/auth/linkedin/login';
    }
  };

  // --- AI Caption Selection ---
  const handleGeneratedCaptionClick = (caption: string) => {
    setContent(caption);
  };

  return (
    <div className="space-y-6">
      {/* Connect Accounts Section */}
      <div className="flex items-center space-x-4 mb-2">
        <span className="font-medium text-slate-700">Connect your accounts:</span>
        <Button
          variant={connections.Twitter ? 'secondary' : 'default'}
          onClick={() => handleConnect('Twitter')}
          disabled={connections.Twitter}
        >
          {connections.Twitter ? 'Twitter Connected' : 'Connect Twitter'}
        </Button>
        <Button
          variant={connections.LinkedIn ? 'secondary' : 'default'}
          onClick={() => handleConnect('LinkedIn')}
          disabled={connections.LinkedIn}
        >
          {connections.LinkedIn ? 'LinkedIn Connected' : 'Connect LinkedIn'}
        </Button>
      </div>

      {/* AI Caption Toggle */}
      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          checked={showAICaptions}
          onChange={() => setShowAICaptions(v => !v)}
          id="show-ai-captions"
        />
        <label htmlFor="show-ai-captions">Show AI-generated captions</label>
      </div>

      {/* Generated Captions */}
      {showAICaptions && generatedCaptions.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-medium text-slate-700">✨ Generated Captions</h4>
          <div className="grid gap-2">
            {generatedCaptions.map((caption, index) => (
              <button
                key={index}
                type="button"
                onClick={() => handleGeneratedCaptionClick(caption)}
                className="text-left p-3 text-sm bg-gradient-to-r from-purple-50 to-blue-50 hover:from-purple-100 hover:to-blue-100 rounded-lg border border-purple-200/50 transition-all duration-200"
              >
                {caption}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Content Input */}
      <div className="space-y-3">
        <label className="text-sm font-medium text-slate-700">Content</label>
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="What's on your mind? Share your thoughts..."
          className="min-h-[120px] resize-none border-slate-200 focus:border-purple-300 focus:ring-purple-200 rounded-xl"
        />
      </div>

      {/* Image Upload */}
      <div className="space-y-3">
        <label className="text-sm font-medium text-slate-700">Image (Optional)</label>
        <div className="flex items-center space-x-4">
          <input
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden"
            id="image-upload"
          />
          <label
            htmlFor="image-upload"
            className="flex items-center space-x-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer transition-colors"
          >
            <Upload className="w-4 h-4" />
            <span className="text-sm">Upload Image</span>
          </label>
          {image && (
            <img src={image} alt="Preview" className="w-16 h-16 object-cover rounded-lg" />
          )}
        </div>
      </div>

      {/* Platform Selection */}
      <div className="space-y-3">
        <label className="text-sm font-medium text-slate-700">Select Platforms</label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {platforms.map((platform) => (
            <button
              key={platform.name}
              onClick={() => togglePlatform(platform.name)}
              className={`p-3 rounded-lg border-2 transition-all duration-200 ${
                selectedPlatforms.includes(platform.name)
                  ? 'border-purple-300 bg-purple-50'
                  : 'border-slate-200 hover:border-slate-300'
              } ${!(platform.name in connections) || connections[platform.name] || (platform.name !== 'Twitter' && platform.name !== 'LinkedIn') ? '' : 'opacity-50 cursor-not-allowed'}`}
              disabled={(platform.name === 'Twitter' || platform.name === 'LinkedIn') && !connections[platform.name]}
            >
              <platform.icon className={`w-5 h-5 mx-auto mb-1 ${platform.color}`} />
              <span className="text-xs font-medium">{platform.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Schedule Toggle */}
      <div className="flex items-center space-x-3">
        <input
          type="checkbox"
          id="schedule"
          checked={isScheduled}
          onChange={(e) => setIsScheduled(e.target.checked)}
          className="rounded"
        />
        <label htmlFor="schedule" className="text-sm font-medium text-slate-700 flex items-center space-x-1">
          <Calendar className="w-4 h-4" />
          <span>Schedule for later</span>
        </label>
      </div>

      {/* Schedule Date */}
      {isScheduled && (
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700">Schedule Date & Time</label>
          <input
            type="datetime-local"
            value={scheduledDate}
            onChange={(e) => setScheduledDate(e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:border-purple-300 focus:ring-purple-200"
          />
        </div>
      )}

      {/* Post Button */}
      <Button
        onClick={handlePost}
        disabled={isPosting || !content.trim() || selectedPlatforms.length === 0}
        className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-medium py-3 px-6 rounded-xl shadow-lg transition-all duration-200"
      >
        {isPosting ? (
          <>
            <div className="w-5 h-5 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent" />
            {isScheduled ? 'Scheduling...' : 'Publishing...'}
          </>
        ) : (
          <>
            <Send className="w-5 h-5 mr-2" />
            {isScheduled ? 'Schedule Post' : 'Publish Now'}
          </>
        )}
      </Button>
    </div>
  );
};

export default PostForm;
