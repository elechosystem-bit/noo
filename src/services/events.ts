const API_KEY = process.env.EXPO_PUBLIC_OPENAGENDA_KEY || "";

export interface LocalEvent {
  id: string;
  title: string;
  description?: string;
  imageUrl?: string;
  date: string;
  location: string;
  url: string;
}

export async function getLocalEvents(city: string): Promise<LocalEvent[]> {
  if (!city || !API_KEY) return [];

  try {
    // Step 1: find agendas related to the city
    const query = encodeURIComponent(city);
    const agendasRes = await fetch(
      `https://api.openagenda.com/v2/agendas?key=${API_KEY}&search=${query}&size=5`
    );
    const agendasData = await agendasRes.json();

    if (!agendasData.agendas || agendasData.agendas.length === 0) return [];

    // Step 2: get events from found agendas
    const allEvents: LocalEvent[] = [];

    for (const agenda of agendasData.agendas.slice(0, 3)) {
      try {
        const evRes = await fetch(
          `https://api.openagenda.com/v2/agendas/${agenda.uid}/events?key=${API_KEY}&relative[]=current&relative[]=upcoming&size=3&sort=timings.asc`
        );
        const evData = await evRes.json();

        if (evData.events) {
          for (const ev of evData.events) {
            const timing = ev.timings?.[0];
            const loc = ev.location || {};
            const img = ev.image?.base ? ev.image.base + ev.image.filename : null;

            allEvents.push({
              id: String(ev.uid),
              title: ev.title?.fr || ev.title?.en || "Evenement",
              description: (ev.description?.fr || "").substring(0, 120),
              imageUrl: img,
              date: timing?.begin || "",
              location: loc.name || loc.city || city,
              url: ev.canonicalUrl || `https://openagenda.com/events/${ev.uid}`,
            });
          }
        }
      } catch { /* skip this agenda */ }
    }

    return allEvents.slice(0, 6);
  } catch (e) {
    console.error("OpenAgenda error:", e);
    return [];
  }
}
