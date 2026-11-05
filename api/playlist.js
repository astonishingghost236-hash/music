const { getPlaylist } = require("../lib/youtube");

module.exports = async function handler(request, response) {
  if (request.method !== "GET") {
    response.setHeader("Allow", "GET");
    return response.status(405).json({ error: "Method not allowed." });
  }

  const value = typeof request.query.url === "string" ? request.query.url : "";
  try {
    const playlist = await getPlaylist(value, process.env.YOUTUBE_API_KEY);
    return response.status(200).json(playlist);
  } catch (error) {
    if (!error.status) console.error("Playlist API failed:", error.message);
    return response.status(error.status || 500).json({
      code: error.code || "INTERNAL_ERROR",
      error: error.status ? error.message : "Playlist load nahi ho payi.",
    });
  }
};
