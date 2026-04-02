import { db } from "../server/db";
import {
  users,
  communities,
  userCommunities,
  rucks,
  challenges,
  challengeParticipants,
  communityPosts,
  friendships,
  ruckLikes,
  ruckComments,
  notifications,
} from "../shared/schema";
import bcrypt from "bcryptjs";

// Hardcoded UUIDs for deterministic FK relationships
const userIds = {
  jake: "seed-user-001",
  sarah: "seed-user-002",
  mike: "seed-user-003",
  emily: "seed-user-004",
  carlos: "seed-user-005",
  jessica: "seed-user-006",
  derek: "seed-user-007",
  brittany: "seed-user-008",
};

const communityIds = {
  mileHigh: "seed-comm-001",
  coastal: "seed-comm-002",
  capital: "seed-comm-003",
  bayou: "seed-comm-004",
  pnw: "seed-comm-005",
};

const challengeIds = {
  summerDistance: "seed-chal-001",
  monthlyRucks: "seed-chal-002",
  heavyPack: "seed-chal-003",
};

const ruckIds = Array.from({ length: 28 }, (_, i) => `seed-ruck-${String(i + 1).padStart(3, "0")}`);

async function seed() {
  console.log("Seeding database...");

  // Clear existing data in FK-safe order
  await db.delete(notifications);
  await db.delete(ruckComments);
  await db.delete(ruckLikes);
  await db.delete(communityPosts);
  await db.delete(challengeParticipants);
  await db.delete(challenges);
  await db.delete(rucks);
  await db.delete(userCommunities);
  await db.delete(communities);
  await db.delete(users);

  console.log("Cleared existing seed data.");

  const passwordHash = await bcrypt.hash("password123", 10);

  // -----------------------------------------------------------------------
  // 1. Users (8 total)
  // -----------------------------------------------------------------------
  await db.insert(users).values([
    {
      id: userIds.jake,
      email: "jake.martinez@example.com",
      username: "jake_ruck",
      password: passwordHash,
      name: "Jake Martinez",
      gender: "male",
      weight: 185,
      location: "Denver, CO",
      bio: "Former Army Ranger. Rucking keeps me sane.",
      onboardingComplete: true,
    },
    {
      id: userIds.sarah,
      email: "sarah.thompson@example.com",
      username: "sarah_t",
      password: passwordHash,
      name: "Sarah Thompson",
      gender: "female",
      weight: 145,
      location: "San Diego, CA",
      bio: "Trail runner turned rucker. Love the coast.",
      onboardingComplete: true,
    },
    {
      id: userIds.mike,
      email: "mike.chen@example.com",
      username: "mikechen_rucks",
      password: passwordHash,
      name: "Mike Chen",
      gender: "male",
      weight: 175,
      location: "Washington, DC",
      bio: "Government contractor. Ruck before work every day.",
      onboardingComplete: true,
    },
    {
      id: userIds.emily,
      email: "emily.foster@example.com",
      username: "emily_f",
      password: passwordHash,
      name: "Emily Foster",
      gender: "female",
      weight: 138,
      location: "Houston, TX",
      bio: "Bayou ruck crew co-founder. 5 days a week.",
      onboardingComplete: true,
    },
    {
      id: userIds.carlos,
      email: "carlos.reyes@example.com",
      username: "carlosreyes",
      password: passwordHash,
      name: "Carlos Reyes",
      gender: "male",
      weight: 210,
      location: "Denver, CO",
      bio: "Big pack, bigger heart.",
      onboardingComplete: true,
    },
    {
      id: userIds.jessica,
      email: "jessica.wu@example.com",
      username: "jessicawu_ruck",
      password: passwordHash,
      name: "Jessica Wu",
      gender: "female",
      weight: 130,
      location: "Seattle, WA",
      bio: "PNW mountains are my training ground.",
      onboardingComplete: true,
    },
    {
      id: userIds.derek,
      email: "derek.owens@example.com",
      username: "derek_owens",
      password: passwordHash,
      name: "Derek Owens",
      gender: "male",
      weight: 220,
      location: "San Diego, CA",
      bio: "Navy vet. Coastal rucks forever.",
      onboardingComplete: true,
    },
    {
      id: userIds.brittany,
      email: "brittany.hall@example.com",
      username: "brittany_hall",
      password: passwordHash,
      name: "Brittany Hall",
      gender: "female",
      weight: 155,
      location: "Washington, DC",
      bio: "Capital City Rucking founding member.",
      onboardingComplete: true,
    },
  ]);

  console.log("Inserted 8 users.");

  // -----------------------------------------------------------------------
  // 2. Communities (5 total)
  // -----------------------------------------------------------------------
  await db.insert(communities).values([
    {
      id: communityIds.mileHigh,
      name: "Mile High Ruckers",
      description: "Denver's premier rucking community. We tackle altitude and trails together.",
      memberCount: 47,
      category: "Local",
      location: "Denver, CO",
      createdBy: userIds.jake,
    },
    {
      id: communityIds.coastal,
      name: "Coastal Ruck Club",
      description: "San Diego's ocean-side rucking crew. Sand, sun, and heavy packs.",
      memberCount: 65,
      category: "Training",
      location: "San Diego, CA",
      createdBy: userIds.sarah,
    },
    {
      id: communityIds.capital,
      name: "Capital City Rucking",
      description: "DC's political class stays fit with heavy packs on the National Mall.",
      memberCount: 82,
      category: "General",
      location: "Washington, DC",
      createdBy: userIds.mike,
    },
    {
      id: communityIds.bayou,
      name: "Bayou Ruck Crew",
      description: "Houston strong. We ruck through humidity and heat to earn our rest.",
      memberCount: 38,
      category: "Events",
      location: "Houston, TX",
      createdBy: userIds.emily,
    },
    {
      id: communityIds.pnw,
      name: "PNW Mountain Ruckers",
      description: "Seattle and the Pacific Northwest. Rain doesn't stop us.",
      memberCount: 29,
      category: "Training",
      location: "Seattle, WA",
      createdBy: userIds.jessica,
    },
  ]);

  console.log("Inserted 5 communities.");

  // -----------------------------------------------------------------------
  // 3. UserCommunities (memberships)
  // -----------------------------------------------------------------------
  await db.insert(userCommunities).values([
    { id: "seed-uc-001", userId: userIds.jake, communityId: communityIds.mileHigh },
    { id: "seed-uc-002", userId: userIds.jake, communityId: communityIds.capital },
    { id: "seed-uc-003", userId: userIds.sarah, communityId: communityIds.coastal },
    { id: "seed-uc-004", userId: userIds.sarah, communityId: communityIds.mileHigh },
    { id: "seed-uc-005", userId: userIds.mike, communityId: communityIds.capital },
    { id: "seed-uc-006", userId: userIds.mike, communityId: communityIds.coastal },
    { id: "seed-uc-007", userId: userIds.emily, communityId: communityIds.bayou },
    { id: "seed-uc-008", userId: userIds.emily, communityId: communityIds.mileHigh },
    { id: "seed-uc-009", userId: userIds.carlos, communityId: communityIds.mileHigh },
    { id: "seed-uc-010", userId: userIds.carlos, communityId: communityIds.bayou },
    { id: "seed-uc-011", userId: userIds.jessica, communityId: communityIds.pnw },
    { id: "seed-uc-012", userId: userIds.jessica, communityId: communityIds.coastal },
    { id: "seed-uc-013", userId: userIds.derek, communityId: communityIds.coastal },
    { id: "seed-uc-014", userId: userIds.derek, communityId: communityIds.capital },
    { id: "seed-uc-015", userId: userIds.brittany, communityId: communityIds.capital },
    { id: "seed-uc-016", userId: userIds.brittany, communityId: communityIds.pnw },
  ]);

  console.log("Inserted 16 community memberships.");

  // -----------------------------------------------------------------------
  // 4. Rucks (28 total, spread over 30 days)
  // -----------------------------------------------------------------------
  const now = new Date();
  const daysAgo = (n: number) => new Date(now.getTime() - n * 24 * 60 * 60 * 1000);

  const denverRouteCoords = JSON.stringify([
    { lat: 39.7392, lng: -104.9903 },
    { lat: 39.7400, lng: -104.9880 },
    { lat: 39.7415, lng: -104.9865 },
    { lat: 39.7430, lng: -104.9850 },
    { lat: 39.7420, lng: -104.9830 },
    { lat: 39.7400, lng: -104.9850 },
    { lat: 39.7392, lng: -104.9903 },
  ]);

  const sdRouteCoords = JSON.stringify([
    { lat: 32.7157, lng: -117.1611 },
    { lat: 32.7170, lng: -117.1590 },
    { lat: 32.7185, lng: -117.1575 },
    { lat: 32.7170, lng: -117.1555 },
    { lat: 32.7157, lng: -117.1611 },
  ]);

  const dcRouteCoords = JSON.stringify([
    { lat: 38.8895, lng: -77.0353 },
    { lat: 38.8900, lng: -77.0340 },
    { lat: 38.8915, lng: -77.0330 },
    { lat: 38.8930, lng: -77.0345 },
    { lat: 38.8920, lng: -77.0360 },
    { lat: 38.8905, lng: -77.0370 },
    { lat: 38.8895, lng: -77.0353 },
  ]);

  await db.insert(rucks).values([
    // Jake's rucks (Denver)
    {
      id: ruckIds[0],
      userId: userIds.jake,
      distance: 8047,
      durationSeconds: 4200,
      weight: 45,
      notes: "Morning ruck through City Park. Good pace today.",
      routeCoordinates: denverRouteCoords,
      communityId: communityIds.mileHigh,
      createdAt: daysAgo(2),
    },
    {
      id: ruckIds[1],
      userId: userIds.jake,
      distance: 12874,
      durationSeconds: 6600,
      weight: 50,
      notes: "Heavy ruck training session. Up Red Rocks trail.",
      routeCoordinates: denverRouteCoords,
      communityId: communityIds.mileHigh,
      createdAt: daysAgo(7),
    },
    {
      id: ruckIds[2],
      userId: userIds.jake,
      distance: 6437,
      durationSeconds: 3300,
      weight: 40,
      notes: "Quick Wednesday ruck before work.",
      createdAt: daysAgo(10),
    },
    {
      id: ruckIds[3],
      userId: userIds.jake,
      distance: 9656,
      durationSeconds: 5100,
      weight: 45,
      notes: "Cheesman Park loop. Beautiful morning.",
      routeCoordinates: denverRouteCoords,
      createdAt: daysAgo(14),
    },
    {
      id: ruckIds[4],
      userId: userIds.jake,
      distance: 16093,
      durationSeconds: 8400,
      weight: 55,
      notes: "Long training ruck. Prepping for GORUCK event.",
      routeCoordinates: denverRouteCoords,
      communityId: communityIds.mileHigh,
      createdAt: daysAgo(21),
    },

    // Sarah's rucks (San Diego)
    {
      id: ruckIds[5],
      userId: userIds.sarah,
      distance: 6437,
      durationSeconds: 3300,
      weight: 30,
      notes: "Coastal trail ruck. Salt air therapy.",
      routeCoordinates: sdRouteCoords,
      communityId: communityIds.coastal,
      createdAt: daysAgo(1),
    },
    {
      id: ruckIds[6],
      userId: userIds.sarah,
      distance: 9656,
      durationSeconds: 4800,
      weight: 35,
      notes: "Torrey Pines trail. Stunning views.",
      routeCoordinates: sdRouteCoords,
      communityId: communityIds.coastal,
      createdAt: daysAgo(5),
    },
    {
      id: ruckIds[7],
      userId: userIds.sarah,
      distance: 4828,
      durationSeconds: 2700,
      weight: 25,
      notes: "Beach boardwalk ruck. Short but solid.",
      createdAt: daysAgo(9),
    },
    {
      id: ruckIds[8],
      userId: userIds.sarah,
      distance: 12874,
      durationSeconds: 6300,
      weight: 35,
      notes: "Long Saturday ruck with the coastal crew.",
      routeCoordinates: sdRouteCoords,
      communityId: communityIds.coastal,
      createdAt: daysAgo(16),
    },
    {
      id: ruckIds[9],
      userId: userIds.sarah,
      distance: 8047,
      durationSeconds: 4200,
      weight: 30,
      notes: "Balboa Park perimeter. Always a great route.",
      routeCoordinates: sdRouteCoords,
      createdAt: daysAgo(23),
    },

    // Mike's rucks (DC)
    {
      id: ruckIds[10],
      userId: userIds.mike,
      distance: 11265,
      durationSeconds: 5700,
      weight: 40,
      notes: "National Mall loop. Lincoln to Capitol and back.",
      routeCoordinates: dcRouteCoords,
      communityId: communityIds.capital,
      createdAt: daysAgo(3),
    },
    {
      id: ruckIds[11],
      userId: userIds.mike,
      distance: 8047,
      durationSeconds: 4200,
      weight: 45,
      notes: "Pre-dawn ruck before morning meeting.",
      routeCoordinates: dcRouteCoords,
      communityId: communityIds.capital,
      createdAt: daysAgo(8),
    },
    {
      id: ruckIds[12],
      userId: userIds.mike,
      distance: 6437,
      durationSeconds: 3300,
      weight: 40,
      notes: "Rock Creek Park trail. Good terrain variety.",
      createdAt: daysAgo(12),
    },
    {
      id: ruckIds[13],
      userId: userIds.mike,
      distance: 14484,
      durationSeconds: 7200,
      weight: 50,
      notes: "Long Sunday ruck. Capitol Hill to Georgetown bridge.",
      routeCoordinates: dcRouteCoords,
      communityId: communityIds.capital,
      createdAt: daysAgo(19),
    },

    // Emily's rucks (Houston)
    {
      id: ruckIds[14],
      userId: userIds.emily,
      distance: 4828,
      durationSeconds: 2700,
      weight: 25,
      notes: "Bayou Greenway ruck. Humidity was brutal.",
      communityId: communityIds.bayou,
      createdAt: daysAgo(2),
    },
    {
      id: ruckIds[15],
      userId: userIds.emily,
      distance: 8047,
      durationSeconds: 4500,
      weight: 30,
      notes: "Memorial Park trails. Good elevation for Houston.",
      communityId: communityIds.bayou,
      createdAt: daysAgo(6),
    },
    {
      id: ruckIds[16],
      userId: userIds.emily,
      distance: 6437,
      durationSeconds: 3600,
      weight: 35,
      notes: "Friday evening ruck. Best time of the week.",
      createdAt: daysAgo(11),
    },
    {
      id: ruckIds[17],
      userId: userIds.emily,
      distance: 9656,
      durationSeconds: 5100,
      weight: 30,
      notes: "Group ruck with Bayou crew. Great turnout!",
      communityId: communityIds.bayou,
      createdAt: daysAgo(17),
    },

    // Carlos's rucks
    {
      id: ruckIds[18],
      userId: userIds.carlos,
      distance: 12874,
      durationSeconds: 7200,
      weight: 60,
      notes: "Heavy is good. Loved every minute.",
      routeCoordinates: denverRouteCoords,
      communityId: communityIds.mileHigh,
      createdAt: daysAgo(4),
    },
    {
      id: ruckIds[19],
      userId: userIds.carlos,
      distance: 8047,
      durationSeconds: 4500,
      weight: 55,
      notes: "Big pack on the trail today.",
      routeCoordinates: denverRouteCoords,
      createdAt: daysAgo(13),
    },
    {
      id: ruckIds[20],
      userId: userIds.carlos,
      distance: 6437,
      durationSeconds: 3900,
      weight: 60,
      notes: "Short distance, max weight training day.",
      createdAt: daysAgo(20),
    },

    // Jessica's rucks (Seattle/PNW)
    {
      id: ruckIds[21],
      userId: userIds.jessica,
      distance: 11265,
      durationSeconds: 5700,
      weight: 35,
      notes: "Rattlesnake Ridge trail. Perfect ruck weather.",
      communityId: communityIds.pnw,
      createdAt: daysAgo(3),
    },
    {
      id: ruckIds[22],
      userId: userIds.jessica,
      distance: 14484,
      durationSeconds: 7500,
      weight: 40,
      notes: "Tiger Mountain loop. This one is tough.",
      communityId: communityIds.pnw,
      createdAt: daysAgo(10),
    },
    {
      id: ruckIds[23],
      userId: userIds.jessica,
      distance: 8047,
      durationSeconds: 4200,
      weight: 35,
      notes: "Discovery Park coastal trail. Rainy but amazing.",
      createdAt: daysAgo(18),
    },

    // Derek's rucks
    {
      id: ruckIds[24],
      userId: userIds.derek,
      distance: 9656,
      durationSeconds: 4800,
      weight: 50,
      notes: "Coronado Island ruck. Naval air station vibes.",
      routeCoordinates: sdRouteCoords,
      communityId: communityIds.coastal,
      createdAt: daysAgo(5),
    },
    {
      id: ruckIds[25],
      userId: userIds.derek,
      distance: 12874,
      durationSeconds: 6300,
      weight: 45,
      notes: "Penasquitos Canyon trail. Gnarly terrain.",
      routeCoordinates: sdRouteCoords,
      createdAt: daysAgo(15),
    },

    // Brittany's rucks
    {
      id: ruckIds[26],
      userId: userIds.brittany,
      distance: 8047,
      durationSeconds: 4200,
      weight: 30,
      notes: "Georgetown waterfront ruck. Love this city.",
      routeCoordinates: dcRouteCoords,
      communityId: communityIds.capital,
      createdAt: daysAgo(4),
    },
    {
      id: ruckIds[27],
      userId: userIds.brittany,
      distance: 6437,
      durationSeconds: 3300,
      weight: 25,
      notes: "Early morning solo ruck. Cleared my head.",
      createdAt: daysAgo(22),
    },
  ]);

  console.log("Inserted 28 rucks.");

  // -----------------------------------------------------------------------
  // 5. Challenges (3 total)
  // -----------------------------------------------------------------------
  const inFourWeeks = new Date(now.getTime() + 28 * 24 * 60 * 60 * 1000);
  const inThreeWeeks = new Date(now.getTime() + 21 * 24 * 60 * 60 * 1000);
  const inTwoWeeks = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

  await db.insert(challenges).values([
    {
      id: challengeIds.summerDistance,
      communityId: communityIds.mileHigh,
      title: "Mile High Summer Distance Challenge",
      description: "Log 100 kilometers (62 miles) of rucking this month. Altitude makes it count double.",
      challengeType: "distance",
      goalValue: 100000,
      goalUnit: "meters",
      endDate: inFourWeeks,
      createdBy: userIds.jake,
    },
    {
      id: challengeIds.monthlyRucks,
      communityId: communityIds.coastal,
      title: "30 Rucks in 30 Days",
      description: "One ruck per day for a full month. Any distance, any weight counts.",
      challengeType: "rucks",
      goalValue: 30,
      goalUnit: "rucks",
      endDate: inThreeWeeks,
      createdBy: userIds.sarah,
    },
    {
      id: challengeIds.heavyPack,
      communityId: communityIds.capital,
      title: "Capital Heavy Pack Challenge",
      description: "Move 1,000 lbs of weight over ruck sessions this month. Every lb counts.",
      challengeType: "weight",
      goalValue: 1000,
      goalUnit: "lbs",
      endDate: inTwoWeeks,
      createdBy: userIds.mike,
    },
  ]);

  console.log("Inserted 3 challenges.");

  // -----------------------------------------------------------------------
  // 6. ChallengeParticipants
  // -----------------------------------------------------------------------
  await db.insert(challengeParticipants).values([
    { id: "seed-cp-001", challengeId: challengeIds.summerDistance, userId: userIds.jake },
    { id: "seed-cp-002", challengeId: challengeIds.summerDistance, userId: userIds.carlos },
    { id: "seed-cp-003", challengeId: challengeIds.summerDistance, userId: userIds.sarah },
    { id: "seed-cp-004", challengeId: challengeIds.monthlyRucks, userId: userIds.sarah },
    { id: "seed-cp-005", challengeId: challengeIds.monthlyRucks, userId: userIds.derek },
    { id: "seed-cp-006", challengeId: challengeIds.monthlyRucks, userId: userIds.jessica },
    { id: "seed-cp-007", challengeId: challengeIds.heavyPack, userId: userIds.mike },
    { id: "seed-cp-008", challengeId: challengeIds.heavyPack, userId: userIds.brittany },
    { id: "seed-cp-009", challengeId: challengeIds.heavyPack, userId: userIds.carlos },
  ]);

  console.log("Inserted 9 challenge participants.");

  // -----------------------------------------------------------------------
  // 7. Friendships (mix of accepted and pending)
  // -----------------------------------------------------------------------
  await db.insert(friendships).values([
    {
      id: "seed-fr-001",
      requesterId: userIds.jake,
      addresseeId: userIds.carlos,
      status: "accepted",
    },
    {
      id: "seed-fr-002",
      requesterId: userIds.sarah,
      addresseeId: userIds.derek,
      status: "accepted",
    },
    {
      id: "seed-fr-003",
      requesterId: userIds.mike,
      addresseeId: userIds.brittany,
      status: "accepted",
    },
    {
      id: "seed-fr-004",
      requesterId: userIds.emily,
      addresseeId: userIds.jessica,
      status: "accepted",
    },
    {
      id: "seed-fr-005",
      requesterId: userIds.jake,
      addresseeId: userIds.mike,
      status: "accepted",
    },
    {
      id: "seed-fr-006",
      requesterId: userIds.sarah,
      addresseeId: userIds.emily,
      status: "pending",
    },
    {
      id: "seed-fr-007",
      requesterId: userIds.carlos,
      addresseeId: userIds.derek,
      status: "pending",
    },
    {
      id: "seed-fr-008",
      requesterId: userIds.jessica,
      addresseeId: userIds.jake,
      status: "pending",
    },
  ]);

  console.log("Inserted 8 friendships.");

  // -----------------------------------------------------------------------
  // 8. CommunityPosts
  // -----------------------------------------------------------------------
  await db.insert(communityPosts).values([
    {
      id: "seed-post-001",
      communityId: communityIds.mileHigh,
      postType: "ruck",
      referenceId: ruckIds[1],
      userId: userIds.jake,
      content: "Crushed a heavy ruck up Red Rocks today. 8 miles with 50 lbs. Who wants to join next week?",
      createdAt: daysAgo(7),
    },
    {
      id: "seed-post-002",
      communityId: communityIds.mileHigh,
      postType: "text",
      userId: userIds.carlos,
      content: "Reminder: Group ruck this Saturday at 7am, City Park main entrance. Bring water and at least 30 lbs.",
      createdAt: daysAgo(5),
    },
    {
      id: "seed-post-003",
      communityId: communityIds.coastal,
      postType: "ruck",
      referenceId: ruckIds[6],
      userId: userIds.sarah,
      content: "Torrey Pines trail with 35 lbs. Absolutely worth every step. Views were incredible.",
      createdAt: daysAgo(5),
    },
    {
      id: "seed-post-004",
      communityId: communityIds.coastal,
      postType: "text",
      userId: userIds.derek,
      content: "Anyone up for a Coronado beach ruck this weekend? Thinking Sunday morning.",
      createdAt: daysAgo(4),
    },
    {
      id: "seed-post-005",
      communityId: communityIds.capital,
      postType: "ruck",
      referenceId: ruckIds[13],
      userId: userIds.mike,
      content: "14.5km through DC with 50 lbs. Capitol Hill to Georgetown. Best city to ruck.",
      createdAt: daysAgo(19),
    },
    {
      id: "seed-post-006",
      communityId: communityIds.capital,
      postType: "text",
      userId: userIds.brittany,
      content: "Just joined the Heavy Pack Challenge! Who else is in? Let's hit that 1,000 lb goal!",
      createdAt: daysAgo(3),
    },
    {
      id: "seed-post-007",
      communityId: communityIds.bayou,
      postType: "ruck",
      referenceId: ruckIds[17],
      userId: userIds.emily,
      content: "Group ruck with 12 people today! Bayou Greenway was perfect. Humidity didn't stop us!",
      createdAt: daysAgo(17),
    },
    {
      id: "seed-post-008",
      communityId: communityIds.pnw,
      postType: "ruck",
      referenceId: ruckIds[22],
      userId: userIds.jessica,
      content: "Tiger Mountain loop done. 9 miles, 40 lbs, and absolutely soaked from the rain. Worth it.",
      createdAt: daysAgo(10),
    },
  ]);

  console.log("Inserted 8 community posts.");

  // -----------------------------------------------------------------------
  // 9. RuckLikes
  // -----------------------------------------------------------------------
  await db.insert(ruckLikes).values([
    { id: "seed-like-001", ruckId: ruckIds[0], userId: userIds.sarah },
    { id: "seed-like-002", ruckId: ruckIds[0], userId: userIds.carlos },
    { id: "seed-like-003", ruckId: ruckIds[1], userId: userIds.emily },
    { id: "seed-like-004", ruckId: ruckIds[1], userId: userIds.mike },
    { id: "seed-like-005", ruckId: ruckIds[5], userId: userIds.jake },
    { id: "seed-like-006", ruckId: ruckIds[5], userId: userIds.derek },
    { id: "seed-like-007", ruckId: ruckIds[6], userId: userIds.mike },
    { id: "seed-like-008", ruckId: ruckIds[10], userId: userIds.jake },
    { id: "seed-like-009", ruckId: ruckIds[10], userId: userIds.brittany },
    { id: "seed-like-010", ruckId: ruckIds[18], userId: userIds.jake },
    { id: "seed-like-011", ruckId: ruckIds[21], userId: userIds.sarah },
    { id: "seed-like-012", ruckId: ruckIds[22], userId: userIds.emily },
  ]);

  console.log("Inserted 12 ruck likes.");

  // -----------------------------------------------------------------------
  // 10. RuckComments
  // -----------------------------------------------------------------------
  await db.insert(ruckComments).values([
    {
      id: "seed-comment-001",
      ruckId: ruckIds[0],
      userId: userIds.carlos,
      content: "Solid effort! The City Park loop is one of my favorites.",
      createdAt: daysAgo(2),
    },
    {
      id: "seed-comment-002",
      ruckId: ruckIds[1],
      userId: userIds.emily,
      content: "Red Rocks trail is no joke with 50 lbs. You're a machine, Jake!",
      createdAt: daysAgo(7),
    },
    {
      id: "seed-comment-003",
      ruckId: ruckIds[5],
      userId: userIds.derek,
      content: "Coastal rucks are the best. See you out there!",
      createdAt: daysAgo(1),
    },
    {
      id: "seed-comment-004",
      ruckId: ruckIds[6],
      userId: userIds.mike,
      content: "Torrey Pines is incredible. Adding it to my list.",
      createdAt: daysAgo(5),
    },
    {
      id: "seed-comment-005",
      ruckId: ruckIds[10],
      userId: userIds.brittany,
      content: "Great route, Mike! We should do this one as a group.",
      createdAt: daysAgo(3),
    },
    {
      id: "seed-comment-006",
      ruckId: ruckIds[18],
      userId: userIds.jake,
      content: "60 lbs! That's serious weight training right there.",
      createdAt: daysAgo(4),
    },
  ]);

  console.log("Inserted 6 ruck comments.");

  // -----------------------------------------------------------------------
  // 11. Notifications
  // -----------------------------------------------------------------------
  await db.insert(notifications).values([
    {
      id: "seed-notif-001",
      userId: userIds.jake,
      type: "like",
      referenceId: ruckIds[0],
      fromUserId: userIds.sarah,
      message: "Sarah Thompson liked your ruck.",
      read: false,
      createdAt: daysAgo(2),
    },
    {
      id: "seed-notif-002",
      userId: userIds.jake,
      type: "comment",
      referenceId: ruckIds[1],
      fromUserId: userIds.emily,
      message: "Emily Foster commented on your ruck.",
      read: true,
      createdAt: daysAgo(7),
    },
    {
      id: "seed-notif-003",
      userId: userIds.sarah,
      type: "friend_request",
      fromUserId: userIds.emily,
      message: "Emily Foster sent you a friend request.",
      read: false,
      createdAt: daysAgo(2),
    },
    {
      id: "seed-notif-004",
      userId: userIds.mike,
      type: "challenge_joined",
      referenceId: challengeIds.heavyPack,
      fromUserId: userIds.brittany,
      message: "Brittany Hall joined your Heavy Pack Challenge.",
      read: false,
      createdAt: daysAgo(3),
    },
    {
      id: "seed-notif-005",
      userId: userIds.jake,
      type: "friend_request",
      fromUserId: userIds.jessica,
      message: "Jessica Wu sent you a friend request.",
      read: false,
      createdAt: daysAgo(1),
    },
    {
      id: "seed-notif-006",
      userId: userIds.emily,
      type: "like",
      referenceId: ruckIds[17],
      fromUserId: userIds.jessica,
      message: "Jessica Wu liked your ruck.",
      read: true,
      createdAt: daysAgo(10),
    },
  ]);

  console.log("Inserted 6 notifications.");

  console.log("\nSeed complete.");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
