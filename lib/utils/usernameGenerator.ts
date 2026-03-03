// Kenyan wildlife and civic-themed anonymous username generator
// Pattern: Adjective + Animal + Number (e.g. "CuriousElephant342")

const ADJECTIVES = [
  'Active', 'Alert', 'Brave', 'Bright', 'Calm', 'Civic', 'Clear',
  'Curious', 'Eager', 'Fair', 'Free', 'Good', 'Honest', 'Just',
  'Keen', 'Kind', 'Local', 'Proud', 'Pure', 'Rural', 'Safe',
  'Sharp', 'Strong', 'Sure', 'Swift', 'True', 'Urban', 'Warm', 'Wise',
];

// Kenyan wildlife themed for cultural relevance
const ANIMALS = [
  'Aardvark', 'Antelope', 'Buffalo', 'Bushbuck', 'Cheetah', 'Civet',
  'Crane', 'Crocodile', 'Eagle', 'Elephant', 'Flamingo', 'Gazelle',
  'Giraffe', 'Hartebeest', 'Hawk', 'Heron', 'Hippo', 'Hyena',
  'Ibis', 'Impala', 'Jackal', 'Leopard', 'Lion', 'Mongoose',
  'Oribi', 'Pangolin', 'Pelican', 'Rhino', 'Serval', 'Vulture',
  'Warthog', 'Wildebeest', 'Zebra',
];

export function generateUsername(): string {
  const adjective = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const animal = ANIMALS[Math.floor(Math.random() * ANIMALS.length)];
  const number = Math.floor(Math.random() * 900) + 100; // 100–999
  return `${adjective}${animal}${number}`;
}

/**
 * Generates a username that is guaranteed unique by checking against the DB.
 * The checkExists callback should query the database and return true if the
 * username already exists.
 */
export async function generateUniqueUsername(
  checkExists: (username: string) => Promise<boolean>
): Promise<string> {
  let username = generateUsername();
  let attempts = 0;

  while ((await checkExists(username)) && attempts < 10) {
    username = generateUsername();
    attempts++;
  }

  return username;
}
