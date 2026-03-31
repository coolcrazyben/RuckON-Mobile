export interface User {
  id: string;
  name: string;
  username: string;
  avatar: string;
  location: string;
  bio: string;
  totalMiles: number;
  totalRucks: number;
  weightMoved: number;
  mutualFriends: number;
  isFollowing: boolean;
}

export interface Ruck {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  date: string;
  distance: number;
  duration: string;
  weight: number;
  pace: string;
  elevation: number;
  notes: string;
  photo: string;
  likes: number;
  comments: number;
  liked: boolean;
  isGlobal: boolean;
}

export interface Community {
  id: string;
  name: string;
  description: string;
  memberCount: number;
  banner: string;
  category: string;
  isJoined: boolean;
}

export interface Challenge {
  id: string;
  title: string;
  description: string;
  endDate: string;
  participants: number;
  isJoined: boolean;
  metric: string;
  goal: string;
}

export interface LeaderboardEntry {
  id: string;
  userId: string;
  name: string;
  avatar: string;
  rank: number;
  distance: number;
  weightMoved: number;
  isCurrentUser: boolean;
}


export const MOCK_USERS: User[] = [
  {
    id: 'u1',
    name: 'Marcus Webb',
    username: 'marcuswebb',
    avatar: 'https://i.pravatar.cc/150?img=1',
    location: 'Austin, TX',
    bio: 'Army vet. 40lb pack minimum. Every mile counts.',
    totalMiles: 847,
    totalRucks: 134,
    weightMoved: 42300,
    mutualFriends: 0,
    isFollowing: false,
  },
  {
    id: 'u2',
    name: 'Sarah Kline',
    username: 'skline_rucks',
    avatar: 'https://i.pravatar.cc/150?img=5',
    location: 'Denver, CO',
    bio: 'Mountain rucker. Weekend warrior. GORUCK tough.',
    totalMiles: 612,
    totalRucks: 98,
    weightMoved: 30600,
    mutualFriends: 3,
    isFollowing: true,
  },
  {
    id: 'u3',
    name: 'Derek Ortiz',
    username: 'dortiz_ruck',
    avatar: 'https://i.pravatar.cc/150?img=3',
    location: 'San Diego, CA',
    bio: 'Marine. Never quit. Pack heavy, move fast.',
    totalMiles: 1240,
    totalRucks: 210,
    weightMoved: 62000,
    mutualFriends: 7,
    isFollowing: true,
  },
  {
    id: 'u4',
    name: 'Tara Flynn',
    username: 'taraflynn_fit',
    avatar: 'https://i.pravatar.cc/150?img=9',
    location: 'Nashville, TN',
    bio: 'First ruck was 2 miles. Now doing 15s. Never stop.',
    totalMiles: 389,
    totalRucks: 67,
    weightMoved: 19450,
    mutualFriends: 2,
    isFollowing: false,
  },
  {
    id: 'u5',
    name: 'James Hollis',
    username: 'jhollis_heavy',
    avatar: 'https://i.pravatar.cc/150?img=7',
    location: 'Portland, OR',
    bio: '60lb pack. Rain or shine. PNW rucker.',
    totalMiles: 723,
    totalRucks: 115,
    weightMoved: 43380,
    mutualFriends: 1,
    isFollowing: false,
  },
  {
    id: 'me',
    name: 'Alex Rivera',
    username: 'alex_rucks',
    avatar: 'https://i.pravatar.cc/150?img=12',
    location: 'Chicago, IL',
    bio: 'Rucking since 2021. 45lb is my sweet spot.',
    totalMiles: 524,
    totalRucks: 89,
    weightMoved: 23580,
    mutualFriends: 0,
    isFollowing: false,
  },
];

export const MOCK_RUCKS: Ruck[] = [
  {
    id: 'r1',
    userId: 'u2',
    userName: 'Sarah Kline',
    userAvatar: 'https://i.pravatar.cc/150?img=5',
    date: '2 hours ago',
    distance: 6.2,
    duration: '1:52:00',
    weight: 45,
    pace: '18:04',
    elevation: 420,
    notes: 'Morning trail ruck through Bear Creek. Legs are toast but mind is clear.',
    photo: 'https://images.unsplash.com/photo-1551632811-561732d1e306?w=400',
    likes: 24,
    comments: 6,
    liked: false,
    isGlobal: false,
  },
  {
    id: 'r2',
    userId: 'u3',
    userName: 'Derek Ortiz',
    userAvatar: 'https://i.pravatar.cc/150?img=3',
    date: '5 hours ago',
    distance: 8.4,
    duration: '2:30:00',
    weight: 55,
    pace: '17:51',
    elevation: 680,
    notes: 'Double mileage this week. Body is adapting.',
    photo: 'https://images.unsplash.com/photo-1463044304029-b857fcddcaff?w=400',
    likes: 47,
    comments: 12,
    liked: true,
    isGlobal: true,
  },
  {
    id: 'r3',
    userId: 'u1',
    userName: 'Marcus Webb',
    userAvatar: 'https://i.pravatar.cc/150?img=1',
    date: '1 day ago',
    distance: 4.8,
    duration: '1:28:00',
    weight: 40,
    pace: '18:20',
    elevation: 180,
    notes: 'Recovery ruck. 40lbs felt light after the weekend.',
    photo: 'https://images.unsplash.com/photo-1478131143081-80f7f84ca84d?w=400',
    likes: 18,
    comments: 3,
    liked: false,
    isGlobal: true,
  },
  {
    id: 'r4',
    userId: 'u5',
    userName: 'James Hollis',
    userAvatar: 'https://i.pravatar.cc/150?img=7',
    date: '1 day ago',
    distance: 10.1,
    duration: '3:05:00',
    weight: 60,
    pace: '18:21',
    elevation: 840,
    notes: 'Urban ruck through Portland. Stairs are brutal with 60lbs.',
    photo: 'https://images.unsplash.com/photo-1476900543704-4312b429f6ee?w=400',
    likes: 63,
    comments: 19,
    liked: false,
    isGlobal: true,
  },
  {
    id: 'r5',
    userId: 'u4',
    userName: 'Tara Flynn',
    userAvatar: 'https://i.pravatar.cc/150?img=9',
    date: '2 days ago',
    distance: 3.5,
    duration: '1:05:00',
    weight: 35,
    pace: '18:34',
    elevation: 90,
    notes: 'Easy neighborhood loop. Building up mileage slowly.',
    photo: 'https://images.unsplash.com/photo-1483728642387-6c3bdd6c93e5?w=400',
    likes: 11,
    comments: 4,
    liked: true,
    isGlobal: false,
  },
  {
    id: 'r6',
    userId: 'u2',
    userName: 'Sarah Kline',
    userAvatar: 'https://i.pravatar.cc/150?img=5',
    date: '3 days ago',
    distance: 7.6,
    duration: '2:18:00',
    weight: 50,
    pace: '18:09',
    elevation: 560,
    notes: 'Summit attempt with the crew. Made it to the top.',
    photo: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400',
    likes: 89,
    comments: 31,
    liked: false,
    isGlobal: true,
  },
  {
    id: 'r7',
    userId: 'u3',
    userName: 'Derek Ortiz',
    userAvatar: 'https://i.pravatar.cc/150?img=3',
    date: '4 days ago',
    distance: 5.2,
    duration: '1:33:00',
    weight: 55,
    pace: '17:53',
    elevation: 240,
    notes: 'Track day. Repetitive but good for pace work.',
    photo: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400',
    likes: 34,
    comments: 8,
    liked: true,
    isGlobal: false,
  },
  {
    id: 'r8',
    userId: 'u1',
    userName: 'Marcus Webb',
    userAvatar: 'https://i.pravatar.cc/150?img=1',
    date: '5 days ago',
    distance: 12.0,
    duration: '3:36:00',
    weight: 45,
    pace: '18:00',
    elevation: 1100,
    notes: 'Monthly long ruck. 12 miles done. On to the next.',
    photo: 'https://images.unsplash.com/photo-1519904981063-b0cf448d479e?w=400',
    likes: 112,
    comments: 27,
    liked: false,
    isGlobal: true,
  },
  {
    id: 'me1',
    userId: 'me',
    userName: 'Alex Rivera',
    userAvatar: 'https://i.pravatar.cc/150?img=12',
    date: '1 week ago',
    distance: 5.8,
    duration: '1:44:00',
    weight: 45,
    pace: '17:55',
    elevation: 320,
    notes: 'Early morning ruck before work. Best way to start the day.',
    photo: 'https://images.unsplash.com/photo-1467232004584-a241de8bcf5d?w=400',
    likes: 28,
    comments: 9,
    liked: false,
    isGlobal: false,
  },
  {
    id: 'me2',
    userId: 'me',
    userName: 'Alex Rivera',
    userAvatar: 'https://i.pravatar.cc/150?img=12',
    date: '2 weeks ago',
    distance: 4.2,
    duration: '1:18:00',
    weight: 40,
    pace: '18:34',
    elevation: 150,
    notes: 'Neighborhood loop. Good cool-down pace.',
    photo: 'https://images.unsplash.com/photo-1483193722442-5422d99849bc?w=400',
    likes: 15,
    comments: 2,
    liked: false,
    isGlobal: false,
  },
  {
    id: 'me3',
    userId: 'me',
    userName: 'Alex Rivera',
    userAvatar: 'https://i.pravatar.cc/150?img=12',
    date: '3 weeks ago',
    distance: 8.0,
    duration: '2:24:00',
    weight: 45,
    pace: '18:00',
    elevation: 480,
    notes: 'PR for longest ruck. Proud of this one.',
    photo: 'https://images.unsplash.com/photo-1504214208698-ea1916a2195a?w=400',
    likes: 42,
    comments: 14,
    liked: false,
    isGlobal: false,
  },
];

export const MOCK_COMMUNITIES: Community[] = [
  {
    id: 'c1',
    name: 'GORUCK Nation',
    description: 'The premier community for GORUCK event participants and enthusiasts. Share your experiences, tips, and training.',
    memberCount: 14280,
    banner: 'https://images.unsplash.com/photo-1551632811-561732d1e306?w=600',
    category: 'Events',
    isJoined: true,
  },
  {
    id: 'c2',
    name: 'Heavy Packers Club',
    description: 'For those who ruck with 50lbs or more. We believe in carrying the load.',
    memberCount: 3840,
    banner: 'https://images.unsplash.com/photo-1463044304029-b857fcddcaff?w=600',
    category: 'Training',
    isJoined: true,
  },
  {
    id: 'c3',
    name: 'Trail Ruckers',
    description: 'Off-road, backcountry, and trail rucking. Nature is the gym.',
    memberCount: 8650,
    banner: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600',
    category: 'Outdoors',
    isJoined: false,
  },
  {
    id: 'c4',
    name: 'Urban Rucking Co.',
    description: 'City streets are our trails. Urban ruckers unite.',
    memberCount: 5120,
    banner: 'https://images.unsplash.com/photo-1476900543704-4312b429f6ee?w=600',
    category: 'Urban',
    isJoined: false,
  },
  {
    id: 'c5',
    name: 'Military Fitness',
    description: 'Veterans, active duty, and military-style fitness enthusiasts.',
    memberCount: 21460,
    banner: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=600',
    category: 'Military',
    isJoined: true,
  },
  {
    id: 'c6',
    name: 'First Ruck Club',
    description: 'New to rucking? This is your community. No judgment, just progress.',
    memberCount: 6730,
    banner: 'https://images.unsplash.com/photo-1483728642387-6c3bdd6c93e5?w=600',
    category: 'Beginner',
    isJoined: false,
  },
];

export const MOCK_CHALLENGES: Challenge[] = [
  {
    id: 'ch1',
    title: 'March Miles Challenge',
    description: 'Ruck 50 miles in the month of March with any weight',
    endDate: 'Mar 31, 2026',
    participants: 1847,
    isJoined: true,
    metric: 'Distance',
    goal: '50 miles',
  },
  {
    id: 'ch2',
    title: 'Iron Rucker',
    description: 'Complete 10 rucks with 50+ lbs in 30 days',
    endDate: 'Mar 20, 2026',
    participants: 632,
    isJoined: false,
    metric: 'Rucks',
    goal: '10 rucks @ 50lbs+',
  },
  {
    id: 'ch3',
    title: '100lb Mile Club',
    description: 'Carry 100 miles total weight moved this month',
    endDate: 'Mar 31, 2026',
    participants: 289,
    isJoined: true,
    metric: 'Weight Moved',
    goal: '100,000 lbs',
  },
  {
    id: 'ch4',
    title: 'Dawn Patrol',
    description: 'Ruck before 6am every week for a month',
    endDate: 'Apr 1, 2026',
    participants: 418,
    isJoined: false,
    metric: 'Consistency',
    goal: '4 dawn rucks',
  },
];

export const MOCK_LEADERBOARD: LeaderboardEntry[] = [
  {
    id: 'lb1',
    userId: 'u3',
    name: 'Derek Ortiz',
    avatar: 'https://i.pravatar.cc/150?img=3',
    rank: 1,
    distance: 68.4,
    weightMoved: 45276,
    isCurrentUser: false,
  },
  {
    id: 'lb2',
    userId: 'u1',
    name: 'Marcus Webb',
    avatar: 'https://i.pravatar.cc/150?img=1',
    rank: 2,
    distance: 54.2,
    weightMoved: 32520,
    isCurrentUser: false,
  },
  {
    id: 'lb3',
    userId: 'u5',
    name: 'James Hollis',
    avatar: 'https://i.pravatar.cc/150?img=7',
    rank: 3,
    distance: 47.8,
    weightMoved: 38240,
    isCurrentUser: false,
  },
  {
    id: 'lb4',
    userId: 'u2',
    name: 'Sarah Kline',
    avatar: 'https://i.pravatar.cc/150?img=5',
    rank: 4,
    distance: 41.3,
    weightMoved: 28910,
    isCurrentUser: false,
  },
  {
    id: 'lb5',
    userId: 'me',
    name: 'Alex Rivera',
    avatar: 'https://i.pravatar.cc/150?img=12',
    rank: 5,
    distance: 36.7,
    weightMoved: 22040,
    isCurrentUser: true,
  },
  {
    id: 'lb6',
    userId: 'u4',
    name: 'Tara Flynn',
    avatar: 'https://i.pravatar.cc/150?img=9',
    rank: 6,
    distance: 28.4,
    weightMoved: 14200,
    isCurrentUser: false,
  },
  {
    id: 'lb7',
    userId: 'u6',
    name: 'Ryan Chen',
    avatar: 'https://i.pravatar.cc/150?img=15',
    rank: 7,
    distance: 24.1,
    weightMoved: 12050,
    isCurrentUser: false,
  },
  {
    id: 'lb8',
    userId: 'u7',
    name: 'Nadia Petrov',
    avatar: 'https://i.pravatar.cc/150?img=20',
    rank: 8,
    distance: 19.8,
    weightMoved: 9900,
    isCurrentUser: false,
  },
];


export const COMMUNITY_FEED: Ruck[] = MOCK_RUCKS.slice(0, 4);

export const COMMUNITY_MEMBERS: User[] = [MOCK_USERS[0], MOCK_USERS[1], MOCK_USERS[2], MOCK_USERS[4]];
