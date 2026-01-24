import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import mapData from "../data/portland-map-data.json";
import { neighborhoodService } from "../services";

interface MapData {
  width: number;
  height: number;
  colorsWithBooks: string[];
  colorsNoBooks: string[];
  neighborhoods: Array<{
    id: number;
    name: string;
    color: number;
    bookCount: number;
    path: string;
  }>;
  riverEdges: Array<{ x1: number; y1: number; x2: number; y2: number }>;
  regularEdges: Array<{ x1: number; y1: number; x2: number; y2: number }>;
}

const typedMapData = mapData as MapData;

export default function PortlandMap() {
  const [hoveredNeighborhood, setHoveredNeighborhood] = useState<number | null>(
    null,
  );
  const [tooltipPosition, setTooltipPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [bookCounts, setBookCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Fetch book counts from service on mount
  useEffect(() => {
    const fetchBookCounts = async () => {
      try {
        const counts = await neighborhoodService.getBookCounts();
        setBookCounts(counts);
      } catch (error) {
        console.error("Error fetching neighborhood book counts:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchBookCounts();
  }, []);

  // Merge book counts with neighborhood data
  const neighborhoodsWithCounts = typedMapData.neighborhoods.map((n) => ({
    ...n,
    bookCount: bookCounts[n.name] || 0,
  }));

  const hoveredNeighborhoodData =
    hoveredNeighborhood !== null
      ? neighborhoodsWithCounts.find((n) => n.id === hoveredNeighborhood)
      : null;

  const handleNeighborhoodClick = (neighborhoodName: string) => {
    // Navigate to browse page with neighborhood filter and scroll to top
    navigate(`/browse?neighborhood=${encodeURIComponent(neighborhoodName)}`);
    window.scrollTo(0, 0);
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (hoveredNeighborhood !== null) {
      const rect = e.currentTarget.getBoundingClientRect();
      setTooltipPosition({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    }
  };

  const handleMouseLeave = () => {
    setHoveredNeighborhood(null);
    setTooltipPosition(null);
  };

  return (
    <div className="flex flex-col items-center relative">
      <svg
        width={typedMapData.width}
        height={typedMapData.height}
        viewBox={`0 0 ${typedMapData.width} ${typedMapData.height}`}
        className="w-full h-auto max-w-[400px]"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        {/* Background */}
        <rect
          width={typedMapData.width}
          height={typedMapData.height}
          fill="#FFFFFF"
        />

        {/* Neighborhood fills */}
        <g id="neighborhood-fills">
          {neighborhoodsWithCounts.map((neighborhood) => {
            const isHovered = hoveredNeighborhood === neighborhood.id;
            const hasBooks = neighborhood.bookCount > 0;
            const colorPalette = hasBooks
              ? typedMapData.colorsWithBooks
              : typedMapData.colorsNoBooks;
            const fillColor = colorPalette[neighborhood.color];

            return (
              <path
                key={`fill-${neighborhood.id}`}
                d={neighborhood.path}
                fill={fillColor}
                opacity={isHovered ? 0.9 : 0.7}
                style={{
                  cursor: hasBooks ? "pointer" : "default",
                  transition: "opacity 0.2s",
                }}
                onMouseEnter={() => setHoveredNeighborhood(neighborhood.id)}
                onClick={() =>
                  hasBooks && handleNeighborhoodClick(neighborhood.name)
                }
              >
                <title>{neighborhood.name}</title>
              </path>
            );
          })}
        </g>

        {/* Regular edges (light gray) */}
        <g
          id="regular-edges"
          stroke="#D1D5DB"
          strokeWidth="0.8"
          pointerEvents="none"
        >
          {typedMapData.regularEdges.map((edge, i) => (
            <line
              key={`edge-${i}`}
              x1={edge.x1}
              y1={edge.y1}
              x2={edge.x2}
              y2={edge.y2}
            />
          ))}
        </g>

        {/* River edges (blue, thicker) */}
        <g
          id="river-edges"
          stroke="#3B82F6"
          strokeWidth="2.5"
          opacity="0.9"
          pointerEvents="none"
        >
          {typedMapData.riverEdges.map((edge, i) => (
            <line
              key={`river-${i}`}
              x1={edge.x1}
              y1={edge.y1}
              x2={edge.x2}
              y2={edge.y2}
            />
          ))}
        </g>
      </svg>

      {/* Floating tooltip */}
      {hoveredNeighborhoodData && tooltipPosition && (
        <div
          className="absolute pointer-events-none bg-white px-3 py-2 rounded-lg shadow-lg border border-gray-200 z-10"
          style={{
            left: `${tooltipPosition.x}px`,
            top: `${tooltipPosition.y}px`,
            transform: "translate(10px, calc(-50% - 30px))",
          }}
        >
          <div className="text-sm font-semibold text-gray-700 whitespace-nowrap">
            <span className="text-[#08A045]">
              {hoveredNeighborhoodData.name}
            </span>
            {" · "}
            <span>
              {hoveredNeighborhoodData.bookCount}{" "}
              {hoveredNeighborhoodData.bookCount === 1 ? "book" : "books"}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
