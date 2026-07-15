import { useRef, useState, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import * as d3 from 'd3';
import { Text as PixiText, Graphics, Application, Container, Circle } from "pixi.js";
import { Group as TweenGroup, Tween as Tweened } from "@tweenjs/tween.js";
import { useNetworkData } from '../hooks/useNetworkData';

/* ── Node type → color map ─────────────────────────────────── */
const NODE_COLORS = {
  district: '#b5179e',
  offender: '#ff4d6d',
  station:  '#4ea8de',
  victim:   '#ffd166',
  incident: '#8b8b99',
};

const NODE_ICONS = {
  district: 'map',
  offender: 'person',
  station:  'local_police',
  victim:   'accessibility_new',
  incident: 'description',
};

function getNodeColor(node) {
  return NODE_COLORS[node.type] || '#ffffff';
}

/* ── Default force constants (matching Obsidian defaults) ──── */
const DEFAULTS = {
  centerForce:  0.05,
  repelForce:   1.0,
  linkForce:    0.3,
  linkDistance:  60,
};

/* ── Component ─────────────────────────────────────────────── */
const NetworkGraph = forwardRef(function NetworkGraph({ height = 600 }, ref) {
  const { nodes, links, loading } = useNetworkData();
  const [selectedNode, setSelectedNode] = useState(null);
  
  const selectedNodeRef = useRef(null);
  useEffect(() => {
    selectedNodeRef.current = selectedNode;
    if (pixiInterfaceRef.current) {
      pixiInterfaceRef.current.triggerHover(null, false);
    }
  }, [selectedNode]);

  const searchStateRef = useRef({ term: '', matches: [], current: 0 });
  const pixiInterfaceRef = useRef(null);

  useImperativeHandle(ref, () => ({
    searchNode: (term, direction = 0) => {
      const state = searchStateRef.current;
      if (!term || !simulationRef.current) {
         searchStateRef.current = { term: '', matches: [], current: 0 };
         return { total: 0, current: 0 };
      }
      
      const lowerTerm = term.toLowerCase();
      let matches = state.matches;
      let newIndex = state.current;
      
      if (term !== state.term || direction === 0) {
         const simNodes = simulationRef.current.nodes();
         matches = simNodes.filter(n => 
           n.label?.toLowerCase().includes(lowerTerm) || 
           n.id?.toLowerCase().includes(lowerTerm) ||
           n.type?.toLowerCase().includes(lowerTerm)
         );
         newIndex = 0;
      } else {
         if (matches.length === 0) return { total: 0, current: 0 };
         newIndex = (state.current + direction + matches.length) % matches.length;
      }
      
      searchStateRef.current = { term, matches, current: newIndex };
      
      if (matches.length > 0) {
         const found = matches[newIndex];
         setSelectedNode(found);
         if (pixiInterfaceRef.current) {
            pixiInterfaceRef.current.triggerHover(found.id, false);
         }
         const canvas = containerRef.current?.querySelector('canvas');
         if (canvas && zoomBehaviorRef.current) {
           const k = 1.5;
           d3.select(canvas)
             .transition()
             .duration(750)
             .call(
               zoomBehaviorRef.current.transform,
               d3.zoomIdentity.translate(-found.x * k, -found.y * k).scale(k)
             );
         }
         return { total: matches.length, current: newIndex + 1 };
      }
      return { total: 0, current: 0 };
    },
    clearHover: () => {
       if (pixiInterfaceRef.current) pixiInterfaceRef.current.triggerHover(null, false);
    }
  }));
  const [hoveredNode, setHoveredNode]   = useState(null);
  const [forcesOpen, setForcesOpen]     = useState(false);
  const [colorNodes, setColorNodes]     = useState(false);

  // Force slider state
  const [centerForce, setCenterForce]   = useState(DEFAULTS.centerForce);
  const [repelForce, setRepelForce]     = useState(DEFAULTS.repelForce);
  const [linkForce, setLinkForce]       = useState(DEFAULTS.linkForce);
  const [linkDistance, setLinkDistance]  = useState(DEFAULTS.linkDistance);

  const sidebarWidth = 256;
  const containerRef = useRef();
  const simulationRef = useRef(null);
  const zoomBehaviorRef = useRef(null);

  const [dimensions, setDimensions] = useState({
    width: Math.max(400, window.innerWidth - sidebarWidth - 60),
    height,
  });

  /* ── Responsive width ── */
  useEffect(() => {
    const update = (w) => setDimensions({ width: Math.max(400, w), height });
    if (containerRef.current) update(containerRef.current.clientWidth);
    const obs = new ResizeObserver(([e]) => update(e.contentRect.width));
    if (containerRef.current) obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, [height]);

  /* ── Live force updates (no full re-render) ── */
  useEffect(() => {
    const sim = simulationRef.current;
    if (!sim) return;

    const charge = sim.force("charge");
    if (charge) charge.strength(-100 * repelForce);

    const center = sim.force("center");
    if (center) center.strength(centerForce);

    const link = sim.force("link");
    if (link) {
      link.strength(linkForce);
      link.distance(linkDistance);
    }

    sim.alpha(0.3).restart();
  }, [centerForce, repelForce, linkForce, linkDistance]);

  /* ── Pixi + D3 main effect ── */
  useEffect(() => {
    if (loading || !nodes.length || !containerRef.current) return;

    const container = containerRef.current;
    container.innerHTML = '';

    const width = dimensions.width;
    const h = dimensions.height;

    // Local mutable state
    const tweens = new Map();
    let hoveredNodeId = null;
    let hoveredNeighbours = new Set();
    let dragging = false;
    let dragStartTime = 0;

    // Copy data for d3 mutability — BIG BANG: start all at origin
    const graphData = {
      nodes: nodes.map(n => ({ ...n, x: 0, y: 0, vx: 0, vy: 0 })),
      links: links.map(l => ({
        source: typeof l.source === 'object' ? l.source.id : l.source,
        target: typeof l.target === 'object' ? l.target.id : l.target,
        ...l
      }))
    };

    const nodesById = new Map(graphData.nodes.map(n => [n.id, n]));
    graphData.links.forEach(l => {
      l.source = nodesById.get(l.source);
      l.target = nodesById.get(l.target);
    });
    // Filter out links with missing endpoints
    graphData.links = graphData.links.filter(l => l.source && l.target);

    function nodeRadius(d) {
      const numLinks = graphData.links.filter(
        (l) => l.source.id === d.id || l.target.id === d.id,
      ).length;
      
      // Node size is primarily driven by number of connections
      return 5 + Math.sqrt(numLinks) * 5;
    }

    // ── Simulation with forces ──
    const simulation = d3.forceSimulation(graphData.nodes)
      .force("charge", d3.forceManyBody().strength(-100 * repelForce))
      .force("center", d3.forceCenter(0, 0).strength(centerForce))
      .force("x", d3.forceX(0).strength(0.03))
      .force("y", d3.forceY(0).strength(0.03))
      .force("link",   d3.forceLink(graphData.links).distance(linkDistance).strength(linkForce))
      .force("collide", d3.forceCollide((n) => nodeRadius(n)).iterations(3))
      .alphaDecay(0.02)       // slower cooldown for smoother settle
      .velocityDecay(0.3);    // moderate damping

    simulationRef.current = simulation;

    const app = new Application();
    let stopAnimation = false;
    let currentTransform = d3.zoomIdentity;
    const nodeRenderData = [];
    const linkRenderData = [];

    const initPixi = async () => {
      await app.init({
        width,
        height: h,
        antialias: true,
        autoStart: false,
        autoDensity: true,
        backgroundAlpha: 0,
        preference: "webgpu",
        resolution: window.devicePixelRatio,
        eventMode: "static",
      });

      if (stopAnimation) {
        app.destroy(true, { children: true });
        return;
      }

      container.appendChild(app.canvas);

      const stage = app.stage;
      stage.interactive = false;

      const labelsContainer = new Container({ zIndex: 3, isRenderGroup: true });
      const nodesContainer  = new Container({ zIndex: 2, isRenderGroup: true });
      const glowContainer   = new Container({ zIndex: 1.5, isRenderGroup: true });
      const linkContainer   = new Container({ zIndex: 1, isRenderGroup: true });
      stage.addChild(linkContainer, glowContainer, nodesContainer, labelsContainer);

      pixiInterfaceRef.current = {
        triggerHover: (id, isFromHover = true) => {
          updateHoverInfo(id, isFromHover);
          renderPixiFromD3();
        }
      };

      /* ── Hover logic ── */
      function updateHoverInfo(newHoveredId, isFromHover = true) {
        const activeId = newHoveredId !== null ? newHoveredId : (selectedNodeRef.current ? selectedNodeRef.current.id : null);
        
        hoveredNodeId = activeId;
        
        if (activeId === null) {
          hoveredNeighbours = new Set();
          for (const n of nodeRenderData) n.active = false;
          for (const l of linkRenderData) l.active = false;
          if (isFromHover) setHoveredNode(null);
        } else {
          hoveredNeighbours = new Set();
          for (const l of linkRenderData) {
            const ld = l.simulationData;
            if (ld.source.id === activeId || ld.target.id === activeId) {
              hoveredNeighbours.add(ld.source.id);
              hoveredNeighbours.add(ld.target.id);
            }
            l.active = ld.source.id === activeId || ld.target.id === activeId;
          }
          for (const n of nodeRenderData) {
            n.active = hoveredNeighbours.has(n.simulationData.id);
          }
          
          if (isFromHover && newHoveredId !== null) {
            const hNode = graphData.nodes.find(n => n.id === newHoveredId);
            if (hNode) setHoveredNode(hNode);
          } else if (isFromHover && newHoveredId === null) {
            setHoveredNode(null);
          }
        }
      }

      /* ── Tween renderers ── */
      function renderNodes() {
        tweens.get("hover")?.stop();
        const tweenGroup = new TweenGroup();
        for (const n of nodeRenderData) {
          let alpha = 1;
          const isHovered = hoveredNodeId === n.simulationData.id;
          
          if (hoveredNodeId !== null) {
            alpha = n.active ? 1 : 0.12;
          }

          const targetColor = isHovered ? '#3b82f6' : n.color;
          const radius = nodeRadius(n.simulationData);
          
          n.gfx.clear().circle(0, 0, radius).fill({ color: targetColor });

          tweenGroup.add(new Tweened(n.gfx, tweenGroup).to({ alpha }, 200));
          
          // glow
          if (n.glow) {
            const glowAlpha = isHovered ? 0.5 : 0;
            n.glow.clear().circle(0, 0, radius + 6).fill({ color: targetColor, alpha: 0.15 });
            tweenGroup.add(new Tweened(n.glow, tweenGroup).to({ alpha: glowAlpha }, 200));
          }
        }
        tweenGroup.getAll().forEach((tw) => tw.start());
        tweens.set("hover", {
          update: tweenGroup.update.bind(tweenGroup),
          stop() { tweenGroup.getAll().forEach((tw) => tw.stop()); },
        });
      }

      function renderLinks() {
        tweens.get("link")?.stop();
        const tweenGroup = new TweenGroup();
        for (const l of linkRenderData) {
          let alpha = 0.6;
          if (hoveredNodeId) {
            alpha = l.active ? 0.9 : 0.05;
          }
          l.color = (hoveredNodeId && l.active) ? '#3b82f6' : '#555566';
          tweenGroup.add(new Tweened(l).to({ alpha }, 200));
        }
        tweenGroup.getAll().forEach((tw) => tw.start());
        tweens.set("link", {
          update: tweenGroup.update.bind(tweenGroup),
          stop() { tweenGroup.getAll().forEach((tw) => tw.stop()); },
        });
      }

      function renderLabels() {
        tweens.get("label")?.stop();
        const tweenGroup = new TweenGroup();
        const defaultScale = 1;
        const activeScale = 1.1;

        for (const n of nodeRenderData) {
          const nodeId = n.simulationData.id;
          if (hoveredNodeId === nodeId) {
            tweenGroup.add(
              new Tweened(n.label).to(
                { alpha: 1, scale: { x: activeScale, y: activeScale } }, 100
              )
            );
          } else {
            let scaleOpacity = Math.max((currentTransform.k - 0.3) / 1.2, 0);
            scaleOpacity = Math.min(scaleOpacity, 0.9);
            tweenGroup.add(
              new Tweened(n.label).to(
                { alpha: n.active ? 1 : scaleOpacity, scale: { x: defaultScale, y: defaultScale } }, 100
              )
            );
          }
        }
        tweenGroup.getAll().forEach((tw) => tw.start());
        tweens.set("label", {
          update: tweenGroup.update.bind(tweenGroup),
          stop() { tweenGroup.getAll().forEach((tw) => tw.stop()); },
        });
      }

      function renderPixiFromD3() {
        renderNodes();
        renderLinks();
        renderLabels();
      }

      /* ── Create Pixi objects for each node ── */
      for (const n of graphData.nodes) {
        const nodeId = n.id;
        const radius = nodeRadius(n);
        const color = colorNodes ? getNodeColor(n) : '#b3b3b8';

        const label = new PixiText({
          interactive: false,
          eventMode: "none",
          text: n.label || n.id,
          alpha: 0,
          anchor: { x: 0.5, y: 1.5 },
          style: {
            fontSize: 12,
            fill: '#ffffff',
            fontFamily: "Inter, sans-serif",
          },
          resolution: window.devicePixelRatio * 2,
        });

        // Glow ring (hover effect)
        const glow = new Graphics({ interactive: false, eventMode: "none" });
        glow.circle(0, 0, radius + 6);
        glow.fill({ color, alpha: 0.15 });
        glow.alpha = 0;
        glowContainer.addChild(glow);

        let oldLabelOpacity = 0;
        const gfx = new Graphics({
          interactive: true,
          label: nodeId,
          eventMode: "static",
          hitArea: new Circle(0, 0, radius + 5),
          cursor: "pointer",
        })
          .circle(0, 0, radius)
          .fill({ color })
          .on("pointerover", (e) => {
            updateHoverInfo(e.target.label, true);
            oldLabelOpacity = label.alpha;
            if (!dragging) renderPixiFromD3();
          })
          .on("pointerleave", () => {
            updateHoverInfo(null, true);
            label.alpha = oldLabelOpacity;
            if (!dragging) renderPixiFromD3();
          });

        nodesContainer.addChild(gfx);
        labelsContainer.addChild(label);

        nodeRenderData.push({
          simulationData: n,
          gfx,
          glow,
          label,
          color,
          alpha: 1,
          active: false,
        });
      }

      /* ── Create Pixi objects for each link ── */
      for (const l of graphData.links) {
        const gfx = new Graphics({ interactive: false, eventMode: "none" });
        linkContainer.addChild(gfx);
        linkRenderData.push({
          simulationData: l,
          gfx,
          color: '#555566',
          alpha: 0.6,
          active: false,
        });
      }

      /* ── Drag handling (Obsidian-style: release springs back) ── */
      d3.select(app.canvas).call(
        d3.drag()
          .container(() => app.canvas)
          .subject((event) => {
            const pointer = d3.pointer(event, app.canvas);
            const x = (pointer[0] - width / 2 - currentTransform.x) / currentTransform.k;
            const y = (pointer[1] - h / 2 - currentTransform.y) / currentTransform.k;
            return simulation.find(x, y, 20 / currentTransform.k);
          })
          .on("start", function dragstarted(event) {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            event.subject.fx = event.subject.x;
            event.subject.fy = event.subject.y;
            event.subject.__initialDragPos = {
              x: event.subject.x,
              y: event.subject.y,
              fx: event.subject.fx,
              fy: event.subject.fy,
            };
            dragStartTime = Date.now();
            dragging = true;
          })
          .on("drag", function dragged(event) {
            const initPos = event.subject.__initialDragPos;
            event.subject.fx = initPos.x + (event.x - initPos.x) / currentTransform.k;
            event.subject.fy = initPos.y + (event.y - initPos.y) / currentTransform.k;
          })
          .on("end", function dragended(event) {
            if (!event.active) simulation.alphaTarget(0);
            // Obsidian-style: release node back into simulation (spring back)
            event.subject.fx = null;
            event.subject.fy = null;
            dragging = false;

            // Short drag = click → select node
            if (Date.now() - dragStartTime < 300) {
              const node = graphData.nodes.find((n) => n.id === event.subject.id);
              setSelectedNode(node);
            }
          })
      );

      /* ── Zoom handling ── */
      zoomBehaviorRef.current = d3.zoom()
        .extent([[0, 0], [width, h]])
        .scaleExtent([0.1, 8])
        .on("zoom", ({ transform }) => {
          currentTransform = transform;
          stage.scale.set(transform.k, transform.k);
          stage.position.set(width / 2 + transform.x, h / 2 + transform.y);

          let scaleOpacity = Math.max((transform.k - 0.3) / 1.2, 0);
          scaleOpacity = Math.min(scaleOpacity, 0.9);
          const activeNodes = nodeRenderData.filter((n) => n.active).map((n) => n.label);

          for (const label of labelsContainer.children) {
            if (!activeNodes.includes(label)) {
              label.alpha = scaleOpacity;
            }
          }
        });

      d3.select(app.canvas)
        .call(zoomBehaviorRef.current)
        .on("click", (event) => {
        if (event.defaultPrevented) return;
        const pointer = d3.pointer(event, app.canvas);
        const x = (pointer[0] - width / 2 - currentTransform.x) / currentTransform.k;
        const y = (pointer[1] - h / 2 - currentTransform.y) / currentTransform.k;
        const node = simulation.find(x, y, 20 / currentTransform.k);
        if (!node) {
          setSelectedNode(null);
        }
      });

      // Initial centering
      stage.position.set(width / 2, h / 2);

      /* ── Animation loop ── */
      function animate(time) {
        if (stopAnimation) return;

        for (const n of nodeRenderData) {
          const { x, y } = n.simulationData;
          if (x === undefined || y === undefined) continue;
          n.gfx.position.set(x, y);
          if (n.glow) n.glow.position.set(x, y);
          if (n.label) n.label.position.set(x, y);
        }

        for (const l of linkRenderData) {
          const ld = l.simulationData;
          l.gfx.clear();
          if (ld.source.x !== undefined && ld.target.x !== undefined) {
            l.gfx.moveTo(ld.source.x, ld.source.y);
            l.gfx
              .lineTo(ld.target.x, ld.target.y)
              .stroke({ alpha: l.alpha, width: 2, color: l.color });
          }
        }

        tweens.forEach((t) => t.update(time));
        app.renderer.render(stage);
        requestAnimationFrame(animate);
      }

      requestAnimationFrame(animate);
    };

    initPixi();

    return () => {
      stopAnimation = true;
      simulation.stop();
      simulationRef.current = null;
      if (app.canvas && container.contains(app.canvas)) {
        app.destroy(true, { children: true });
      }
    };
  }, [nodes, links, dimensions, loading, colorNodes]);

  /* ── Reset forces to defaults ── */
  const resetForces = useCallback(() => {
    setCenterForce(DEFAULTS.centerForce);
    setRepelForce(DEFAULTS.repelForce);
    setLinkForce(DEFAULTS.linkForce);
    setLinkDistance(DEFAULTS.linkDistance);
  }, []);

  /* ── Reset zoom and pan ── */
  const handleResetView = useCallback(() => {
    setSelectedNode(null);
    if (pixiInterfaceRef.current) pixiInterfaceRef.current.triggerHover(null, false);
    const canvas = containerRef.current?.querySelector('canvas');
    if (canvas && zoomBehaviorRef.current) {
      d3.select(canvas)
        .transition()
        .duration(750)
        .call(zoomBehaviorRef.current.transform, d3.zoomIdentity);
    }
  }, []);

  /* ── Loading state ── */
  if (loading) {
    return (
      <div className="network-loading" style={{ height, background: '#101010' }}>
        <div className="network-pulse-ring" style={{ borderColor: '#aaaab3' }} />
        <div className="network-pulse-ring delay-1" style={{ borderColor: '#aaaab3' }} />
        <div className="network-loading-text" style={{ color: '#ffffff' }}>
          <span className="material-icons" style={{ fontSize: 28, marginBottom: 10 }}>hub</span>
          <span>Mapping criminal network…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="network-2d-wrapper" style={{ height, background: '#101010', position: 'relative', overflow: 'hidden' }}>

      {/* ── Top Toolbar ── */}
      <div className="net3d-toolbar" style={{ background: 'transparent', borderColor: '#333' }}>
        <div className="net3d-stat" style={{ color: '#fff' }}>
          <span className="material-icons-outlined" style={{ color: '#aaaab3' }}>bubble_chart</span>
          <span>{nodes.length} nodes</span>
        </div>
        <div className="net3d-stat" style={{ color: '#fff' }}>
          <span className="material-icons-outlined" style={{ color: '#aaaab3' }}>timeline</span>
          <span>{links.length} connections</span>
        </div>
        <button
          className="net3d-btn"
          style={{ background: 'transparent', color: colorNodes ? '#4ea8de' : '#fff', border: '1px solid #333' }}
          onClick={() => setColorNodes(!colorNodes)}
        >
          <span className="material-icons" style={{ fontSize: 15 }}>palette</span>
          Color: {colorNodes ? 'On' : 'Off'}
        </button>
        <button
          className="net3d-btn"
          style={{ background: 'transparent', color: '#fff', border: '1px solid #333' }}
          onClick={handleResetView}
        >
          <span className="material-icons" style={{ fontSize: 15 }}>center_focus_strong</span>
          Reset
        </button>
      </div>

      {/* ── Canvas mount ── */}
      <div ref={containerRef} style={{ width: dimensions.width, height }} />

      {/* ── Legend (bottom-left) ── */}
      {colorNodes && (
        <div className="net-forces-legend">
          <div className="net-forces-legend-title">Node Types</div>
          {Object.entries(NODE_COLORS).map(([type, color]) => (
            <div key={type} className="net-forces-legend-row">
              <span className="net-forces-legend-dot" style={{ background: color }} />
              <span>{type.charAt(0).toUpperCase() + type.slice(1)}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── Forces Panel (bottom-left, below legend) ── */}
      <div className={`net-forces-panel ${forcesOpen ? 'open' : ''}`}>
        <button className="net-forces-toggle" onClick={() => setForcesOpen(!forcesOpen)}>
          <span className="material-icons" style={{ fontSize: 16 }}>tune</span>
          <span>Forces</span>
          <span className="material-icons net-forces-chevron" style={{ fontSize: 16 }}>
            {forcesOpen ? 'expand_more' : 'chevron_right'}
          </span>
        </button>

        {forcesOpen && (
          <div className="net-forces-body">
            <ForceSlider
              label="Center Force"
              icon="adjust"
              value={centerForce}
              min={0} max={1} step={0.01}
              onChange={setCenterForce}
              color="#4ea8de"
            />
            <ForceSlider
              label="Repel Force"
              icon="all_out"
              value={repelForce}
              min={0} max={3} step={0.05}
              onChange={setRepelForce}
              color="#ff4d6d"
            />
            <ForceSlider
              label="Link Force"
              icon="link"
              value={linkForce}
              min={0} max={1} step={0.01}
              onChange={setLinkForce}
              color="#ffd166"
            />
            <ForceSlider
              label="Link Distance"
              icon="straighten"
              value={linkDistance}
              min={20} max={300} step={1}
              onChange={setLinkDistance}
              color="#8b8b99"
            />
            <button className="net-forces-reset" onClick={resetForces}>
              <span className="material-icons" style={{ fontSize: 13 }}>restart_alt</span>
              Reset Defaults
            </button>
          </div>
        )}
      </div>

      {/* ── Hover Tooltip (bottom-right) ── */}
      {hoveredNode && !selectedNode && (
        <div className="net3d-tooltip">
          <span className="net3d-tooltip-dot" style={{ background: getNodeColor(hoveredNode) }} />
          <span>{hoveredNode.label}</span>
          <span className="net3d-tooltip-type">{hoveredNode.type}</span>
        </div>
      )}

      {/* ── Node Detail Panel (right) ── */}
      {selectedNode && (
        <div className="net3d-detail-panel" style={{ background: '#161616', border: '1px solid #333', color: '#fff' }}>
          <div className="net3d-detail-header" style={{ borderBottom: '1px solid #333' }}>
            <div className="net3d-detail-badge" style={{ background: '#aaaab322', color: '#aaaab3', borderColor: '#aaaab355' }}>
              <span className="material-icons" style={{ fontSize: 13 }}>
                {NODE_ICONS[selectedNode.type] || 'description'}
              </span>
              {selectedNode.type.charAt(0).toUpperCase() + selectedNode.type.slice(1)}
            </div>
            <button className="net3d-close-btn" style={{ color: '#aaaab3' }} onClick={() => setSelectedNode(null)}>
              <span className="material-icons" style={{ fontSize: 16 }}>close</span>
            </button>
          </div>

          <div className="net3d-detail-name" style={{ color: '#fff' }}>{selectedNode.label}</div>

          {selectedNode.type === 'offender' && (
            <div className="net3d-detail-body">
              <DetailRow icon="location_city" label="District" value={selectedNode.district || '—'} />
              <DetailRow icon="fingerprint" label="Modus Operandi" value={selectedNode.modus || '—'} />
            </div>
          )}

          {selectedNode.type === 'victim' && (
            <div className="net3d-detail-body">
              <DetailRow icon="person" label="Age" value={selectedNode.age || '—'} />
              <DetailRow icon="wc" label="Gender" value={selectedNode.gender || '—'} />
              <DetailRow icon="work" label="Occupation" value={selectedNode.occupation || '—'} />
            </div>
          )}

          {selectedNode.type === 'incident' && (
            <div className="net3d-detail-body">
              <DetailRow icon="tag" label="FIR Number" value={selectedNode.label} />
              <DetailRow icon="category" label="Crime Type" value={selectedNode.crimeType || '—'} />
            </div>
          )}

          {selectedNode.type === 'station' && (
            <div className="net3d-detail-body">
              <DetailRow icon="local_police" label="Station Name" value={selectedNode.label} />
            </div>
          )}

          {selectedNode.type === 'district' && (
            <div className="net3d-detail-body">
              <DetailRow icon="map" label="District Name" value={selectedNode.label} />
            </div>
          )}
        </div>
      )}
    </div>
  );
});

/* ── Force Slider Sub-component ── */
function ForceSlider({ label, icon, value, min, max, step, onChange, color }) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="net-force-slider-row">
      <div className="net-force-slider-header">
        <span className="material-icons-outlined net-force-slider-icon" style={{ color }}>{icon}</span>
        <span className="net-force-slider-label">{label}</span>
        <span className="net-force-slider-value">{Number.isInteger(value) ? value : value.toFixed(2)}</span>
      </div>
      <input
        type="range"
        className="net-force-range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        style={{
          '--slider-color': color,
          '--slider-pct': `${pct}%`,
        }}
      />
    </div>
  );
}

/* ── Detail Row Sub-component ── */
function DetailRow({ icon, label, value }) {
  return (
    <div className="net3d-detail-row">
      <span className="material-icons-outlined net3d-detail-icon" style={{ color: '#aaaab3' }}>{icon}</span>
      <div>
        <div className="net3d-detail-label" style={{ color: '#aaaab3' }}>{label}</div>
        <div className="net3d-detail-value" style={{ color: '#fff' }}>{value}</div>
      </div>
    </div>
  );
}

export default NetworkGraph;
