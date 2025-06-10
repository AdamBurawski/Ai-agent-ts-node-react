import React, { useEffect, useRef } from "react";
import { Network } from "vis-network/standalone";

interface GraphComponentProps {
  data: {
    nodes: { id: string; label: string }[];
    edges: { from: string; to: string }[];
  };
  onCreateGraph?: () => Promise<void>;
  showCreateButton?: boolean;
}

const GraphComponent: React.FC<GraphComponentProps> = ({
  data,
  onCreateGraph,
  showCreateButton = true,
}) => {
  const graphRef = useRef<HTMLDivElement | null>(null);
  const networkRef = useRef<Network | null>(null);

  useEffect(() => {
    if (graphRef.current) {
      // Destroy previous network instance
      if (networkRef.current) {
        networkRef.current.destroy();
      }

      // Create new network
      networkRef.current = new Network(graphRef.current, data, {
        nodes: {
          shape: "dot",
          size: 20,
          font: {
            size: 15,
            color: "#000",
          },
          borderWidth: 2,
          color: {
            background: "#007bff",
            border: "#0056b3",
            highlight: {
              background: "#0056b3",
              border: "#004085",
            },
          },
        },
        edges: {
          width: 2,
          color: { color: "#666", highlight: "#007bff" },
          smooth: {
            enabled: true,
            type: "continuous",
            roundness: 0.5,
          },
        },
        physics: {
          enabled: true,
          stabilization: { iterations: 100 },
          barnesHut: {
            gravitationalConstant: -2000,
            centralGravity: 0.3,
            springLength: 95,
            springConstant: 0.04,
            damping: 0.09,
          },
        },
        interaction: {
          hover: true,
          tooltipDelay: 200,
        },
      });

      return () => {
        if (networkRef.current) {
          networkRef.current.destroy();
          networkRef.current = null;
        }
      };
    }
  }, [data]);

  const handleCreateGraphClick = async () => {
    if (onCreateGraph) {
      try {
        await onCreateGraph();
      } catch (error) {
        console.error("Error creating graph:", error);
      }
    }
  };

  return (
    <div className="graph-component">
      <div ref={graphRef} className="graph-component__container" />

      {showCreateButton && onCreateGraph && (
        <div className="graph-component__actions">
          <button
            onClick={handleCreateGraphClick}
            className="graph-component__create-btn"
          >
            Utwórz graf w Neo4j
          </button>
        </div>
      )}
    </div>
  );
};

export default GraphComponent;
