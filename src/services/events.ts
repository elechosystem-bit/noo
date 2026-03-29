const API_KEY = process.env.EXPO_PUBLIC_OPENAGENDA_KEY || "";

export interface LocalEvent {
  id: string;
  title: string;
  description?: string;
  imageUrl?: string;
  date: string;
  location: string;
  url: string;
  isDemo?: boolean;
}

const DEMO_EVENTS: LocalEvent[] = [
  { id: "demo_1", title: "Exposition impressionniste au musee des Beaux-Arts", description: "Decouvrez les chefs-d'oeuvre impressionnistes dans une scenographie immersive pour toute la famille.", date: new Date(Date.now() + 3 * 86400000).toISOString(), location: "Musee des Beaux-Arts", url: "https://openagenda.com", isDemo: true },
  { id: "demo_2", title: "Festival des arts de la rue", description: "Spectacles de cirque, theatre de rue et ateliers creatifs pour petits et grands.", date: new Date(Date.now() + 5 * 86400000).toISOString(), location: "Centre-ville", url: "https://openagenda.com", isDemo: true },
  { id: "demo_3", title: "Atelier cuisine en famille", description: "Parents et enfants preparent ensemble un menu du monde encadres par un chef.", date: new Date(Date.now() + 7 * 86400000).toISOString(), location: "Maison des associations", url: "https://openagenda.com", isDemo: true },
  { id: "demo_4", title: "Planetarium — voyage dans les etoiles", description: "Seance speciale famille : decouvrez les constellations et le systeme solaire.", date: new Date(Date.now() + 10 * 86400000).toISOString(), location: "Planetarium municipal", url: "https://openagenda.com", isDemo: true },
  { id: "demo_5", title: "Spectacle de magie interactive", description: "Un magicien fait participer les enfants sur scene. Rires et emerveillement garantis.", date: new Date(Date.now() + 12 * 86400000).toISOString(), location: "Theatre municipal", url: "https://openagenda.com", isDemo: true },
];

export async function getLocalEvents(city: string): Promise<LocalEvent[]> {
  if (!city) return DEMO_EVENTS;
  if (!API_KEY) return DEMO_EVENTS;

  try {
    const query = encodeURIComponent(city);
    const agendasRes = await fetch(
      `https://api.openagenda.com/v2/agendas?key=${API_KEY}&search=${query}&size=5`
    );
    const agendasData = await agendasRes.json();

    // Check for auth error
    if (agendasData.error) return DEMO_EVENTS;
    if (!agendasData.agendas || agendasData.agendas.length === 0) return DEMO_EVENTS;

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
              isDemo: false,
            });
          }
        }
      } catch { /* skip */ }
    }

    if (allEvents.length === 0) return DEMO_EVENTS;

    return allEvents.slice(0, 6);
  } catch (e) {
    console.error("OpenAgenda error:", e);
    return DEMO_EVENTS;
  }
}
