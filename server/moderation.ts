const BANNED_WORDS = [
  "fuck", "shit", "bitch", "cunt", "dick", "cock", "pussy",
  "whore", "slut", "fag", "nigger", "nigga", "retard", "rape",
  "porn", "nude", "hentai", "dildo", "penis", "vagina",
  "orgasm", "ejaculate", "masturbat", "blowjob", "handjob",
  "motherfuck", "bullshit", "horseshit", "dumbass", "jackass",
  "wank", "twat", "prick",
  "kike", "spic", "chink", "wetback", "beaner",
  "nazi", "hitler",
];

const LEET_MAP: Record<string, string> = {
  "0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t", "@": "a", "$": "s",
};

function deLeet(text: string): string {
  return text.split("").map(c => LEET_MAP[c] || c).join("");
}

function tokenize(text: string): string[] {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(Boolean);
}

export function containsInappropriateContent(text: string): { flagged: boolean; reason?: string } {
  const tokens = tokenize(text);
  const deLeetTokens = tokenize(deLeet(text));
  const allTokens = [...new Set([...tokens, ...deLeetTokens])];

  for (const token of allTokens) {
    for (const word of BANNED_WORDS) {
      if (token === word || token.startsWith(word) || token.endsWith(word)) {
        return { flagged: true, reason: "Content contains inappropriate language" };
      }
    }
  }

  return { flagged: false };
}

export function moderateText(text: string): { ok: boolean; message?: string } {
  const check = containsInappropriateContent(text);
  if (check.flagged) {
    return { ok: false, message: check.reason };
  }
  return { ok: true };
}
