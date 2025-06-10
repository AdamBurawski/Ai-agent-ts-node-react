import React, { useEffect, useRef } from "react";
import { Network } from "vis-network/standalone";

interface GraphComponentProps {
  data: {
    nodes: { id: string; label: string }[];
    edges: { from: string; to: string }[];
  };
}

const handleCreateGraph = async () => {
  try {
    // Updated endpoint to match our API structure
    const response = await fetch(
      "http://localhost:3001/api/graph/import-data",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Error: ${response.status}`);
    }

    const result = await response.json(); // Changed to json() since we're returning JSON now
    alert(result.message); // Display the message from our response
    console.log(result);
  } catch (error) {
    console.error("Error creating graph:", error);
    alert("Failed to create graph. Check the console for details.");
  }
};

const GraphComponent: React.FC<GraphComponentProps> = ({ data }) => {
  const graphRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (graphRef.current) {
      const network = new Network(graphRef.current, data, {
        nodes: {
          shape: "dot",
          size: 20,
          font: {
            size: 15,
            color: "#000",
          },
          borderWidth: 2,
        },
        edges: {
          width: 2,
          color: { inherit: "from" },
          smooth: true,
        },
        physics: {
          enabled: true,
        },
      });

      return () => network.destroy(); // Cleanup on unmount
    }
  }, [data]);

  return (
    <div>
      <div ref={graphRef} style={{ width: "100%", height: "500px" }} />
      <div style={{ marginBottom: "20px" }}>
        <button
          onClick={handleCreateGraph}
          style={{
            padding: "10px 20px",
            backgroundColor: "#28a745",
            color: "white",
            border: "none",
            borderRadius: "5px",
            cursor: "pointer",
          }}
        >
          Create Graph in Neo4j
        </button>
      </div>
    </div>
  );
};

export default GraphComponent;
