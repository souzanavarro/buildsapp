const MAPILLARY_CLIENT_TOKEN = import.meta.env.VITE_MAPILLARY_API_KEY || "";

export async function getMapillaryImageUrl(lat: number, lng: number): Promise<string | null> {
  if (!MAPILLARY_CLIENT_TOKEN) return null;
  try {
    // Busca a imagem mais próxima das coordenadas
    const radius = 50; // 50 metros
    const response = await fetch(
      `https://graph.mapillary.com/images?access_token=${MAPILLARY_CLIENT_TOKEN}&fields=id,thumb_1024_url&closeto=${lng},${lat}&limit=1`
    );
    
    const data = await response.json();
    
    if (data && data.data && data.data.length > 0) {
      return data.data[0].thumb_1024_url;
    }
    
    return null;
  } catch (error) {
    console.error("Mapillary API error:", error);
    return null;
  }
}
