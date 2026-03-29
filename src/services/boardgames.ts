export interface BoardGame {
  id: string;
  title: string;
  description: string;
  minAge: number;
  minPlayers: number;
  maxPlayers: number;
  image?: string;
  rating: number;
}

export function getPhilibertUrl(title: string): string {
  return "https://www.philibertnet.com/fr/recherche?search=" + encodeURIComponent(title);
}

export async function getGamesForFamily(members: { name: string; age: number }[]): Promise<BoardGame[]> {
  if (members.length === 0) return [];

  const nombreJoueurs = members.length;
  const ageMin = Math.min(...members.map((m) => m.age));

  let searchTerm = "jeu strategie famille";
  if (ageMin < 8) searchTerm = "jeu famille enfant";
  else if (ageMin < 12) searchTerm = "jeu famille";

  try {
    // Step 1: Search BGG
    const searchRes = await fetch(
      "https://boardgamegeek.com/xmlapi2/search?query=" + encodeURIComponent(searchTerm) + "&type=boardgame"
    );
    const searchText = await searchRes.text();
    const parser = new DOMParser();
    const searchDoc = parser.parseFromString(searchText, "text/xml");
    const items = searchDoc.querySelectorAll("item");

    const ids: string[] = [];
    for (let i = 0; i < Math.min(items.length, 8); i++) {
      const id = items[i].getAttribute("id");
      if (id) ids.push(id);
    }

    if (ids.length === 0) return [];

    // Step 2: Get details for each game
    const detailsRes = await fetch(
      "https://boardgamegeek.com/xmlapi2/thing?id=" + ids.join(",") + "&stats=1"
    );
    const detailsText = await detailsRes.text();
    const detailsDoc = parser.parseFromString(detailsText, "text/xml");
    const gameItems = detailsDoc.querySelectorAll("item");

    const allGames: BoardGame[] = [];

    for (let i = 0; i < gameItems.length; i++) {
      const item = gameItems[i];
      const gameId = item.getAttribute("id") || "";
      const titleEl = item.querySelector("name[type='primary']");
      const title = titleEl?.getAttribute("value") || "";
      const descEl = item.querySelector("description");
      const rawDesc = descEl?.textContent || "";
      const description = rawDesc.replace(/&#10;/g, " ").replace(/<[^>]*>/g, "").substring(0, 100).trim();
      const minAgeEl = item.querySelector("minage");
      const gameMinAge = parseInt(minAgeEl?.getAttribute("value") || "0");
      const minPlayersEl = item.querySelector("minplayers");
      const minPlayers = parseInt(minPlayersEl?.getAttribute("value") || "1");
      const maxPlayersEl = item.querySelector("maxplayers");
      const maxPlayers = parseInt(maxPlayersEl?.getAttribute("value") || "99");
      const imageEl = item.querySelector("image");
      const image = imageEl?.textContent || undefined;
      const ratingEl = item.querySelector("statistics ratings average");
      const rating = parseFloat(ratingEl?.getAttribute("value") || "0");

      allGames.push({ id: gameId, title, description, minAge: gameMinAge, minPlayers, maxPlayers, image, rating });
    }

    // Step 3: Filter
    const filtered = allGames.filter(
      (g) => g.minPlayers <= nombreJoueurs && nombreJoueurs <= g.maxPlayers && g.minAge <= ageMin + 2 && g.title
    );

    // Step 4: Sort by rating, return top 3
    filtered.sort((a, b) => b.rating - a.rating);
    return filtered.slice(0, 3);
  } catch (e) {
    console.error("BGG error:", e);
    return [];
  }
}
