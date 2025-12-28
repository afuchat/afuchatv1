import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useDeveloperStatus } from '@/hooks/useDeveloperStatus';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { MessageSquare, UserPlus, Calendar, Lock, Camera, Building2, UserX, Clock, Users, MoreVertical, Share2, Footprints, Github } from 'lucide-react';
import { ButtonLoader } from '@/components/ui/CustomLoader';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { ProfileSkeleton } from '@/components/skeletons';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { useTranslation } from 'react-i18next';
import { GradeBadge, type Grade } from '@/components/gamification/GradeBadge';
import { NexaProgressBar } from '@/components/gamification/NexaProgressBar';
import { AchievementBadges } from '@/components/gamification/AchievementBadges';
import { ReferralSystem } from '@/components/gamification/ReferralSystem';
import { ReceivedGifts } from '@/components/gifts/ReceivedGifts';
import { TipStats } from '@/components/tips/TipStats';
import { TipButton } from '@/components/tips/TipButton';
import ProfileActionsSheet from '@/components/ProfileActionsSheet';
import { PinnedGiftsDisplay } from '@/components/gifts/PinnedGiftsDisplay';
import { useAITranslation } from '@/hooks/useAITranslation';
import { ImageCarousel } from '@/components/ui/ImageCarousel';
import { LinkPreviewCard } from '@/components/ui/LinkPreviewCard';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { VerifiedBadge } from '@/components/VerifiedBadge';
import { BusinessBadge } from '@/components/BusinessBadge';
import { AffiliatedBadge } from '@/components/AffiliatedBadge';
import { AffiliateDetailsSheet } from '@/components/AffiliateDetailsSheet';
import { VerifiedDetailsSheet } from '@/components/VerifiedDetailsSheet';
import { OnlineStatus } from '@/components/OnlineStatus';
import { StoryAvatar } from '@/components/moments/StoryAvatar';
import { SEO } from '@/components/SEO';
import { UserPremiumBadge } from '@/components/UserPremiumBadge';
import { BusinessBenefitsSheet } from '@/components/BusinessBenefitsSheet';
import { getCountryFlag } from '@/lib/countryFlags';
import { PrivateProfileOverlay } from '@/components/PrivateProfileOverlay';
import { FollowRequestsSheet } from '@/components/FollowRequestsSheet';
import UserActionsSheet from '@/components/UserActionsSheet';
import { QuotedPostCard } from '@/components/feed/QuotedPostCard';
import { WarningBadge } from '@/components/WarningBadge';
import { ProfileViewsSheet } from '@/components/ProfileViewsSheet';
import { EditPostModal } from '@/components/EditPostModal';
import { DeveloperProfileSection } from '@/components/developer/DeveloperProfileSection';
import { DeveloperShowcase } from '@/components/developer/DeveloperShowcase';
import { Ellipsis, Pencil } from 'lucide-react';

interface Profile {
	id: string;
	display_name: string;
	handle: string;
	bio?: string;
	is_verified?: boolean;
	is_organization_verified?: boolean;
	is_affiliate?: boolean;
	is_private?: boolean;
	is_warned?: boolean;
	is_banned?: boolean;
	warning_reason?: string | null;
	created_at?: string;
	xp: number;
	current_grade: Grade;
	avatar_url?: string | null;
	banner_url?: string | null;
	website_url?: string | null;
	github_url?: string | null;
	portfolio_url?: string | null;
	developer_tagline?: string | null;
	available_for_hire?: boolean;
	is_business_mode?: boolean;
	business_category?: string | null;
	country?: string | null;
	affiliated_business_id?: string | null;
	affiliated_business?: {
		avatar_url: string | null;
		display_name: string;
	} | null;
	affiliation_date?: string;
	last_seen?: string | null;
	show_online_status?: boolean;
	show_balance?: boolean;
}

interface Post {
	id: string;
	content: string;
	created_at: string;
	acknowledgment_count: number;
	reply_count: number;
	is_blocked?: boolean;
	blocked_reason?: string;
	quoted_post_id?: string | null;
	quoted_post?: {
		id: string;
		content: string;
		created_at: string;
		author_id: string;
		image_url?: string | null;
		post_images?: Array<{ image_url: string; display_order: number; alt_text?: string }>;
		is_developer?: boolean;
		profiles: {
			display_name: string;
			handle: string;
			is_verified: boolean;
			is_organization_verified: boolean;
			avatar_url?: string | null;
		};
	} | null;
	post_images?: Array<{
		image_url: string;
		alt_text: string | null;
		display_order: number;
	}>;
	post_link_previews?: Array<{
		url: string;
		title?: string | null;
		description?: string | null;
		image_url?: string | null;
		site_name?: string | null;
	}>;
}

const isUUID = (str: string): boolean => {
	const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
	return uuidRegex.test(str);
};

const MENTION_REGEX = /@(\w+)/g;

const ContentParser: React.FC<{ content: string, isBio?: boolean }> = ({ content, isBio = false }) => {
	const { i18n, t } = useTranslation();
	const { translateText } = useAITranslation();
	const [translatedContent, setTranslatedContent] = useState<string | null>(null);
	const [isTranslating, setIsTranslating] = useState(false);
	const navigate = useNavigate();

	// Ensure content is a string
	const safeContent = typeof content === 'string' ? content : String(content || '');

	const handleTranslate = async () => {
		if (translatedContent) {
			setTranslatedContent(null);
			return;
		}
		setIsTranslating(true);
		const translated = await translateText(safeContent, i18n.language);
		setTranslatedContent(translated);
		setIsTranslating(false);
	};

	const displayContent = translatedContent || safeContent;
	
	// Parse mentions, hashtags, and links (including plain domains like dev-write.netlify.app)
	const combinedRegex = /(@[a-zA-Z0-9_-]+|#\w+|https?:\/\/[^\s]+|(?:www\.)?[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)+(?:\/[^\s]*)?)/g;
	const parts: React.ReactNode[] = [];
	let lastIndex = 0;
	
	const matches = Array.from(displayContent.matchAll(combinedRegex));
	
	matches.forEach((match, idx) => {
		const matchText = match[0];
		const index = match.index!;
		
		if (index > lastIndex) {
			parts.push(displayContent.substring(lastIndex, index));
		}
		
		if (matchText.startsWith('@')) {
			const handle = matchText.substring(1);
			parts.push(
				<Link
					key={`mention-${idx}`}
					to={`/${handle}`} 
					className="text-blue-500 hover:text-blue-400 font-medium transition-colors"
					onClick={(e) => e.stopPropagation()}
				>
					{matchText}
				</Link>
			);
		} else if (matchText.startsWith('#')) {
			const hashtag = matchText.substring(1);
			parts.push(
				<Link
					key={`hashtag-${idx}`}
					to={`/search?q=${encodeURIComponent(hashtag)}`}
					className="text-primary hover:underline font-medium"
					onClick={(e) => e.stopPropagation()}
				>
					{matchText}
				</Link>
			);
		} else {
			// It's a URL (either with protocol or plain domain)
			const url = matchText.startsWith('http') ? matchText : `https://${matchText}`;
			parts.push(
				<a
					key={`url-${idx}`}
					href={url}
					target="_blank"
					rel="noopener noreferrer"
					className="text-primary hover:underline"
					onClick={(e) => e.stopPropagation()}
				>
					{matchText.length > 50 ? matchText.substring(0, 50) + '...' : matchText}
				</a>
			);
		}
		
		lastIndex = index + matchText.length;
	});

	if (lastIndex < displayContent.length) {
		parts.push(displayContent.substring(lastIndex));
	}

	const className = isBio
		? "mt-3 text-sm whitespace-pre-wrap leading-relaxed"
		: "text-foreground whitespace-pre-wrap leading-relaxed";

	return (
		<div>
			<p className={className}>{parts}</p>
			{i18n.language !== 'en' && !isBio && (
				<Button
					variant="ghost"
					size="sm"
					onClick={handleTranslate}
					disabled={isTranslating}
					className="text-xs text-muted-foreground hover:text-primary mt-1 p-0 h-auto"
				>
					{isTranslating ? t('common.translating') : translatedContent ? t('common.showOriginal') : t('common.translate')}
				</Button>
			)}
		</div>
	);
};

// Profile Avatar Display Component
const ProfileAvatarDisplay = ({ profileId, profile }: { profileId: string | null; profile: Profile | null }) => {
	const { user } = useAuth();
	const navigate = useNavigate();

	const isOwnProfile = user?.id === profileId;

	const handleClick = () => {
		if (isOwnProfile) {
			navigate(`/${profileId}/edit`);
		}
	};

	const initials = profile?.display_name?.charAt(0).toUpperCase() || 'U';

	// Show uploaded avatar if available
	if (profile?.avatar_url) {
		return (
			<div 
				className={`w-full h-full ${isOwnProfile ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}`}
				onClick={handleClick}
				title={isOwnProfile ? 'Click to edit profile picture' : undefined}
			>
				<img 
					src={profile.avatar_url} 
					alt={profile.display_name}
					className="w-full h-full object-cover"
				/>
			</div>
		);
	}

	// Fall back to Avatar with initials
	return (
		<Avatar 
			className={`w-full h-full ${isOwnProfile ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}`}
			onClick={handleClick}
		>
			<AvatarFallback className="text-4xl">{initials}</AvatarFallback>
		</Avatar>
	);
};

interface ProfileProps {
	mustExist?: boolean;
}

const Profile = ({ mustExist = false }: ProfileProps) => {
	const { t } = useTranslation();
    const { userId: urlParam } = useParams<{ userId: string }>(); 
	const navigate = useNavigate();
	const { user } = useAuth();
	const [profile, setProfile] = useState<Profile | null>(null);
	const [posts, setPosts] = useState<Post[]>([]);
	const [isFollowing, setIsFollowing] = useState(false);
	const [followCount, setFollowCount] = useState({ followers: 0, following: 0 });
	const [totalLikes, setTotalLikes] = useState(0);
	const [loading, setLoading] = useState(true);
	const [selectedAffiliate, setSelectedAffiliate] = useState<{
		userName: string;
		businessName: string;
		affiliatedDate: string;
		businessLogo?: string;
	} | null>(null);
	const [selectedVerified, setSelectedVerified] = useState<{
		userName: string;
		isVerified: boolean;
		isOrgVerified: boolean;
		isDeveloper?: boolean;
		createdAt?: string;
	} | null>(null);
	const [affiliatedUsers, setAffiliatedUsers] = useState<Array<{
		id: string;
		display_name: string;
		handle: string;
		avatar_url: string | null;
		is_verified: boolean;
		is_organization_verified: boolean;
		affiliation_date: string;
	}>>([]);

	const [profileId, setProfileId] = useState<string | null>(null);
	const [isAdmin, setIsAdmin] = useState(false);
	const [isActionsSheetOpen, setIsActionsSheetOpen] = useState(false);
	const [isUploadingBanner, setIsUploadingBanner] = useState(false);
	const [currentUserIsVerified, setCurrentUserIsVerified] = useState(false);
	const [isBusinessBenefitsOpen, setIsBusinessBenefitsOpen] = useState(false);
	const [followRequestStatus, setFollowRequestStatus] = useState<'none' | 'pending' | 'approved' | 'rejected'>('none');
	const [isRequestingFollow, setIsRequestingFollow] = useState(false);
	const [isFollowRequestsOpen, setIsFollowRequestsOpen] = useState(false);
	const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
	const [isFollowedByProfile, setIsFollowedByProfile] = useState(false); // Does profile user follow current user?
	const [isUserActionsSheetOpen, setIsUserActionsSheetOpen] = useState(false);
	const [isBlocked, setIsBlocked] = useState(false);
	const [isChatLoading, setIsChatLoading] = useState(false);
	const [isProfileViewsOpen, setIsProfileViewsOpen] = useState(false);
	const [profileViewsCount, setProfileViewsCount] = useState(0);
	const [editingPost, setEditingPost] = useState<Post | null>(null);

	// Check if the profile user is a developer
	const { isDeveloper } = useDeveloperStatus(profileId || undefined);

	// Scroll-based avatar animation
	const scrollContainerRef = useRef<HTMLDivElement>(null);
	const [scrollProgress, setScrollProgress] = useState(0);

	const updateScrollProgress = useCallback((scrollTop: number) => {
		const progress = Math.min(Math.max(scrollTop, 0) / 150, 1);
		setScrollProgress(progress);
	}, []);

	const handleProfileScroll = (e: React.UIEvent<HTMLDivElement>) => {
		updateScrollProgress(e.currentTarget.scrollTop);
	};

	useEffect(() => {
		// Fallback for layouts where the page scrolls on window instead of the container
		const handleWindowScroll = () => {
			updateScrollProgress(window.scrollY || 0);
		};

		window.addEventListener('scroll', handleWindowScroll, { passive: true });
		// initialize
		handleWindowScroll();
		return () => window.removeEventListener('scroll', handleWindowScroll);
	}, [updateScrollProgress]);


	const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
		if (!e.target.files || e.target.files.length === 0 || !user || !profileId) return;

		const file = e.target.files[0];
		
		// Validate file type
		if (!file.type.startsWith('image/')) {
			toast.error('Please upload an image file');
			return;
		}

		// Validate file size (max 5MB)
		if (file.size > 5 * 1024 * 1024) {
			toast.error('Image size must be less than 5MB');
			return;
		}

		setIsUploadingBanner(true);

		try {
			// Delete old banner if exists
			if (profile?.banner_url) {
				const oldFileName = profile.banner_url.split('/profile-banners/').pop();
				if (oldFileName) {
					await supabase.storage.from('profile-banners').remove([oldFileName]);
				}
			}

			// Upload new banner with proper folder structure
			const fileExt = file.name.split('.').pop();
			const fileName = `${user.id}/${Date.now()}.${fileExt}`;

			const { error: uploadError } = await supabase.storage
				.from('profile-banners')
				.upload(fileName, file, {
					cacheControl: '3600',
					upsert: true
				});

			if (uploadError) throw uploadError;

			// Get public URL
			const { data: { publicUrl } } = supabase.storage
				.from('profile-banners')
				.getPublicUrl(fileName);

			// Update profile
			const { error: updateError } = await supabase
				.from('profiles')
				.update({ banner_url: publicUrl })
				.eq('id', user.id);

			if (updateError) throw updateError;

			setProfile(prev => prev ? { ...prev, banner_url: publicUrl } : null);
			toast.success('Banner updated successfully!');
		} catch (error: any) {
			console.error('Error uploading banner:', error);
			toast.error(error.message || 'Failed to upload banner');
		} finally {
			setIsUploadingBanner(false);
		}
	};

	const fetchFollowCounts = useCallback(async (id: string) => {
		if (!id) return;

		const { count: followerCount } = await supabase
			.from('follows')
			.select('id', { count: 'exact', head: true })
			.eq('following_id', id);

		const { count: followingCount } = await supabase
			.from('follows')
			.select('id', { count: 'exact', head: true })
			.eq('follower_id', id);

		setFollowCount({
			followers: followerCount || 0,
			following: followingCount || 0
		});
	}, []);

	const fetchTotalLikes = useCallback(async (id: string) => {
		if (!id) return;

		// Get all posts by the user and count their acknowledgments
		const { data: userPosts } = await supabase
			.from('posts')
			.select('id')
			.eq('author_id', id);

		if (!userPosts || userPosts.length === 0) {
			setTotalLikes(0);
			return;
		}

		const postIds = userPosts.map(p => p.id);
		const { count } = await supabase
			.from('post_acknowledgments')
			.select('id', { count: 'exact', head: true })
			.in('post_id', postIds);

		setTotalLikes(count || 0);
	}, []);

	const fetchAdminStatus = useCallback(async (userId: string) => {
		if (!userId) {
			setIsAdmin(false);
			return;
		}

		const { data } = await supabase
			.from('user_roles')
			.select('role')
			.eq('user_id', userId)
			.eq('role', 'admin') 
			.limit(1)
			.maybeSingle(); 

		setIsAdmin(!!data); 
	}, []);

	const fetchAffiliatedUsers = useCallback(async (businessId: string) => {
		const { data: affiliateRequests, error: requestsError } = await supabase
			.from('affiliate_requests')
			.select('user_id, requested_at')
			.eq('business_profile_id', businessId)
			.eq('status', 'approved');

		if (requestsError || !affiliateRequests) {
			console.error('Error fetching affiliate requests:', requestsError);
			return;
		}

		const userIds = affiliateRequests.map(req => req.user_id);
		if (userIds.length === 0) {
			setAffiliatedUsers([]);
			return;
		}

		const { data: users, error: usersError } = await supabase
			.from('profiles')
			.select('id, display_name, handle, avatar_url, is_verified, is_organization_verified')
			.in('id', userIds);

		if (usersError || !users) {
			console.error('Error fetching affiliated users:', usersError);
			return;
		}

		const usersWithDates = users.map(user => {
			const request = affiliateRequests.find(req => req.user_id === user.id);
			return {
				...user,
				affiliation_date: request?.requested_at || ''
			};
		});

		setAffiliatedUsers(usersWithDates);
	}, []);

	const fetchProfile = useCallback(async () => {
		setLoading(true);
		setProfile(null);
		setProfileId(null);

		if (!urlParam) { 
			setLoading(false);
			return;
		}

		// Validate urlParam - reject invalid patterns like *, special characters
		const isValidUsername = /^[a-zA-Z0-9_-]+$/.test(urlParam) || isUUID(urlParam);
		if (!isValidUsername) {
			// Invalid username pattern - redirect to not found
			navigate('/page-not-found', { replace: true, state: { path: `/${urlParam}` } });
			return;
		}

		const isParamUUID = isUUID(urlParam);

		let query = supabase
			.from('profiles')
			.select('*, created_at, last_seen, show_online_status, banner_url, show_balance, github_url, portfolio_url, developer_tagline, available_for_hire')
			.limit(1);

		if (isParamUUID) {
			query = query.eq('id', urlParam);
		} else {
			query = query.ilike('handle', urlParam);
		}

		const { data, error } = await query.maybeSingle();

		if (error && error.code !== 'PGRST116') {
			toast.error(t('common.error'));
			console.error('Profile fetch error:', error);
			setLoading(false);
			return;
		}

		if (!data) {
			// User not found
			if (mustExist) {
				// For /@user routes, show user not found page
				navigate('/user-not-found', { replace: true, state: { username: urlParam } });
			} else {
				// For /user routes, treat as user not found
				navigate('/user-not-found', { replace: true, state: { username: urlParam } });
			}
			return;
		}

		let profileData: Profile = data as Profile;

		// Fetch affiliated business data if user is an affiliate
		if (profileData.affiliated_business_id) {
			const { data: businessData } = await supabase
				.from('profiles')
				.select('avatar_url, display_name')
				.eq('id', profileData.affiliated_business_id)
				.maybeSingle();
			
			if (businessData) {
				profileData.affiliated_business = {
					avatar_url: businessData.avatar_url,
					display_name: businessData.display_name
				};
			}

			// Fetch affiliation date - use reviewed_at (approval date) or fallback to requested_at
			if (profileData.is_affiliate) {
				const { data: affiliationData, error: affiliationError } = await supabase
					.from('affiliate_requests')
					.select('reviewed_at, requested_at')
					.eq('user_id', data.id)
					.eq('status', 'approved')
					.maybeSingle();

				console.log('Affiliation data:', affiliationData, 'Error:', affiliationError);

				if (affiliationData) {
					// Use reviewed_at (when approved) or fallback to requested_at
					profileData.affiliation_date = affiliationData.reviewed_at || affiliationData.requested_at;
				}
			}
		}

		setProfile(profileData);
		setProfileId(data.id);
		await fetchFollowCounts(data.id);
		
		// Fetch affiliated users if this is a business profile
		if (profileData.is_business_mode) {
			await fetchAffiliatedUsers(data.id);
		}
		
		setLoading(false);

	}, [urlParam, navigate, fetchFollowCounts, fetchAffiliatedUsers]);

	const checkFollowStatus = useCallback(async (id: string) => {
		if (!user || !id) return;

		// Check if current user follows profile user
		const { data } = await supabase
			.from('follows')
			.select('id')
			.eq('follower_id', user.id)
			.eq('following_id', id)
			.limit(1)
			.maybeSingle();

		setIsFollowing(!!data);

		// Check if profile user follows current user (for mutual/friends status)
		const { data: reverseFollow } = await supabase
			.from('follows')
			.select('id')
			.eq('follower_id', id)
			.eq('following_id', user.id)
			.limit(1)
			.maybeSingle();

		setIsFollowedByProfile(!!reverseFollow);

		// Check if user is blocked
		const { data: blockedData } = await supabase
			.from('blocked_users')
			.select('id')
			.eq('blocker_id', user.id)
			.eq('blocked_id', id)
			.maybeSingle();

		setIsBlocked(!!blockedData);

		// Check for pending follow request if target is private
		const { data: requestData } = await supabase
			.from('follow_requests')
			.select('status')
			.eq('requester_id', user.id)
			.eq('target_id', id)
			.maybeSingle();

		if (requestData) {
			setFollowRequestStatus(requestData.status as 'pending' | 'approved' | 'rejected');
		} else {
			setFollowRequestStatus('none');
		}
	}, [user]);

	const fetchUserPosts = useCallback(async (id: string) => {
		if (!id) return;

		// Load cached posts first
		const cacheKey = `cachedProfilePosts_${id}`;
		const cachedPosts = sessionStorage.getItem(cacheKey);
		if (cachedPosts) {
			try {
				setPosts(JSON.parse(cachedPosts));
			} catch (e) {
				console.error('Failed to parse cached posts:', e);
			}
		}

		// Private accounts: only show posts if current user follows them
		if (profile?.is_private && user?.id !== id && !isFollowing) {
			setPosts([]);
			return;
		}
		
		// For own profile, show all posts including blocked ones
		// For others, only show non-blocked posts
		const isOwnProfile = user?.id === id;
		
		let query = supabase
			.from('posts')
			.select(`
				id, 
				content, 
				created_at,
				quoted_post_id,
				is_blocked,
				blocked_reason,
				post_images (
					image_url,
					alt_text,
					display_order
				),
				post_link_previews (
					url,
					title,
					description,
					image_url,
					site_name
				)
			`)
			.eq('author_id', id)
			.order('created_at', { ascending: false })
			.limit(20);
		
		// Only filter out blocked posts for other users' profiles
		if (!isOwnProfile) {
			query = query.eq('is_blocked', false);
		}
		
		const { data, error } = await query;

		if (!error && data) {
			// Fetch quoted posts if any
			const quotedPostIds = data.filter(p => p.quoted_post_id).map(p => p.quoted_post_id);
			let quotedPostsMap = new Map();
			
			if (quotedPostIds.length > 0) {
				const { data: quotedPostsData } = await supabase
					.from('posts')
					.select(`
						id, content, created_at, author_id, image_url,
						post_images(image_url, display_order, alt_text),
						profiles(display_name, handle, is_verified, is_organization_verified, avatar_url)
					`)
					.in('id', quotedPostIds);
				
				// Fetch developer status for quoted post authors
				const quotedAuthorIds = (quotedPostsData || []).map((qp: any) => qp.author_id);
				const { data: quotedDevData } = await supabase
					.from('developer_roles')
					.select('user_id')
					.in('user_id', quotedAuthorIds);
				const quotedDevSet = new Set((quotedDevData || []).map((d: any) => d.user_id));
				
				if (quotedPostsData) {
					quotedPostsData.forEach((qp: any) => {
						qp.is_developer = quotedDevSet.has(qp.author_id);
						quotedPostsMap.set(qp.id, qp);
					});
				}
			}

			const postIds = data.map(p => p.id);
			const [likeCountsRes, replyCountsRes] = await Promise.all([
				supabase.rpc('get_post_like_counts', { post_ids: postIds }),
				supabase.rpc('get_post_reply_counts', { post_ids: postIds }),
			]);

			const likeCountMap = new Map<string, number>();
			(likeCountsRes.data || []).forEach((row: any) => likeCountMap.set(row.post_id, Number(row.like_count || 0)));

			const replyCountMap = new Map<string, number>();
			(replyCountsRes.data || []).forEach((row: any) => replyCountMap.set(row.post_id, Number(row.reply_count || 0)));

			const processedPosts = data.map(p => ({
				...p,
				quoted_post: p.quoted_post_id ? quotedPostsMap.get(p.quoted_post_id) : null,
				acknowledgment_count: likeCountMap.get(p.id) ?? 0,
				reply_count: replyCountMap.get(p.id) ?? 0,
			} as Post));
			setPosts(processedPosts);
			sessionStorage.setItem(cacheKey, JSON.stringify(processedPosts));
		} else {
			setPosts([]);
		}
	}, [profile, user]);


	useEffect(() => {
		fetchProfile();
	}, [fetchProfile]);

	useEffect(() => {
		if (profileId) {
			fetchFollowCounts(profileId);
			fetchTotalLikes(profileId);
			fetchUserPosts(profileId);
			if (user && user.id !== profileId) {
				checkFollowStatus(profileId);
			}
		}
	}, [profileId, user, fetchUserPosts, fetchFollowCounts, checkFollowStatus]);

	// Real-time subscription for posts
	useEffect(() => {
		if (!profileId) return;

		const channel = supabase
			.channel('profile-posts-updates')
			.on('postgres_changes', { event: '*', schema: 'public', table: 'posts', filter: `author_id=eq.${profileId}` }, () => {
				fetchUserPosts(profileId);
			})
			.subscribe();

		return () => {
			supabase.removeChannel(channel);
		};
	}, [profileId, fetchUserPosts]);

	useEffect(() => {
		if (user) {
			fetchAdminStatus(user.id);
		} else {
			setIsAdmin(false);
		}
	}, [user, fetchAdminStatus]);

	// Fetch current user's verification status
	useEffect(() => {
		const fetchCurrentUserVerification = async () => {
			if (!user) {
				setCurrentUserIsVerified(false);
				return;
			}

			const { data, error } = await supabase
				.from('profiles')
				.select('is_verified, is_organization_verified')
				.eq('id', user.id)
				.maybeSingle();

			if (!error && data) {
				setCurrentUserIsVerified(data.is_verified || data.is_organization_verified || false);
			}
		};

		fetchCurrentUserVerification();
	}, [user]);

	// Listen for Nexa updates from gift sending
	useEffect(() => {
		const handleNexaUpdate = (event: CustomEvent) => {
			// If viewing own profile, update the Nexa and grade
			if (user && profileId === user.id) {
				setProfile(prev => prev ? {
					...prev,
					xp: event.detail.xp || prev.xp,
					current_grade: event.detail.grade || prev.current_grade
				} : null);
			}
		};

		window.addEventListener('nexa-updated', handleNexaUpdate as EventListener);
		return () => {
			window.removeEventListener('nexa-updated', handleNexaUpdate as EventListener);
		};
	}, [user, profileId]);

	// Fetch pending follow requests count for own profile
	useEffect(() => {
		const fetchPendingRequestsCount = async () => {
			if (!user || profileId !== user.id) {
				setPendingRequestsCount(0);
				return;
			}

			const { count } = await supabase
				.from('follow_requests')
				.select('id', { count: 'exact', head: true })
				.eq('target_id', user.id)
				.eq('status', 'pending');

			setPendingRequestsCount(count || 0);
		};

		fetchPendingRequestsCount();
	}, [user, profileId]);

	// Record profile view and fetch views count for own profile
	useEffect(() => {
		const recordProfileView = async () => {
			if (!user || !profileId || user.id === profileId) return;
			
			// Check if already viewed in the last 24 hours
			const twentyFourHoursAgo = new Date();
			twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);
			
			const { data: existingView } = await supabase
				.from('profile_views')
				.select('id, viewed_at')
				.eq('profile_id', profileId)
				.eq('viewer_id', user.id)
				.gte('viewed_at', twentyFourHoursAgo.toISOString())
				.maybeSingle();
			
			// Only record if no view in the last 24 hours
			if (!existingView) {
				// Record the view
				const { error } = await supabase
					.from('profile_views')
					.upsert(
						{ profile_id: profileId, viewer_id: user.id, viewed_at: new Date().toISOString() },
						{ onConflict: 'profile_id,viewer_id' }
					);
				
				if (!error) {
					// Send notification to profile owner
					await supabase
						.from('notifications')
						.insert({
							user_id: profileId,
							actor_id: user.id,
							type: 'profile_view' as any
						});
				}
			}
		};

		const fetchProfileViewsCount = async () => {
			if (!user || profileId !== user.id) return;
			
			const thirtyDaysAgo = new Date();
			thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
			
			const { count } = await supabase
				.from('profile_views')
				.select('id', { count: 'exact', head: true })
				.eq('profile_id', user.id)
				.gte('viewed_at', thirtyDaysAgo.toISOString());
			
			setProfileViewsCount(count || 0);
		};

		recordProfileView();
		fetchProfileViewsCount();
	}, [user, profileId]);

	// Real-time subscription for profile views on own profile
	useEffect(() => {
		if (!user || profileId !== user.id) return;

		const channel = supabase
			.channel('profile-views-realtime')
			.on(
				'postgres_changes',
				{ 
					event: 'INSERT', 
					schema: 'public', 
					table: 'profile_views',
					filter: `profile_id=eq.${user.id}`
				},
				() => {
					// Refresh count when new view arrives
					const thirtyDaysAgo = new Date();
					thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
					
					supabase
						.from('profile_views')
						.select('id', { count: 'exact', head: true })
						.eq('profile_id', user.id)
						.gte('viewed_at', thirtyDaysAgo.toISOString())
						.then(({ count }) => {
							setProfileViewsCount(count || 0);
						});
				}
			)
			.subscribe();

		return () => {
			supabase.removeChannel(channel);
		};
	}, [user, profileId]);


	const handleFollowRequest = async () => {
		if (!user || !profileId) {
			navigate('/auth');
			return;
		}

		// Block following warned accounts
		if (profile?.is_warned) {
			toast.error('This account is not secure or trusted. AfuChat protects users from potentially fraudulent accounts.');
			return;
		}
		
	setIsRequestingFollow(true);
	
	try {
		// Delete any existing rejected or stale approved requests (when no longer following)
		await supabase
			.from('follow_requests')
			.delete()
			.eq('requester_id', user.id)
			.eq('target_id', profileId)
			.in('status', ['rejected', 'approved']);

			const { error } = await supabase
				.from('follow_requests')
				.upsert({ 
					requester_id: user.id, 
					target_id: profileId,
					status: 'pending',
					responded_at: null,
					created_at: new Date().toISOString()
				}, { onConflict: 'requester_id,target_id' });

			if (error) throw error;
			
			setFollowRequestStatus('pending');
			toast.success('Follow request sent');
		} catch (error: any) {
			console.error('Error sending follow request:', error);
			toast.error('Failed to send follow request');
		} finally {
			setIsRequestingFollow(false);
		}
	};

	const handleFollow = async () => {
		if (!user || !profileId) {
			navigate('/auth');
			return;
		}

		// Block following warned accounts (allow unfollow)
		if (profile?.is_warned && !isFollowing) {
			toast.error('This account is not secure or trusted. AfuChat protects users from potentially fraudulent accounts.');
			return;
		}

		// For private accounts, use follow request system ONLY if they don't already follow us
		if (profile?.is_private && !isFollowing && !isFollowedByProfile) {
			handleFollowRequest();
			return;
		}

		const currentIsFollowing = isFollowing;

		setIsFollowing(!currentIsFollowing);
		setFollowCount(prev => ({
			...prev,
			followers: prev.followers + (currentIsFollowing ? -1 : 1)
		}));

		if (currentIsFollowing) {
			const { error } = await supabase
				.from('follows')
				.delete()
				.eq('follower_id', user.id)
				.eq('following_id', profileId);

			if (error) {
				setIsFollowing(true);
				setFollowCount(prev => ({ ...prev, followers: prev.followers + 1 }));
				toast.error(t('profile.failedToUnfollow'));
			} else {
				toast.success(t('profile.unfollow'));
			}
		} else {
			const { error } = await supabase
				.from('follows')
				.insert({ follower_id: user.id, following_id: profileId });

			if (error) {
				setIsFollowing(false);
				setFollowCount(prev => ({ ...prev, followers: prev.followers - 1 }));
				toast.error(t('profile.failedToFollow'));
			} else {
				toast.success(t('profile.follow'));
			}
		}
	};

	// Handle follow back for private accounts that already follow us
	const handleFollowBack = async () => {
		if (!user || !profileId) {
			navigate('/auth');
			return;
		}

		// Block following warned accounts
		if (profile?.is_warned) {
			toast.error('This account is not secure or trusted. AfuChat protects users from potentially fraudulent accounts.');
			return;
		}

		setIsRequestingFollow(true);
		
		// Optimistically update UI immediately
		setIsFollowing(true);
		setFollowCount(prev => ({
			...prev,
			followers: prev.followers + 1
		}));

		const { error } = await supabase
			.from('follows')
			.insert({ follower_id: user.id, following_id: profileId });

		if (error) {
			// Revert on error
			setIsFollowing(false);
			setFollowCount(prev => ({ ...prev, followers: prev.followers - 1 }));
			toast.error(t('profile.failedToFollow'));
		} else {
			toast.success('You are now friends!');
			// Fetch posts now that we're following
			if (profileId) {
				fetchUserPosts(profileId);
			}
		}
		
		setIsRequestingFollow(false);
	};

	const handleStartChat = async () => {
		if (!user || !profileId) {
			navigate('/auth');
			return;
		}

		// Prevent duplicate clicks
		if (isChatLoading) return;
		setIsChatLoading(true);

		try {
			// Use RPC to get or create chat - prevents duplicates
			const { data: chatId, error } = await supabase
				.rpc('get_or_create_chat', {
					other_user_id: profileId
				});

			if (error) {
				console.error('Error starting chat:', error);
				toast.error(t('profile.failedToChat'));
				return;
			}

			if (!chatId) {
				toast.error(t('profile.failedToChat'));
				return;
			}

			navigate(`/chat/${chatId}`);
		} catch (error) {
			console.error('Error starting chat:', error);
			toast.error(t('profile.failedToChat'));
		} finally {
			setIsChatLoading(false);
		}
	};

	const handleHireChat = async () => {
		if (!user || !profileId || !profile) {
			navigate('/auth');
			return;
		}

		// Prevent duplicate clicks
		if (isChatLoading) return;
		setIsChatLoading(true);

		try {
			// Use RPC to get or create chat - prevents duplicates
			const { data: chatId, error } = await supabase
				.rpc('get_or_create_chat', {
					other_user_id: profileId
				});

			if (error) {
				console.error('Error starting chat:', error);
				toast.error(t('profile.failedToChat'));
				return;
			}

			if (!chatId) {
				toast.error(t('profile.failedToChat'));
				return;
			}

			// Navigate with pre-filled hiring message
			const hiringMessage = `Hi ${profile.display_name}! I saw you're available for hire and I'm interested in working with you. Let's discuss potential opportunities!`;
			
			navigate(`/chat/${chatId}`, { 
				state: { prefillMessage: hiringMessage } 
			});
		} catch (error) {
			console.error('Error starting hire chat:', error);
			toast.error(t('profile.failedToChat'));
		} finally {
			setIsChatLoading(false);
		}
	};

	const handleLogout = async () => {
		try {
			const { error } = await supabase.auth.signOut();
			if (error) {
				console.error('Logout error:', error);
				// Force clear local session as fallback
				localStorage.clear();
				window.location.href = '/';
				return;
			}
			toast.success('Logged out successfully');
			navigate('/');
		} catch (error: any) {
			console.error('Logout error:', error);
			toast.error(error?.message || 'Failed to log out');
			// Force logout as fallback
			localStorage.clear();
			window.location.href = '/';
		}
	};

	if (loading) {
		return <ProfileSkeleton />;
	}

	if (!profile) {
		return null; // Will redirect in useEffect
	}

	const formatCount = (count: number) => {
		if (count >= 1000) {
			return (count / 1000).toFixed(1) + 'K';
		}
		return count;
	};

	// Check if this is a private account and current user is not the owner AND not following them
	const isPrivateAccount = profile?.is_private && user?.id !== profileId && !isFollowing;
	
	// Check if users are mutual friends (both follow each other)
	const areFriends = isFollowing && isFollowedByProfile;


	// Calculate avatar scale and position based on scroll
	const avatarScale = 1 - (scrollProgress * 0.45); // 1 -> 0.55
	const avatarTranslateY = -scrollProgress * 36; // move up as it shrinks

	return (
		<div className="h-full flex flex-col">
			<SEO 
				title={`${isPrivateAccount ? 'Private Account' : profile?.display_name || 'User'} (@${profile?.handle || 'user'}) — Profile | AfuChat`}
				description={isPrivateAccount ? 'This account is private. Follow to see their content.' : `View ${profile?.display_name}'s profile on AfuChat. ${profile?.bio ? profile.bio.substring(0, 150) : `Follow ${profile?.display_name} to see their posts, updates, and connect with them on the social platform.`} Join AfuChat to discover profiles, connect with people, and stay updated.`}
				keywords={`${profile?.handle} profile, ${profile?.display_name}, user profile, social profile, follow ${profile?.handle}, ${profile?.display_name} posts, connect with ${profile?.display_name}, user page, profile page, social media profile`}
			/>
			<div ref={scrollContainerRef} onScroll={handleProfileScroll} className="flex-1 overflow-y-auto lg:overflow-visible lg:h-auto">
				<div className="relative h-36 bg-gray-300 dark:bg-gray-700 w-full">
					{/* Show blurred/hidden banner for private accounts */}
					{isPrivateAccount ? (
						<div className="w-full h-full bg-muted/50 flex items-center justify-center">
							<Lock className="h-8 w-8 text-muted-foreground/30" />
						</div>
					) : profile?.banner_url ? (
						<img 
							src={profile.banner_url} 
							alt="Profile banner"
							className="w-full h-full object-cover"
						/>
					) : null}
					
					{/* Top right action buttons */}
					<div className="absolute top-4 right-4 flex items-center gap-2">
						{/* Profile Views - only for own profile */}
						{user && user.id === profileId && (
							<button
								onClick={() => setIsProfileViewsOpen(true)}
								className="relative p-2 rounded-full bg-card border border-border hover:bg-muted cursor-pointer transition-colors shadow-sm"
							>
								<Footprints className="h-5 w-5 text-foreground" />
								{profileViewsCount > 0 && (
									<span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold">
										{profileViewsCount > 99 ? '99+' : profileViewsCount}
									</span>
								)}
							</button>
						)}
						
						{/* Share Profile Button */}
						<button
							onClick={() => {
								const profileUrl = `${window.location.origin}/${profile?.handle}`;
								if (navigator.share) {
									navigator.share({
										title: `${profile?.display_name} on AfuChat`,
										text: `Check out ${profile?.display_name}'s profile on AfuChat`,
										url: profileUrl,
									}).catch(() => {});
								} else {
									navigator.clipboard.writeText(profileUrl);
									toast.success(t('profile.linkCopied', 'Profile link copied!'));
								}
							}}
							className="p-2 rounded-full bg-card border border-border hover:bg-muted cursor-pointer transition-colors shadow-sm"
						>
							<Share2 className="h-5 w-5 text-foreground" />
						</button>
						
						{/* Banner Upload - only for own profile */}
						{user && user.id === profileId && (
							<label className="p-2 rounded-full bg-card border border-border hover:bg-muted cursor-pointer transition-colors shadow-sm">
								<input
									type="file"
									accept="image/*"
									onChange={handleBannerUpload}
									disabled={isUploadingBanner}
									className="hidden"
								/>
								{isUploadingBanner ? (
									<ButtonLoader className="h-5 w-5" />
								) : (
									<Camera className="h-5 w-5 text-foreground" />
								)}
							</label>
						)}
					</div>
				</div>

				<div className="p-4 relative">
				{/* Edit Profile Button - Right side, overlapping banner/content */}
				{user && user.id === profileId && (
					<div className="absolute top-4 right-4 z-10 flex gap-2">
						{/* Follow Requests Button for private accounts */}
						{profile?.is_private && pendingRequestsCount > 0 && (
							<Button 
								variant="outline" 
								className="rounded-full px-4 py-2 font-bold bg-background hover:bg-muted border-2 h-auto relative"
								onClick={() => setIsFollowRequestsOpen(true)}
							>
								<UserPlus className="h-4 w-4 mr-1" />
								Requests
								<span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold">
									{pendingRequestsCount > 9 ? '9+' : pendingRequestsCount}
								</span>
							</Button>
						)}
						<Button 
							variant="outline" 
							className="rounded-full px-6 py-2 font-bold bg-background hover:bg-muted border-2 h-auto"
							onClick={() => navigate(`/${urlParam}/edit`)}
							aria-label="Edit your profile"
						>
							{t('profile.editProfile')}
						</Button>
					</div>
				)}
					
				<div className="flex items-end -mt-20 sm:-mt-16">
					<div 
					className="relative origin-bottom-left transition-transform duration-200 ease-out"
					style={{
						transform: `translateY(${avatarTranslateY}px) scale(${avatarScale})`,
					}}
					>
						{isPrivateAccount ? (
							<div className={`w-24 h-24 sm:w-28 sm:h-28 ${profile?.is_business_mode ? 'rounded-lg' : 'rounded-full'} bg-muted/70 border-4 border-background flex items-center justify-center`}>
								<UserX className="h-10 w-10 text-muted-foreground/50" />
							</div>
						) : (
							<>
								<StoryAvatar 
									userId={profileId}
									avatarUrl={profile.avatar_url}
									name={profile.display_name}
									size="xl"
									showStoryRing={true}
									isBusiness={profile?.is_business_mode}
									enableLightbox={true}
								/>
								<PinnedGiftsDisplay userId={profileId} />
								<OnlineStatus lastSeen={profile.last_seen} showOnlineStatus={profile.show_online_status} />
							</>
						)}
					</div>

					{user && user.id === profileId ? (
						<div className="flex flex-col gap-2">
							</div>
						) : (
							<div className="flex gap-2 flex-1 justify-end">
								{isFollowing && (
									<Button onClick={handleStartChat} variant="outline" size="icon" className="rounded-full bg-card border-border" disabled={isChatLoading}>
										<MessageSquare className="h-5 w-5" />
									</Button>
								)}
								{isFollowing && (
									<TipButton
										receiverId={profileId}
										receiverName={profile.display_name}
										variant="outline"
										size="default"
										showLabel={true}
										className="bg-card border-border"
									/>
								)}
								{/* Show appropriate button based on follow state and private status */}
								{profile?.is_private && !isFollowing ? (
									isFollowedByProfile ? (
										// Private user follows us - show Follow Back
										<Button
											onClick={handleFollowBack}
											className="rounded-full font-bold flex-1 px-8"
											disabled={isRequestingFollow}
										>
											<UserPlus className="h-4 w-4 mr-2" />
											{isRequestingFollow ? 'Following...' : 'Follow Back'}
										</Button>
									) : followRequestStatus === 'pending' ? (
										<Button
											variant="outline"
											className="rounded-full font-bold px-4 bg-card border-border"
											disabled
										>
											<Clock className="h-4 w-4 mr-2" />
											Requested
										</Button>
									) : (
										<Button
											onClick={handleFollowRequest}
											className="rounded-full font-bold flex-1 px-8"
											disabled={isRequestingFollow}
										>
											<UserPlus className="h-4 w-4 mr-2" />
											{isRequestingFollow ? 'Sending...' : 'Request to Follow'}
										</Button>
									)
								) : !isFollowing && isFollowedByProfile ? (
									// Non-private user follows us but we don't follow them - show Follow Back
									<Button
										onClick={handleFollow}
										className="rounded-full font-bold flex-1 px-8"
									>
										<UserPlus className="h-4 w-4 mr-2" />
										Follow Back
									</Button>
								) : (
									<Button
										onClick={handleFollow}
										variant={isFollowing ? "outline" : "default"}
										className={`rounded-full font-bold transition-colors ${isFollowing ? 'px-4 bg-card border-border' : 'flex-1 px-8'}`}
										onMouseEnter={e => isFollowing && !areFriends && (e.currentTarget.textContent = t('profile.unfollow'))}
										onMouseLeave={e => isFollowing && !areFriends && (e.currentTarget.textContent = areFriends ? 'Friends' : t('profile.following'))}
									>
										{isFollowing ? (
											areFriends ? (
												<span className="flex items-center gap-1.5">
													<Users className="h-4 w-4" />
													Friends
												</span>
											) : t('profile.following')
										) : (
											<>
												<UserPlus className="h-4 w-4 mr-2" />
												{t('profile.follow')}
											</>
										)}
									</Button>
								)}
								{/* More options button for block/report */}
								<Button 
									variant="outline" 
									size="icon" 
									className="rounded-full bg-card border-border"
									onClick={() => setIsUserActionsSheetOpen(true)}
								>
									<MoreVertical className="h-5 w-5" />
								</Button>
							</div>
						)}
					</div>

					<div className="mt-3">
						{/* Private account - show masked name with lock */}
						{isPrivateAccount ? (
							<div className="flex items-center gap-2">
								<div className="flex items-center gap-1">
									<span className="text-xl font-extrabold leading-tight text-muted-foreground/70">Private Account</span>
									<Lock className="h-4 w-4 text-muted-foreground/50" />
								</div>
							</div>
					) : profile.is_affiliate ? (
							<div className="flex items-center gap-1">
								<button 
									className="text-xl font-extrabold leading-tight hover:underline"
									onClick={() => {
										const fallbackDate = profile.affiliation_date || profile.created_at || new Date().toISOString();
										setSelectedAffiliate({
											userName: profile.display_name,
											businessName: profile.affiliated_business?.display_name || 'Business',
											affiliatedDate: fallbackDate,
											businessLogo: profile.affiliated_business?.avatar_url || undefined
										});
									}}
								>
								{profile.display_name}
								</button>
								
								<div
									onClick={() => {
										const fallbackDate = profile.affiliation_date || profile.created_at || new Date().toISOString();
										setSelectedAffiliate({
											userName: profile.display_name,
											businessName: profile.affiliated_business?.display_name || 'Business',
											affiliatedDate: fallbackDate,
											businessLogo: profile.affiliated_business?.avatar_url || undefined
										});
									}}
									className="cursor-pointer"
								>
									<VerifiedBadge
										isVerified={profile.is_verified}
										isOrgVerified={profile.is_organization_verified}
										isAffiliate={profile.is_affiliate}
										isDeveloper={isDeveloper}
										affiliateBusinessLogo={profile.affiliated_business?.avatar_url}
										affiliateBusinessName={profile.affiliated_business?.display_name}
									/>
								</div>
								
								{profile.is_business_mode && (
									<div onClick={() => setIsBusinessBenefitsOpen(true)} className="cursor-pointer">
										<BusinessBadge />
									</div>
								)}
								
								<UserPremiumBadge userId={profileId} />
							</div>
					) : (profile.is_verified || profile.is_organization_verified || profile.is_business_mode || isDeveloper) ? (
						<div className="flex items-center gap-1">
							<button 
								className="text-xl font-extrabold leading-tight hover:underline"
								onClick={() => setSelectedVerified({
									userName: profile.display_name,
									isVerified: profile.is_verified || isDeveloper || false,
									isOrgVerified: profile.is_organization_verified || false,
									isDeveloper: isDeveloper,
									createdAt: profile.created_at
								})}
							>
								{profile.display_name}
							</button>
							
							<div 
								onClick={() => setSelectedVerified({
									userName: profile.display_name,
									isVerified: profile.is_verified || isDeveloper || false,
									isOrgVerified: profile.is_organization_verified || false,
									isDeveloper: isDeveloper,
									createdAt: profile.created_at
								})}
								className="cursor-pointer"
							>
								<VerifiedBadge
									isVerified={profile.is_verified}
									isOrgVerified={profile.is_organization_verified}
									isAffiliate={profile.is_affiliate}
									isDeveloper={isDeveloper}
									affiliateBusinessLogo={profile.affiliated_business?.avatar_url}
									affiliateBusinessName={profile.affiliated_business?.display_name}
								/>
							</div>
							
							{profile.is_business_mode && (
								<div onClick={() => setIsBusinessBenefitsOpen(true)} className="cursor-pointer">
									<BusinessBadge />
								</div>
							)}
							
							<UserPremiumBadge userId={profileId} />
						</div>
						) : (
							<div className="flex items-center gap-1">
								<h1 className="text-xl font-extrabold leading-tight">{profile.display_name}</h1>
								{profile.is_business_mode && (
									<div onClick={() => setIsBusinessBenefitsOpen(true)} className="cursor-pointer">
										<BusinessBadge />
									</div>
								)}
								<UserPremiumBadge userId={profileId} />
							</div>
						)}

					{/* Handle - always show for private accounts */}
					<p 
						className="text-muted-foreground text-sm select-none cursor-pointer hover:text-primary transition-colors"
						onClick={() => {
							navigator.clipboard.writeText(profile.handle);
							toast.success('Username copied to clipboard!');
						}}
						title="Click to copy username"
					>
						@{profile.handle}
					</p>
					</div>

					{/* TikTok-style Account Warning Banner */}
					{profile.is_warned && (
						<div className="mt-3">
							<WarningBadge reason={profile.warning_reason} variant="profile" />
						</div>
					)}

					{/* Bio - hide for private accounts */}
					{!isPrivateAccount && profile.bio && (
						<ContentParser content={profile.bio} isBio={true} />
					)}
					{isPrivateAccount && (
						<div className="mt-3 space-y-2">
							<div className="h-4 w-full bg-muted/40 rounded animate-pulse" />
							<div className="h-4 w-3/4 bg-muted/40 rounded animate-pulse" />
						</div>
					)}

					{/* Business Category & Country - Hide for private accounts */}
					{!isPrivateAccount && (
						<div className="flex flex-wrap gap-3 mt-2">
							{profile.is_business_mode && profile.business_category && (
								<div className="flex items-center gap-1.5 text-sm text-muted-foreground">
									<Building2 className="h-4 w-4 text-primary" />
									<span className="font-medium">{profile.business_category}</span>
								</div>
							)}
							{profile.country && (
								<div className="flex items-center gap-2 text-sm text-muted-foreground">
									<span className="text-2xl">{getCountryFlag(profile.country)}</span>
									<span className="font-medium">{profile.country}</span>
								</div>
							)}
						</div>
					)}

				{/* Website URL - Hide for private accounts */}
				{!isPrivateAccount && profile.is_business_mode && profile.website_url && (
					<a
						href={profile.website_url.startsWith('http://') || profile.website_url.startsWith('https://') 
							? profile.website_url 
							: `https://${profile.website_url}`}
						target="_blank"
						rel="noopener noreferrer"
						className="text-sm text-primary hover:underline flex items-center gap-1 mt-2"
					>
						🌐 {profile.website_url}
					</a>
				)}

				{/* Developer Profile Section - Enhanced showcase for developers */}
				{!isPrivateAccount && isDeveloper && (
					<DeveloperProfileSection
						githubUrl={profile.github_url}
						portfolioUrl={profile.portfolio_url}
						tagline={profile.developer_tagline}
						availableForHire={profile.available_for_hire}
						displayName={profile.display_name}
						handle={profile.handle}
						onContact={user && user.id !== profileId ? handleHireChat : undefined}
					/>
				)}

				{/* Nexa Progress Bar - hide for private accounts */}
				{!isPrivateAccount && (profile.show_balance || user?.id === profileId) && (
					<div className="mt-4">
						<NexaProgressBar 
							currentNexa={profile.xp} 
							currentGrade={profile.current_grade as Grade}
							showDetails={true}
						/>
					</div>
				)}

					{/* Join date - hide for private accounts */}
					{!isPrivateAccount && (
						<div className="flex items-center space-x-4 mt-3 text-muted-foreground text-sm">
							<div className="flex items-center gap-1">
								<Calendar className="h-4 w-4" />
								<span className="text-xs">Joined {profile.created_at ? new Date(profile.created_at).toLocaleString('en-UG', { month: 'long', year: 'numeric' }) : 'Unknown'}</span>
							</div>
						</div>
					)}

					{/* Stats - hide for private accounts or show masked */}
					{isPrivateAccount ? (
						<div className="flex gap-4 mt-3">
							<div className="flex items-center gap-1">
								<Lock className="h-3 w-3 text-muted-foreground/50" />
								<span className="text-sm text-muted-foreground/50">Hidden</span>
							</div>
						</div>
					) : (
						<div className="flex gap-4 mt-3">
							<div 
								className="flex items-center cursor-pointer hover:underline"
								onClick={() => navigate(`/${profile.handle}/following`)}
							>
								<span className="font-bold text-sm">{formatCount(followCount.following)}</span>
								<span className="text-muted-foreground text-sm ml-1">{t('profile.following')}</span>
							</div>
							<div 
								className="flex items-center cursor-pointer hover:underline"
								onClick={() => navigate(`/${profile.handle}/followers`)}
							>
								<span className="font-bold text-sm">{formatCount(followCount.followers)}</span>
								<span className="text-muted-foreground text-sm ml-1">{t('profile.followers')}</span>
							</div>
							<div className="flex items-center">
								<span className="font-bold text-sm">{formatCount(totalLikes)}</span>
								<span className="text-muted-foreground text-sm ml-1">{t('profile.likes', 'Likes')}</span>
							</div>
						</div>
					)}
				</div>

				<Separator className="mt-4" />
				
				{/* Show private account overlay for all tabs when private */}
				{isPrivateAccount ? (
					<div className="p-6">
						<PrivateProfileOverlay 
							handle={profile.handle} 
							requestStatus={followRequestStatus}
							onFollowRequest={handleFollowRequest}
							onFollowBack={handleFollowBack}
							isLoading={isRequestingFollow}
							isFollowedByProfile={isFollowedByProfile}
						/>
					</div>
				) : (
				<Tabs defaultValue="posts" className="w-full">
					<TabsList className={`grid ${isDeveloper ? (profile.is_business_mode && user?.id === profileId ? 'grid-cols-6' : profile.is_business_mode || user?.id === profileId ? 'grid-cols-5' : 'grid-cols-4') : (profile.is_business_mode && user?.id === profileId ? 'grid-cols-5' : profile.is_business_mode || user?.id === profileId ? 'grid-cols-4' : 'grid-cols-3')} w-full h-12 rounded-none bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/75 sticky top-0 lg:top-16 z-20 border-b border-border`}>
						<TabsTrigger value="posts" className="data-[state=active]:bg-transparent data-[state=active]:text-primary border-b-2 data-[state=active]:border-primary data-[state=inactive]:border-transparent rounded-none font-bold text-muted-foreground text-xs sm:text-sm">
							{t('profile.posts')}
						</TabsTrigger>
						{isDeveloper && (
							<TabsTrigger value="showcase" className="data-[state=active]:bg-transparent data-[state=active]:text-primary border-b-2 data-[state=active]:border-primary data-[state=inactive]:border-transparent rounded-none font-bold text-muted-foreground text-xs sm:text-sm">
								Showcase
							</TabsTrigger>
						)}
						<TabsTrigger value="achievements" className="data-[state=active]:bg-transparent data-[state=active]:text-primary border-b-2 data-[state=active]:border-primary data-[state=inactive]:border-transparent rounded-none font-bold text-muted-foreground text-xs sm:text-sm">
							Badges
						</TabsTrigger>
						<TabsTrigger value="gifts" className="data-[state=active]:bg-transparent data-[state=active]:text-primary border-b-2 data-[state=active]:border-primary data-[state=inactive]:border-transparent rounded-none font-bold text-muted-foreground text-xs sm:text-sm">
							Gifts
						</TabsTrigger>
						{profile.is_business_mode && (
							<TabsTrigger value="affiliates" className="data-[state=active]:bg-transparent data-[state=active]:text-primary border-b-2 data-[state=active]:border-primary data-[state=inactive]:border-transparent rounded-none font-bold text-muted-foreground text-xs sm:text-sm">
								Affiliates
							</TabsTrigger>
						)}
						{user?.id === profileId && (
							<TabsTrigger value="referrals" className="data-[state=active]:bg-transparent data-[state=active]:text-primary border-b-2 data-[state=active]:border-primary data-[state=inactive]:border-transparent rounded-none font-bold text-muted-foreground text-xs sm:text-sm">
								Referrals
							</TabsTrigger>
						)}
					</TabsList>

					<TabsContent value="posts">
						{posts.length === 0 ? (
							<div className="text-center text-muted-foreground py-12">
								No posts yet.
							</div>
						) : (
							<div className="space-y-0 divide-y divide-border">
								{posts.map((post) => (
									<Card
										key={post.id}
										className={`p-4 rounded-none border-x-0 border-t-0 hover:bg-muted/10 cursor-pointer transition-colors relative group ${post.is_blocked ? 'opacity-60' : ''}`}
										onClick={() => !post.is_blocked && navigate(`/post/${post.id}`)}
									>
										{/* Blocked post warning banner */}
										{post.is_blocked && (
											<div className="mb-3 p-2.5 bg-destructive/10 border border-destructive/20 rounded-lg">
												<div className="flex items-center gap-2 text-destructive">
													<svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
														<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
														<line x1="12" y1="9" x2="12" y2="13"></line>
														<line x1="12" y1="17" x2="12.01" y2="17"></line>
													</svg>
													<span className="text-xs font-medium">Post Hidden</span>
												</div>
												<p className="text-xs text-muted-foreground mt-1">
													{post.blocked_reason || 'This post contains content that violates our guidelines. Only you can see it.'}
												</p>
											</div>
										)}
										
										{/* Edit button for own posts */}
										{user?.id === profileId && !post.is_blocked && (
											<Button
												variant="ghost"
												size="icon"
												className="absolute top-2 right-2 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
												onClick={(e) => {
													e.stopPropagation();
													setEditingPost(post);
												}}
											>
												<Pencil className="h-4 w-4" />
											</Button>
										)}
										<div className="flex items-start gap-3">
											<StoryAvatar
												userId={profileId!}
												avatarUrl={profile.avatar_url}
												name={profile.display_name}
												size="md"
												showStoryRing={true}
												isBusiness={profile?.is_business_mode}
											/>
											<div className="flex-1 min-w-0">
											<ContentParser content={post.content} />
												{post.post_images && post.post_images.length > 0 && (
													<div className="mt-3">
														<ImageCarousel
															images={post.post_images
																.sort((a, b) => a.display_order - b.display_order)
																.map((img) => ({ url: img.image_url, alt: img.alt_text || 'Post image' }))}
														/>
													</div>
												)}
												{post.quoted_post && (
													<QuotedPostCard quotedPost={post.quoted_post} />
												)}
												<div className="flex justify-between items-center text-xs text-muted-foreground mt-2">
													<span>
														{new Date(post.created_at).toLocaleString('en-US', {
															hour: '2-digit',
															minute: '2-digit',
															day: 'numeric',
															month: 'short',
														})}
													</span>
													{/* Hide engagement stats for blocked posts */}
													{!post.is_blocked && (
														<div className="flex items-center gap-3">
															<span>{post.acknowledgment_count} likes</span>
															<span>{post.reply_count} replies</span>
														</div>
													)}
												</div>
											</div>
										</div>
									</Card>
								))}
							</div>
						)}
					</TabsContent>

				{isDeveloper && (
						<TabsContent value="showcase">
							<div className="p-4">
								<DeveloperShowcase userId={profileId!} isOwnProfile={user?.id === profileId} userHandle={profile?.handle} />
							</div>
						</TabsContent>
					)}

					<TabsContent value="achievements">
						<div className="p-4">
							<AchievementBadges userId={profileId!} />
						</div>
					</TabsContent>
				<TabsContent value="gifts">
					<div className="p-4 space-y-4">
						<TipStats userId={profileId!} />
						<ReceivedGifts userId={profileId!} />
					</div>
				</TabsContent>

					{profile.is_business_mode && (
						<TabsContent value="affiliates">
							{affiliatedUsers.length === 0 ? (
								<div className="text-center text-muted-foreground py-12">
									<p className="font-semibold">No affiliates yet</p>
									<p className="text-sm">This business doesn't have any affiliated users.</p>
								</div>
							) : (
								<div className="space-y-0 divide-y divide-border">
									{affiliatedUsers.map((affiliatedUser) => (
										<div 
											key={affiliatedUser.id}
											className="p-4 hover:bg-muted/10 cursor-pointer transition-colors flex items-center gap-3"
											onClick={() => navigate(`/${affiliatedUser.handle}`)}
										>
										<StoryAvatar 
											userId={affiliatedUser.id}
											avatarUrl={affiliatedUser.avatar_url}
											name={affiliatedUser.display_name}
											size="lg"
											className="flex-shrink-0"
											showStoryRing={true}
											isBusiness={false}
										/>
											<div className="flex-1 min-w-0">
												<div className="flex items-center gap-1">
													<span className="font-bold truncate">{affiliatedUser.display_name}</span>
													<VerifiedBadge
														isVerified={affiliatedUser.is_verified}
														isOrgVerified={affiliatedUser.is_organization_verified}
														isAffiliate={true}
														affiliateBusinessLogo={profile.avatar_url}
														affiliateBusinessName={profile.display_name}
													/>
												</div>
												<p className="text-sm text-muted-foreground">@{affiliatedUser.handle}</p>
												<p className="text-xs text-muted-foreground mt-1">
													Affiliated since {new Date(affiliatedUser.affiliation_date).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
												</p>
											</div>
										</div>
									))}
								</div>
							)}
						</TabsContent>
					)}

					{user?.id === profileId && (
						<TabsContent value="referrals">
							<div className="p-4">
								<ReferralSystem />
							</div>
						</TabsContent>
					)}
				</Tabs>
				)}
			</div>
			
			{/* Profile Actions Sheet */}
			<ProfileActionsSheet
				isOpen={isActionsSheetOpen}
				onClose={() => setIsActionsSheetOpen(false)}
				onLogout={handleLogout}
				onEditProfile={() => navigate(`/${urlParam}/edit`)}
			/>

			{/* Affiliate Details Sheet */}
			{selectedAffiliate && (
				<AffiliateDetailsSheet
					open={!!selectedAffiliate}
					onOpenChange={(open) => !open && setSelectedAffiliate(null)}
					userName={selectedAffiliate.userName}
					businessName={selectedAffiliate.businessName}
					affiliatedDate={selectedAffiliate.affiliatedDate}
					businessLogo={selectedAffiliate.businessLogo}
					viewerIsVerified={currentUserIsVerified}
				/>
			)}

			{/* Verified Details Sheet */}
			{selectedVerified && (
				<VerifiedDetailsSheet
					open={!!selectedVerified}
					onOpenChange={(open) => !open && setSelectedVerified(null)}
					userName={selectedVerified.userName}
					isVerified={selectedVerified.isVerified}
					isOrgVerified={selectedVerified.isOrgVerified}
					isDeveloper={selectedVerified.isDeveloper}
					createdAt={selectedVerified.createdAt}
					viewerIsVerified={currentUserIsVerified}
				/>
			)}

			{isBusinessBenefitsOpen && (
				<BusinessBenefitsSheet
					open={isBusinessBenefitsOpen}
					onOpenChange={setIsBusinessBenefitsOpen}
				/>
			)}

			{/* Follow Requests Sheet for own profile */}
			<FollowRequestsSheet
				open={isFollowRequestsOpen}
				onOpenChange={setIsFollowRequestsOpen}
			/>

			{/* User Actions Sheet for block/report */}
			{profile && user && user.id !== profileId && (
				<UserActionsSheet
					isOpen={isUserActionsSheetOpen}
					onClose={() => setIsUserActionsSheetOpen(false)}
					userId={profileId || ''}
					userName={profile.display_name}
					userHandle={profile.handle}
					isBlocked={isBlocked}
					onBlockChange={setIsBlocked}
				/>
			)}

			{/* Profile Views Sheet - only for own profile */}
			<ProfileViewsSheet
				isOpen={isProfileViewsOpen}
				onClose={() => setIsProfileViewsOpen(false)}
			/>

			{/* Edit Post Modal */}
			{editingPost && (
				<EditPostModal
					isOpen={!!editingPost}
					onClose={() => setEditingPost(null)}
					post={{
						id: editingPost.id,
						content: editingPost.content,
						image_url: null,
						post_images: editingPost.post_images?.map(img => ({
							image_url: img.image_url,
							display_order: img.display_order
						}))
					}}
					onPostUpdated={() => {
						setEditingPost(null);
						if (profileId) fetchUserPosts(profileId);
					}}
				/>
			)}
		</div>
	);
};

export default Profile;
